import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const legacyHighlightPath = path.join(
  repoRoot,
  'web/src/components/viewer/HighlightLayer.tsx',
);

function readRepoFile(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function sourceSection(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

function collectSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [fullPath] : [];
  });
}

test('production ignores ui=dev and stored dev mode outside admin lab', () => {
  const mainSource = readRepoFile('web/src/main.tsx');
  const resolverSource = sourceSection(
    mainSource,
    'function resolveViewerUiFlags',
    '\n\nconst data =',
  );

  assert.match(
    resolverSource,
    /const queryMode = isDev\s*\?\s*parseViewerUiMode\(searchParams\.get\('ui'\)\)\s*:\s*null;/,
  );
  assert.match(
    resolverSource,
    /const storedMode = isDev\s*\?\s*readStoredViewerUiMode\(runtimeWindow\)\s*:\s*null;/,
  );
  assert.match(
    resolverSource,
    /const showDevUi =\s*isAdminLabMode \|\| \(isDev && mode !== 'prod'\);/,
  );
});

test('legacy HighlightLayer stays behind the admin lab guard', () => {
  const appSource = readRepoFile('web/src/app/App.tsx');
  const highlightMatches = appSource.match(/<HighlightLayer\b/g) ?? [];
  assert.equal(highlightMatches.length, 1);

  const highlightIndex = appSource.indexOf('<HighlightLayer');
  const guardIndex = appSource.lastIndexOf('{isAdminLabMode ? (', highlightIndex);
  const guardEnd = appSource.indexOf(') : null}', highlightIndex);
  const placeLayerIndex = appSource.indexOf('<PlaceMemoryLayer', highlightIndex);

  assert.ok(guardIndex >= 0 && guardIndex < highlightIndex);
  assert.ok(guardEnd > highlightIndex);
  assert.ok(placeLayerIndex > guardEnd);
});

test('legacy community affordances are confined to the admin-only HighlightLayer', () => {
  const forbiddenCopy = ['看点位图文', '收起图文', '完整社区'];
  const violations = [];

  for (const filePath of collectSourceFiles(path.join(repoRoot, 'web/src'))) {
    if (filePath === legacyHighlightPath) continue;
    const source = readFileSync(filePath, 'utf8');
    for (const copy of forbiddenCopy) {
      if (source.includes(copy)) {
        violations.push(`${path.relative(repoRoot, filePath)}: ${copy}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});

test('Place and single Story Anchor clicks stay content-first', () => {
  const source = readRepoFile('web/src/components/community/PlaceMemoryLayer.tsx');
  const openPlaceSource = sourceSection(
    source,
    '  async function openPlace',
    '\n  function closePlace',
  );
  const openAnchorSource = sourceSection(
    source,
    '  async function openAnchorStory',
    '\n  async function openStoryCluster',
  );

  for (const [label, section] of [
    ['openPlace', openPlaceSource],
    ['openAnchorStory', openAnchorSource],
  ]) {
    assert.doesNotMatch(
      section,
      /\b(?:focusPlace|requestFocusSpatialAnchor|requestFocusScenePin)\s*\(/,
      `${label} must not trigger camera focus implicitly`,
    );
  }
});
