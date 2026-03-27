import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(__filename);
const webDir = path.resolve(scriptsDir, '..');
const repoRoot = path.resolve(webDir, '..');
const contentPath = path.join(webDir, 'public', 'content', 'mvp.json');
const defaultHost = '127.0.0.1';
const defaultPort = 4173;
const defaultRepeatCount = 3;

async function main() {
  const content = JSON.parse(await fs.readFile(contentPath, 'utf8'));
  const args = parseArgs(process.argv.slice(2), content);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = args.outputDir ?? path.join(repoRoot, 'outputs', 'iteration-004-web-benchmarks', timestamp);

  await fs.mkdir(outputDir, { recursive: true });

  if (!args.skipBuild) {
    await runCommand('pnpm', ['build'], { cwd: webDir });
  }

  const server = startPreviewServer({
    cwd: webDir,
    host: args.host,
    port: args.port
  });

  try {
    await waitForServer(`http://${args.host}:${args.port}`);
    const summary = [];

    for (const routeId of args.routes) {
      for (const variantId of args.variants) {
        const route = content.benchmarkRoutes.find((item) => item.id === routeId);
        const variant = content.variants.find((item) => item.id === variantId);
        if (!route || !variant) {
          continue;
        }

        const result = await runSingleBenchmark({
          baseUrl: `http://${args.host}:${args.port}`,
          routeId,
          variantId,
          repeatCount: args.repeats,
          headed: args.headed,
          browserPath: args.browserPath
        });

        const fileName = `${slugify(routeId)}-${slugify(variantId)}-${result.summary.suiteId}.json`;
        const filePath = path.join(outputDir, fileName);
        await fs.writeFile(filePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');

        const aggregate = summarizeExport(result);
        summary.push({
          routeId,
          routeName: route.name,
          variantId,
          variantName: variant.name,
          fileName,
          ...aggregate
        });

        console.log(`saved ${fileName}`);
      }
    }

    const summaryPath = path.join(outputDir, 'summary.json');
    const reportPath = path.join(outputDir, 'summary.md');
    await fs.writeFile(summaryPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary }, null, 2)}\n`, 'utf8');
    await fs.writeFile(reportPath, renderMarkdownSummary(summary), 'utf8');

    console.log(`\nDone. Results saved to ${outputDir}`);
    console.log(`Summary: ${summaryPath}`);
    console.log(`Report:  ${reportPath}`);
  } finally {
    await stopProcess(server);
  }
}

function parseArgs(argv, content) {
  const options = {
    host: defaultHost,
    port: defaultPort,
    repeats: defaultRepeatCount,
    headed: true,
    skipBuild: false,
    browserPath: process.env.RUOSHUI_BENCHMARK_BROWSER ?? null,
    variants: content.variants.map((variant) => variant.id),
    routes: content.benchmarkRoutes.map((route) => route.id),
    outputDir: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--headed') {
      options.headed = true;
      continue;
    }
    if (arg === '--headless') {
      options.headed = false;
      continue;
    }
    if (arg === '--skip-build') {
      options.skipBuild = true;
      continue;
    }
    if (arg === '--browser-path') {
      options.browserPath = argv[index + 1] || null;
      index += 1;
      continue;
    }
    if (arg === '--variants') {
      options.variants = splitCsv(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--routes') {
      options.routes = splitCsv(argv[index + 1]);
      index += 1;
      continue;
    }
    if (arg === '--repeats') {
      options.repeats = Math.max(1, Number(argv[index + 1]) || defaultRepeatCount);
      index += 1;
      continue;
    }
    if (arg === '--host') {
      options.host = argv[index + 1] || defaultHost;
      index += 1;
      continue;
    }
    if (arg === '--port') {
      options.port = Number(argv[index + 1]) || defaultPort;
      index += 1;
      continue;
    }
    if (arg === '--output-dir') {
      options.outputDir = path.resolve(repoRoot, argv[index + 1]);
      index += 1;
      continue;
    }
  }

  return options;
}

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function startPreviewServer({ cwd, host, port }) {
  const child = spawn('pnpm', ['exec', 'vite', 'preview', '--host', host, '--port', String(port), '--strictPort'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[preview] ${chunk}`));
  return child;
}

