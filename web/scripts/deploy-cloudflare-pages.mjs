import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webDir, '..');
const pagesProjectName = 'ruoshui-web';
const cloudflareAccountId = '926a58d9093ea18df7879ec6ed0e39a9';
const defaultOriginalModelPublicUrl =
  'https://pub-5fbf37dd49b94b859c13e343effd0430.r2.dev/models/hhuc-original.sog';
const wranglerConfigPath = path.join(webDir, 'wrangler.jsonc');
const wranglerAuthPath = path.join(
  os.homedir(),
  'Library',
  'Preferences',
  '.wrangler',
  'config',
  'default.toml'
);
const functionsBuildDir = path.join(os.tmpdir(), 'ruoshui-pages-functions');
const functionsConfigPath = path.join(functionsBuildDir, 'config.json');
const functionsRoutesPath = path.join(functionsBuildDir, '_routes.json');
const functionsEntryPath = path.join(functionsBuildDir, 'index.js');
const functionsSourceMapPath = path.join(functionsBuildDir, 'index.js.map');
const apiBaseUrl = 'https://api.cloudflare.com/client/v4';

function readOAuthToken(configPath) {
  const config = fs.readFileSync(configPath, 'utf8');
  const matched = config.match(/^oauth_token\s*=\s*"([^"]+)"/m);

  if (!matched) {
    throw new Error(`Missing oauth_token in ${configPath}`);
  }

  return matched[1];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function listFiles(rootDir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name !== '.DS_Store') {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

function makePagesAssetHash(content, relativePath) {
  const extension = path.extname(relativePath).slice(1);
  return createHash('sha256')
    .update(content.toString('base64') + extension)
    .digest('hex')
    .slice(0, 32);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok || payload.success === false) {
    throw new Error(
      `Cloudflare API request failed (${response.status}): ${text || response.statusText}`
    );
  }

  return payload;
}

async function createWorkerBundleBlob(wranglerConfig) {
  const bundleFormData = new FormData();
  const workerSource = fs.readFileSync(functionsEntryPath, 'utf8');
  const metadata = {
    main_module: path.basename(functionsEntryPath),
    compatibility_date: wranglerConfig.compatibility_date,
    compatibility_flags: wranglerConfig.compatibility_flags ?? []
  };

  bundleFormData.set('metadata', JSON.stringify(metadata));
  bundleFormData.set(
    path.basename(functionsEntryPath),
    new File([workerSource], path.basename(functionsEntryPath), {
      type: 'application/javascript+module'
    })
  );

  if (fs.existsSync(functionsSourceMapPath)) {
    bundleFormData.set(
      path.basename(functionsSourceMapPath),
      new File([fs.readFileSync(functionsSourceMapPath, 'utf8')], path.basename(functionsSourceMapPath), {
        type: 'application/source-map'
      })
    );
  }

  return new Response(bundleFormData).blob();
}

