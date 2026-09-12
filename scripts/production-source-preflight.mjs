import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDir, '..');

function runGit(args, repoRoot, stdio = 'pipe') {
  return execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio,
  }).trim();
}

function readHeadMetadata(repoRoot) {
  return {
    branch: runGit(['branch', '--show-current'], repoRoot),
    commit: runGit(['rev-parse', 'HEAD'], repoRoot),
    message: runGit(['log', '-1', '--pretty=%s'], repoRoot),
  };
}

function assertCleanWorkingTree(repoRoot) {
  const dirty = runGit(['status', '--porcelain'], repoRoot);
  if (dirty) {
    throw new Error(
      'Production deploy blocked: working tree is dirty. Commit or discard local changes before deploying.',
    );
  }
}

function assertRemoteHead({ branch, commit, repoRoot }) {
  execFileSync('git', ['fetch', '--quiet', 'origin', branch], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  const remoteCommit = runGit(['rev-parse', `origin/${branch}`], repoRoot);
  if (commit !== remoteCommit) {
    throw new Error(
      `Production deploy blocked: local ${branch} (${commit.slice(0, 12)}) is not origin/${branch} (${remoteCommit.slice(0, 12)}). Pull the latest branch before deploying.`,
    );
  }
}

function assertDeploySource({
  repoRoot = defaultRepoRoot,
  expectedBranch = 'main',
  requireRemoteMatch = true,
} = {}) {
  assertCleanWorkingTree(repoRoot);
  const metadata = readHeadMetadata(repoRoot);

  if (metadata.branch !== expectedBranch) {
    throw new Error(
      `Production deploy blocked: expected branch ${expectedBranch}, found ${metadata.branch || 'detached HEAD'}.`,
    );
  }

  if (requireRemoteMatch) {
    assertRemoteHead({ ...metadata, repoRoot });
  }

  return metadata;
}

function printHelp() {
  console.log(`Usage: node scripts/production-source-preflight.mjs [--branch <name>] [--no-fetch]\n\nChecks that a deployment source is clean, on the expected branch, and (by default) exactly matches origin/<branch>.`);
}

function parseArgs(argv) {
  let expectedBranch = 'main';
  let requireRemoteMatch = true;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg === '--no-fetch') {
      requireRemoteMatch = false;
      continue;
    }
    if (arg === '--branch') {
      const branch = argv[index + 1];
      if (!branch) throw new Error('Missing value for --branch');
      expectedBranch = branch;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { expectedBranch, requireRemoteMatch };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
    } else {
      const metadata = assertDeploySource(args);
      console.log(
        `Production source OK: ${metadata.branch}@${metadata.commit.slice(0, 12)} (${metadata.message})`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

export { assertDeploySource };
