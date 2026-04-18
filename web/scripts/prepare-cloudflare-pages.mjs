import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const distDir = path.join(webDir, 'dist');
const contentFile = path.join(distDir, 'content', 'mvp.json');
const bundledOriginalModelFile = path.join(distDir, 'models', 'hhuc-original.sog');
const indexFile = path.join(distDir, 'index.html');
const originalModelProxyUrl = '/edge-models/hhuc-original.sog';
const pagesSingleFileLimitBytes = 25 * 1024 * 1024;
const cloudflareMarker = '<!-- ruoshui-cloudflare-pages -->';

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function formatMiB(byteCount) {
  return `${(byteCount / 1024 / 1024).toFixed(2)} MiB`;
}

function walkFiles(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function rewriteOriginalVariantAssetUrl(filePath, nextAssetUrl) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const originalVariant = content.variants.find((variant) => variant.id === 'original');

  if (!originalVariant) {
    throw new Error('Missing "original" variant in content/mvp.json');
  }

  originalVariant.assetUrl = nextAssetUrl;
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

function ensureNoOversizedPagesFiles(rootDir) {
  const oversizedFiles = walkFiles(rootDir)
    .map((filePath) => ({
      filePath,
      size: fs.statSync(filePath).size
    }))
    .filter((entry) => entry.size > pagesSingleFileLimitBytes);

  if (oversizedFiles.length === 0) {
    return;
  }

  const detail = oversizedFiles
    .map((entry) => `${path.relative(rootDir, entry.filePath)} (${formatMiB(entry.size)})`)
    .join(', ');

  throw new Error(
    `Cloudflare Pages only supports files up to ${formatMiB(pagesSingleFileLimitBytes)}. Oversized files: ${detail}`
  );
}

assertFileExists(distDir);
assertFileExists(contentFile);
assertFileExists(indexFile);

rewriteOriginalVariantAssetUrl(contentFile, originalModelProxyUrl);

const indexHtml = fs.readFileSync(indexFile, 'utf8');
if (!indexHtml.includes(cloudflareMarker)) {
  fs.writeFileSync(indexFile, `${indexHtml.trimEnd()}\n${cloudflareMarker}\n`);
}

if (fs.existsSync(bundledOriginalModelFile)) {
  fs.rmSync(bundledOriginalModelFile);
  console.log(`Removed bundled original model from Pages dist: ${bundledOriginalModelFile}`);
}

ensureNoOversizedPagesFiles(distDir);
console.log(`Prepared Cloudflare Pages dist with proxied original model: ${originalModelProxyUrl}`);