async function uploadPagesDeployment() {
  const oauthToken = readOAuthToken(wranglerAuthPath);
  const wranglerConfig = readJson(wranglerConfigPath);
  const originalModelPublicUrl =
    process.env.RUOSHUI_ORIGINAL_MODEL_PUBLIC_URL ?? defaultOriginalModelPublicUrl;
  const branch = process.env.RUOSHUI_PAGES_BRANCH;
  const distDir = path.join(webDir, 'dist');

  execFileSync(
    'pnpm',
    ['run', 'build:pages'],
    {
      cwd: webDir,
      env: {
        ...process.env,
        RUOSHUI_ORIGINAL_MODEL_PUBLIC_URL: originalModelPublicUrl
      },
      stdio: 'inherit'
    }
  );

  fs.rmSync(functionsBuildDir, { force: true, recursive: true });
  fs.mkdirSync(functionsBuildDir, { recursive: true });

  execFileSync(
    path.join(repoRoot, 'services', 'forum-api', 'node_modules', '.bin', 'wrangler'),
    [
      'pages',
      'functions',
      'build',
      'functions',
      '--project-directory',
      '.',
      '--build-output-directory',
      './dist',
      '--outdir',
      functionsBuildDir,
      '--output-config-path',
      functionsConfigPath,
      '--output-routes-path',
      functionsRoutesPath,
      '--sourcemap'
    ],
    {
      cwd: webDir,
      stdio: 'inherit'
    }
  );

  const files = listFiles(distDir).map((filePath) => {
    const relativePath = path.relative(distDir, filePath).split(path.sep).join('/');
    const content = fs.readFileSync(filePath);
    const contentType = filePath.endsWith('.json')
      ? 'application/json'
      : filePath.endsWith('.svg')
        ? 'image/svg+xml'
        : filePath.endsWith('.webp')
          ? 'image/webp'
          : filePath.endsWith('.jpg')
            ? 'image/jpeg'
            : filePath.endsWith('.css')
              ? 'text/css'
              : filePath.endsWith('.js')
                ? 'application/javascript'
                : filePath.endsWith('.png')
                  ? 'image/png'
                  : 'application/octet-stream';

    return {
      content,
      contentType,
      hash: makePagesAssetHash(content, relativePath),
      relativePath
    };
  });

  const uploadTokenPayload = await fetchJson(
    `${apiBaseUrl}/accounts/${cloudflareAccountId}/pages/projects/${pagesProjectName}/upload-token`,
    {
      headers: {
        Authorization: `Bearer ${oauthToken}`
      }
    }
  );
  const uploadJwt = uploadTokenPayload.result.jwt;
  const missingHashesPayload = await fetchJson(
    `${apiBaseUrl}/pages/assets/check-missing`,
    {
      body: JSON.stringify({
        hashes: files.map((file) => file.hash)
      }),
      headers: {
        Authorization: `Bearer ${uploadJwt}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    }
  );
  const missingHashes = new Set(missingHashesPayload.result);

  for (const file of files) {
    if (!missingHashes.has(file.hash)) {
      continue;
    }

    await fetchJson(`${apiBaseUrl}/pages/assets/upload`, {
      body: JSON.stringify([
        {
          base64: true,
          key: file.hash,
          metadata: {
            contentType: file.contentType
          },
          value: file.content.toString('base64')
        }
      ]),
      headers: {
        Authorization: `Bearer ${uploadJwt}`,
        'Content-Type': 'application/json'
      },
      method: 'POST'
    });
  }

  await fetchJson(`${apiBaseUrl}/pages/assets/upsert-hashes`, {
    body: JSON.stringify({
      hashes: files.map((file) => file.hash)
    }),
    headers: {
      Authorization: `Bearer ${uploadJwt}`,
      'Content-Type': 'application/json'
    },
    method: 'POST'
  });

  const deploymentFormData = new FormData();
  const manifest = Object.fromEntries(
    files.map((file) => [`/${file.relativePath}`, file.hash])
  );
  const workerBundleBlob = await createWorkerBundleBlob(wranglerConfig);

  deploymentFormData.set('manifest', JSON.stringify(manifest));
  deploymentFormData.set('commit_dirty', 'true');
  deploymentFormData.set(
    'wrangler_config_hash',
    createHash('sha256').update(fs.readFileSync(wranglerConfigPath)).digest('hex')
  );
  deploymentFormData.set('pages_build_output_dir', 'dist');
  deploymentFormData.set(
    'functions-filepath-routing-config.json',
    new File([fs.readFileSync(functionsConfigPath, 'utf8')], 'functions-filepath-routing-config.json', {
      type: 'application/json'
    })
  );
  deploymentFormData.set(
    '_worker.bundle',
    new File([workerBundleBlob], '_worker.bundle', {
      type: workerBundleBlob.type || 'application/octet-stream'
    })
  );
  deploymentFormData.set(
    '_routes.json',
    new File([fs.readFileSync(functionsRoutesPath, 'utf8')], '_routes.json', {
      type: 'application/json'
    })
  );

  if (branch) {
    deploymentFormData.set('branch', branch);
  }

  const deploymentPayload = await fetchJson(
    `${apiBaseUrl}/accounts/${cloudflareAccountId}/pages/projects/${pagesProjectName}/deployments`,
    {
      body: deploymentFormData,
      headers: {
        Authorization: `Bearer ${oauthToken}`
      },
      method: 'POST'
    }
  );

  console.log(JSON.stringify(deploymentPayload.result, null, 2));
}

uploadPagesDeployment().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