async function waitForServer(baseUrl) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function runSingleBenchmark({ baseUrl, routeId, variantId, repeatCount, headed, browserPath }) {
  const browser = await launchBenchmarkBrowser({ headed, browserPath });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.on('console', (message) => {
      const type = message.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[page:${type}] ${message.text()}`);
      }
    });

    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.bringToFront();
    await page.waitForTimeout(250);
    const pageState = await page.evaluate(() => ({
      hidden: document.hidden,
      focus: document.hasFocus()
    }));
    console.log(`page state: hidden=${pageState.hidden} focus=${pageState.focus}`);
    await page.waitForFunction(() => Boolean(window.__ruoshuiPerf?.runVariantRoute));
    await page.evaluate(({ routeId: nextRouteId, variantId: nextVariantId, repeatCount: nextRepeatCount }) => {
      window.__benchResult = null;
      window.__benchError = null;
      window.__ruoshuiPerf.runVariantRoute({
        routeId: nextRouteId,
        variantId: nextVariantId,
        repeatCount: nextRepeatCount,
        clearHistory: true,
        suitePrefix: 'auto'
      }).then((result) => {
        window.__benchResult = result;
      }).catch((error) => {
        window.__benchError = error instanceof Error ? error.message : String(error);
      });
    }, { routeId, variantId, repeatCount });

    const result = await waitForBenchmarkResult(page);

    if (!result) {
      throw new Error(`No benchmark result returned for ${routeId} / ${variantId}`);
    }

    return result;
  } finally {
    await browser.close();
  }
}

async function waitForBenchmarkResult(page) {
  const timeoutMs = 120000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await page.evaluate(() => ({
      result: window.__benchResult ?? null,
      error: window.__benchError ?? null,
      statusTitle: document.querySelector('#status-title')?.textContent ?? '',
      statusDetail: document.querySelector('#status-detail')?.textContent ?? '',
      routeSummary: document.querySelector('#route-summary')?.textContent ?? '',
      historyCount: Array.isArray(window.__ruoshuiPerf?.history?.()) ? window.__ruoshuiPerf.history().length : null,
      latestSuite: window.__ruoshuiPerf?.latest?.()?.summary?.suiteId ?? null
    }));

    if (snapshot.error) {
      throw new Error(snapshot.error);
    }

    if (snapshot.result) {
      return snapshot.result;
    }

    console.log(
      `waiting benchmark… ${snapshot.statusTitle} / ${snapshot.statusDetail} / route=${snapshot.routeSummary} / history=${snapshot.historyCount} / latest=${snapshot.latestSuite}`
    );
    await page.waitForTimeout(1000);
  }

  throw new Error('Timed out waiting for benchmark result.');
}

async function launchBenchmarkBrowser({ headed, browserPath }) {
  const executablePath = browserPath || await resolveSystemChromePath();
  const launchOptions = {
    headless: !headed,
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  };

  if (executablePath) {
    launchOptions.executablePath = executablePath;
    console.log(`Using browser: ${executablePath}`);
  } else {
    console.log('System Chrome not found, falling back to Playwright Chromium.');
  }

  try {
    return await chromium.launch(launchOptions);
  } catch (error) {
    if (executablePath) {
      console.warn(`Failed to launch system Chrome at ${executablePath}, falling back to Playwright Chromium.`);
      return chromium.launch({ headless: !headed });
    }

    throw error;
  }
}

async function resolveSystemChromePath() {
  const homeDir = process.env.HOME ?? '';
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    path.join(homeDir, 'Applications', 'Google Chrome.app', 'Contents', 'MacOS', 'Google Chrome'),
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    path.join(homeDir, 'Applications', 'Google Chrome Canary.app', 'Contents', 'MacOS', 'Google Chrome Canary')
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }

  return null;
}

function summarizeExport(result) {
  const records = result.records ?? [];
  const avg = average(records.map((record) => record.analysis?.frameStats?.avgMs));
  const p95 = average(records.map((record) => record.analysis?.frameStats?.p95Ms));
  const peak = average(records.map((record) => record.analysis?.frameStats?.peakMs));
  const stalls = average(records.map((record) => record.analysis?.stallCount));
  const stallMs = average(records.map((record) => record.analysis?.totalStallMs));

  return {
    repeatCount: records.length,
    avgMs: round(avg),
    p95Ms: round(p95),
    peakMs: round(peak),
    stallCount: round(stalls),
    stallMs: round(stallMs)
  };
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function round(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function renderMarkdownSummary(summary) {
  const lines = [
    '# Benchmark Summary',
    '',
    '| Route | Variant | Repeats | Avg (ms) | P95 (ms) | Peak (ms) | Stalls | Stall ms | File |',
    '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |'
  ];

  for (const item of summary) {
    lines.push(`| ${item.routeName} | ${item.variantName} | ${item.repeatCount} | ${item.avgMs ?? '—'} | ${item.p95Ms ?? '—'} | ${item.peakMs ?? '—'} | ${item.stallCount ?? '—'} | ${item.stallMs ?? '—'} | ${item.fileName} |`);
  }

  lines.push('');
  return lines.join('\n');
}

function slugify(value) {
  return String(value)
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function runCommand(command, args, options) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: 'inherit'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
    });
    child.on('error', reject);
  });
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      if (child.exitCode === null) {
        child.kill('SIGKILL');
      }
    }, 1500);
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
