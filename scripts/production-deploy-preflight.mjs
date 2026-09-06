#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const forumApiDir = join(repoRoot, 'services', 'forum-api');
const migrationsDir = join(forumApiDir, 'migrations');
const databaseBinding = 'DB';

function printHelp() {
  console.log(`Ruoshui production deploy preflight

Usage:
  pnpm preflight:forum:prod

Checks that the remote D1 migration ledger exactly covers every migration file in
services/forum-api/migrations before a production Worker deploy is allowed.

This command is read-only. It never applies a migration and never deploys a Worker.
If migrations are pending, review them and run:
  pnpm --filter @ruoshui/forum-api db:migrate:remote
Then rerun this preflight before deploying.
`);
}

function localMigrationNames() {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d+.*\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function runRemoteMigrationLedgerQuery() {
  const sql = 'SELECT name FROM d1_migrations ORDER BY id;';
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'd1',
      'execute',
      databaseBinding,
      '--remote',
      '--command',
      sql,
      '--json',
    ],
    {
      cwd: forumApiDir,
      encoding: 'utf8',
      env: process.env,
      shell: false,
    },
  );

  if (result.error) {
    throw new Error(`Could not start Wrangler: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      'Wrangler could not read the remote D1 migration ledger. ' +
        'Check Cloudflare authentication and run the remote migration list command for details.',
    );
  }

  const stdout = result.stdout.trim();
  if (!stdout) {
    throw new Error('Wrangler returned an empty response for the remote migration ledger.');
  }

  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error('Wrangler --json returned an unexpected non-JSON response.');
  }
}

function collectResultRows(value, rows = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectResultRows(item, rows);
    return rows;
  }
  if (!value || typeof value !== 'object') return rows;

  if (Array.isArray(value.results)) {
    for (const row of value.results) {
      if (row && typeof row === 'object') rows.push(row);
    }
  }
  return rows;
}

function remoteMigrationNames(payload) {
  const names = collectResultRows(payload)
    .map((row) => row.name)
    .filter((name) => typeof name === 'string');
  return [...new Set(names)].sort((left, right) => left.localeCompare(right));
}

function printNames(title, names) {
  console.error(title);
  for (const name of names) console.error(`  - ${name}`);
}

function run() {
  if (process.argv.slice(2).some((arg) => arg === '--help' || arg === '-h')) {
    printHelp();
    return;
  }
  if (process.argv.length > 2) {
    throw new Error(`Unknown argument: ${process.argv[2]}`);
  }

  const local = localMigrationNames();
  if (local.length === 0) {
    throw new Error('No local D1 migrations were found; refusing production deploy.');
  }

  console.log(`Checking ${local.length} repo migration(s) against remote D1 binding ${databaseBinding}...`);
  const remote = remoteMigrationNames(runRemoteMigrationLedgerQuery());
  if (remote.length === 0) {
    throw new Error(
      'Remote d1_migrations returned no applied migration names; refusing production deploy.',
    );
  }

  const localSet = new Set(local);
  const remoteSet = new Set(remote);
  const pending = local.filter((name) => !remoteSet.has(name));
  const unknownRemote = remote.filter((name) => !localSet.has(name));

  if (unknownRemote.length > 0) {
    printNames('BLOCKED — production D1 contains migration(s) missing from this checkout:', unknownRemote);
    throw new Error(
      'Remote migration history does not match the repository. Resolve the history mismatch before deploying.',
    );
  }

  if (pending.length > 0) {
    printNames('BLOCKED — repo migration(s) are not yet applied to production D1:', pending);
    console.error(
      '\nReview the pending SQL, then apply it explicitly with:\n' +
        '  pnpm --filter @ruoshui/forum-api db:migrate:remote\n' +
        'Then rerun:\n' +
        '  pnpm preflight:forum:prod',
    );
    process.exitCode = 2;
    return;
  }

  console.log(`PASS — remote D1 has all ${local.length} repo migration(s). Worker deploy may proceed.`);
}

try {
  run();
} catch (error) {
  console.error(`BLOCKED — ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
