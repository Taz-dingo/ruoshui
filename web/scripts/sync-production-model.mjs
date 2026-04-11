import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webDir, '..');
const sourceFile = path.join(repoRoot, 'assets', 'hhuc.sog');
const targetFile = path.join(webDir, 'public', 'models', 'hhuc-original.sog');

function sameFileMetadata(leftFile, rightFile) {
  if (!fs.existsSync(leftFile) || !fs.existsSync(rightFile)) {
    return false;
  }

  const leftStat = fs.statSync(leftFile);
  const rightStat = fs.statSync(rightFile);

  return leftStat.size === rightStat.size && leftStat.mtimeMs === rightStat.mtimeMs;
}

if (fs.existsSync(sourceFile)) {
  fs.mkdirSync(path.dirname(targetFile), { recursive: true });

  if (!sameFileMetadata(sourceFile, targetFile)) {
    fs.copyFileSync(sourceFile, targetFile);
    fs.utimesSync(targetFile, new Date(), fs.statSync(sourceFile).mtime);
    console.log(`Synced production model: ${targetFile}`);
  } else {
    console.log(`Production model already up to date: ${targetFile}`);
  }
} else if (fs.existsSync(targetFile)) {
  console.log(`Using existing production model copy: ${targetFile}`);
} else {
  console.error(
    `Missing production model. Expected ${sourceFile} during local sync or ${targetFile} in deployable sources.`
  );
  process.exit(1);
}
