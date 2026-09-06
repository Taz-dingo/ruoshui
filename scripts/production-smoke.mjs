#!/usr/bin/env node

import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';

const DEFAULT_BASE_URL = 'https://ruoshui-web.pages.dev';
const DEFAULT_WORKER_URL = 'https://ruoshui-forum-api.tazdingo-ruoshui.workers.dev';
const SESSION_COOKIE_NAME = 'ruoshui_session';

class SmokeError extends Error {
  constructor(step, message, status) {
    super(`${step}: ${message}`);
    this.name = 'SmokeError';
    this.step = step;
    this.status = status;
  }
}

function printHelp() {
  console.log(`Ruoshui production smoke runner

Usage:
  pnpm smoke:prod -- --email you@example.com
  pnpm smoke:prod -- --email you@example.com --base-url https://ruoshui-web.pages.dev

Options:
  --email <email>          Existing test/admin login email. If omitted, prompt interactively.
  --base-url <url>         Pages origin. Default: ${DEFAULT_BASE_URL}
  --worker-url <url>       Worker origin for advisory /health check. Default: ${DEFAULT_WORKER_URL}
  --skip-worker-health     Skip direct workers.dev health check.
  --yes                    Skip the side-effect confirmation prompt.
  --help                   Show this help.

The OTP is always requested interactively and is never accepted as a command-line argument.
This smoke creates a temporary private Story draft, patches and re-reads it, then soft-deletes it.
Use an existing test/admin email unless you intentionally want login to create a new User.
`);
}

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    email: undefined,
    help: false,
    skipWorkerHealth: false,
    workerUrl: DEFAULT_WORKER_URL,
    yes: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    if (token === '--yes' || token === '-y') {
      args.yes = true;
      continue;
    }
    if (token === '--skip-worker-health') {
      args.skipWorkerHealth = true;
      continue;
    }
    if (token === '--email' || token === '--base-url' || token === '--worker-url') {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`${token} requires a value.`);
      }
      index += 1;
      if (token === '--email') args.email = value;
      if (token === '--base-url') args.baseUrl = value;
      if (token === '--worker-url') args.workerUrl = value;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function normalizeOrigin(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error(`${label} must use http or https.`);
  }
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${local.length > visible.length ? '***' : ''}@${domain}`;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function errorMessage(payload, response) {
  if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
    return payload.error;
  }
  return `HTTP ${response.status} ${response.statusText}`.trim();
}

async function requestJson({
  baseUrl,
  body,
  cookie,
  expectedStatuses = [200],
  method = 'GET',
  path,
  step,
}) {
  const headers = new Headers({ accept: 'application/json' });
  if (cookie) headers.set('cookie', cookie);
  if (body !== undefined) headers.set('content-type', 'application/json');

  let response;
  try {
    response = await fetch(new URL(path, `${baseUrl}/`), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'follow',
    });
  } catch (error) {
    throw new SmokeError(
      step,
      error instanceof Error ? `network request failed: ${error.message}` : 'network request failed',
    );
  }

  const payload = await readJson(response);
  if (!expectedStatuses.includes(response.status)) {
    throw new SmokeError(step, errorMessage(payload, response), response.status);
  }
  return { payload, response };
}

function getSessionCookie(response) {
  const setCookies =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);

  for (const setCookie of setCookies) {
    const pair = setCookie.split(';', 1)[0]?.trim();
    if (pair?.startsWith(`${SESSION_COOKIE_NAME}=`) && pair.length > SESSION_COOKIE_NAME.length + 1) {
      return pair;
    }
  }
  return null;
}

function getUserId(payload) {
  return payload && typeof payload === 'object' && payload.user && typeof payload.user.id === 'string'
    ? payload.user.id
    : null;
}

function getDraft(payload) {
  return payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object'
    ? payload.data
    : null;
}

async function promptForEmail(readline, suppliedEmail) {
  const raw = suppliedEmail ?? (await readline.question('Login email: '));
  const email = raw.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('A valid email is required.');
  }
  return email;
}

async function promptForOtp(readline) {
  const code = (await readline.question('6-digit OTP from email: ')).trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error('OTP must be exactly 6 digits.');
  }
  return code;
}

async function confirmSideEffects(readline, email, baseUrl) {
  const answer = (
    await readline.question(
      `Run production smoke against ${baseUrl} as ${maskEmail(email)}? ` +
        'This sends a real OTP and creates then soft-deletes a private Story draft. [y/N] ',
    )
  )
    .trim()
    .toLowerCase();
  if (answer !== 'y' && answer !== 'yes') {
    throw new Error('Smoke cancelled.');
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const baseUrl = normalizeOrigin(args.baseUrl, '--base-url');
  const workerUrl = normalizeOrigin(args.workerUrl, '--worker-url');
  const readline = createInterface({ input, output });
  let cookie = null;
  let draftStoryId = null;
  let cleanedDraft = false;
  let loggedOut = false;

  async function cleanupBestEffort() {
    if (draftStoryId && cookie && !cleanedDraft) {
      try {
        await requestJson({
          baseUrl,
          cookie,
          expectedStatuses: [200],
          method: 'DELETE',
          path: `/api/stories/${encodeURIComponent(draftStoryId)}`,
          step: 'cleanup temporary Story',
        });
        cleanedDraft = true;
        console.log('  cleanup: temporary Story soft-deleted');
      } catch (error) {
        console.warn(`  cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (cookie && !loggedOut) {
      try {
        await requestJson({
          baseUrl,
          cookie,
          expectedStatuses: [200],
          method: 'POST',
          path: '/api/auth/logout',
          step: 'cleanup logout',
        });
        loggedOut = true;
        console.log('  cleanup: smoke session logged out');
      } catch (error) {
        console.warn(`  cleanup warning: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  try {
    const email = await promptForEmail(readline, args.email);
    if (!args.yes) {
      await confirmSideEffects(readline, email, baseUrl);
    }

    console.log(`\nRuoshui production smoke\n  Pages:  ${baseUrl}\n  Email:  ${maskEmail(email)}`);

    if (!args.skipWorkerHealth) {
      process.stdout.write(`\n[1/9] Worker /health (${workerUrl}) ... `);
      try {
        const health = await requestJson({
          baseUrl: workerUrl,
          expectedStatuses: [200],
          path: '/health',
          step: 'Worker health',
        });
        if (health.payload?.ok !== true || health.payload?.database !== 'connected') {
          throw new SmokeError('Worker health', 'unexpected health payload');
        }
        console.log('ok');
      } catch (error) {
        console.log('warning');
        console.warn(
          `  ${error instanceof Error ? error.message : String(error)}\n` +
            '  Direct workers.dev failure is advisory only; the Pages same-origin path continues.',
        );
      }
    } else {
      console.log('\n[1/9] Worker /health ... skipped');
    }

    process.stdout.write('[2/9] Pages → Worker proxy and anonymous /me ... ');
    const anonymousMe = await requestJson({
      baseUrl,
      expectedStatuses: [200],
      path: '/api/auth/me',
      step: 'anonymous /me',
    });
    if (anonymousMe.response.headers.get('x-ruoshui-edge') !== 'cloudflare-pages') {
      throw new SmokeError('anonymous /me', 'Pages proxy marker header is missing');
    }
    if (anonymousMe.payload?.user !== null) {
      throw new SmokeError('anonymous /me', 'unexpected authenticated user without a smoke cookie');
    }
    console.log('ok');

    process.stdout.write(`[3/9] Request OTP for ${maskEmail(email)} ... `);
    await requestJson({
      baseUrl,
      body: { email },
      expectedStatuses: [202],
      method: 'POST',
      path: '/api/auth/email/request-otp',
      step: 'request OTP',
    });
    console.log('sent');

    const otp = await promptForOtp(readline);
    process.stdout.write('[4/9] Verify OTP and capture HttpOnly session cookie ... ');
    const verified = await requestJson({
      baseUrl,
      body: { email, code: otp },
      expectedStatuses: [200],
      method: 'POST',
      path: '/api/auth/email/verify',
      step: 'verify OTP',
    });
    cookie = getSessionCookie(verified.response);
    const userId = getUserId(verified.payload);
    if (!cookie) {
      throw new SmokeError('verify OTP', `response did not set ${SESSION_COOKIE_NAME}`);
    }
    if (!userId) {
      throw new SmokeError('verify OTP', 'response did not contain a User id');
    }
    console.log('ok');

    process.stdout.write('[5/9] Restore /me in a separate authenticated request ... ');
    const restored = await requestJson({
      baseUrl,
      cookie,
      expectedStatuses: [200],
      path: '/api/auth/me',
      step: 'restore session',
    });
    if (getUserId(restored.payload) !== userId) {
      throw new SmokeError('restore session', 'session did not restore the same User');
    }
    console.log('ok');

    const stamp = new Date().toISOString();
    const firstBody = `[production-smoke] temporary private draft ${stamp}`;
    process.stdout.write('[6/9] Create private StoryDraft ... ');
    const created = await requestJson({
      baseUrl,
      body: { body: firstBody },
      cookie,
      expectedStatuses: [201],
      method: 'POST',
      path: '/api/stories/drafts',
      step: 'create StoryDraft',
    });
    const createdDraft = getDraft(created.payload);
    draftStoryId = createdDraft?.story?.id ?? null;
    if (!draftStoryId) {
      throw new SmokeError('create StoryDraft', 'response did not contain a Story id');
    }
    if (createdDraft?.revision?.body !== firstBody) {
      throw new SmokeError('create StoryDraft', 'draft body did not round-trip');
    }
    console.log('ok');

    const patchedBody = `[production-smoke] temporary private draft patched ${stamp}`;
    process.stdout.write('[7/9] Patch StoryDraft and re-read across requests ... ');
    const patched = await requestJson({
      baseUrl,
      body: { body: patchedBody },
      cookie,
      expectedStatuses: [200],
      method: 'PATCH',
      path: `/api/stories/drafts/${encodeURIComponent(draftStoryId)}`,
      step: 'patch StoryDraft',
    });
    if (getDraft(patched.payload)?.revision?.body !== patchedBody) {
      throw new SmokeError('patch StoryDraft', 'patched body did not round-trip');
    }
    const reread = await requestJson({
      baseUrl,
      cookie,
      expectedStatuses: [200],
      path: `/api/stories/drafts/${encodeURIComponent(draftStoryId)}`,
      step: 're-read StoryDraft',
    });
    if (
      getDraft(reread.payload)?.story?.id !== draftStoryId ||
      getDraft(reread.payload)?.revision?.body !== patchedBody
    ) {
      throw new SmokeError('re-read StoryDraft', 'separate request did not restore the patched draft');
    }
    console.log('ok');

    process.stdout.write('[8/9] Soft-delete temporary Story ... ');
    const deleted = await requestJson({
      baseUrl,
      cookie,
      expectedStatuses: [200],
      method: 'DELETE',
      path: `/api/stories/${encodeURIComponent(draftStoryId)}`,
      step: 'delete temporary Story',
    });
    if (deleted.payload?.data?.status !== 'deleted') {
      throw new SmokeError('delete temporary Story', 'Story did not enter deleted status');
    }
    cleanedDraft = true;
    console.log('ok');

    process.stdout.write('[9/9] Logout and prove the old cookie is revoked ... ');
    const oldCookie = cookie;
    await requestJson({
      baseUrl,
      cookie: oldCookie,
      expectedStatuses: [200],
      method: 'POST',
      path: '/api/auth/logout',
      step: 'logout',
    });
    loggedOut = true;
    const afterLogout = await requestJson({
      baseUrl,
      cookie: oldCookie,
      expectedStatuses: [200],
      path: '/api/auth/me',
      step: 'verify logout',
    });
    if (afterLogout.payload?.user !== null) {
      throw new SmokeError('verify logout', 'revoked session still authenticates');
    }
    console.log('ok');

    console.log(
      '\nPASS — Pages proxy, real OTP delivery, login, HttpOnly session persistence, StoryDraft create/patch/read, cleanup and logout all succeeded.',
    );
  } catch (error) {
    console.error(`\nFAIL — ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await cleanupBestEffort();
    readline.close();
  }
}

await run();
