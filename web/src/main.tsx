import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import './globals.css';
import { App } from './app/App';
import { createViewerConfig } from './app/viewer-config';
import type { ViewerContent } from './content/types';
import { appShellClassNames } from './styles/system';

const viewerUiModeStorageKey = 'ruoshui-viewer-ui-mode-v1';
const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('Missing #app root');
}

type ViewerUiMode = 'auto' | 'dev' | 'prod';

function ensureBleedLayout(runtimeDocument: Document, rootElement: HTMLElement) {
  runtimeDocument.body.classList.add(...appShellClassNames.bodyBleed.split(' '));
  rootElement.className = appShellClassNames.appRoot;
}

function installViewportSizeSync(runtimeWindow: Window) {
  const rootElement = runtimeWindow.document.documentElement;

  const syncViewportSize = () => {
    const visualViewport = runtimeWindow.visualViewport;
    const viewportWidth = Math.round(visualViewport?.width ?? runtimeWindow.innerWidth ?? 0);
    const viewportHeight = Math.round(visualViewport?.height ?? runtimeWindow.innerHeight ?? 0);

    rootElement.style.setProperty('--app-width', `${Math.max(1, viewportWidth)}px`);
    rootElement.style.setProperty('--app-height', `${Math.max(1, viewportHeight)}px`);
  };

  syncViewportSize();

  const visualViewport = runtimeWindow.visualViewport;
  runtimeWindow.addEventListener('resize', syncViewportSize);
  runtimeWindow.addEventListener('orientationchange', syncViewportSize);
  visualViewport?.addEventListener('resize', syncViewportSize);
  visualViewport?.addEventListener('scroll', syncViewportSize);
}

function shouldEnableViewportDebug(runtimeWindow: Window) {
  return new URL(runtimeWindow.location.href).searchParams.get('debugViewport') === '1';
}

function formatRect(rect: DOMRect | null) {
  if (!rect) {
    return 'n/a';
  }

  return `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
}

function installViewportDebugPanel(runtimeWindow: Window) {
  const runtimeDocument = runtimeWindow.document;
  const panelElement = runtimeDocument.createElement('pre');
  const docElement = runtimeDocument.documentElement;

  panelElement.setAttribute('data-debug-viewport', 'true');
  panelElement.style.position = 'fixed';
  panelElement.style.left = '8px';
  panelElement.style.right = '8px';
  panelElement.style.top = 'calc(env(safe-area-inset-top, 0px) + 56px)';
  panelElement.style.zIndex = '9999';
  panelElement.style.margin = '0';
  panelElement.style.padding = '10px 12px';
  panelElement.style.borderRadius = '14px';
  panelElement.style.maxHeight = 'min(42vh, 280px)';
  panelElement.style.overflow = 'auto';
  panelElement.style.background = 'rgba(28, 18, 16, 0.9)';
  panelElement.style.border = '1px solid rgba(244, 236, 222, 0.18)';
  panelElement.style.color = '#f4ecde';
  panelElement.style.font = '12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace';
  panelElement.style.whiteSpace = 'pre-wrap';
  panelElement.style.pointerEvents = 'none';
  panelElement.style.backdropFilter = 'blur(10px)';

  const updatePanel = () => {
    const visualViewport = runtimeWindow.visualViewport;
    const sceneRootRect =
      runtimeDocument.getElementById('scene-root')?.getBoundingClientRect() ?? null;
    const sceneShellRect =
      runtimeDocument.getElementById('scene-shell')?.getBoundingClientRect() ?? null;
    const hudRootRect =
      runtimeDocument.getElementById('hud-root')?.getBoundingClientRect() ?? null;
    const sceneCanvasRect =
      runtimeDocument.querySelector<HTMLCanvasElement>('#scene-root canvas')?.getBoundingClientRect() ?? null;
    const appHeight = runtimeWindow
      .getComputedStyle(docElement)
      .getPropertyValue('--app-height')
      .trim();

    panelElement.textContent = [
      'viewport debug',
      `innerHeight: ${Math.round(runtimeWindow.innerHeight)}`,
      `visualViewport.height: ${Math.round(visualViewport?.height ?? 0)}`,
      `visualViewport.offsetTop: ${Math.round(visualViewport?.offsetTop ?? 0)}`,
      `doc.clientHeight: ${docElement.clientHeight}`,
      `doc.scrollHeight: ${docElement.scrollHeight}`,
      `body.scrollHeight: ${runtimeDocument.body.scrollHeight}`,
      `scrollY: ${Math.round(runtimeWindow.scrollY)}`,
      `--app-height: ${appHeight}`,
      `scene-shell: ${formatRect(sceneShellRect)}`,
      `scene-root: ${formatRect(sceneRootRect)}`,
      `scene-canvas: ${formatRect(sceneCanvasRect)}`,
      `hud-root: ${formatRect(hudRootRect)}`
    ].join('\n');
  };

  runtimeDocument.body.append(panelElement);
  updatePanel();

  runtimeWindow.addEventListener('resize', updatePanel);
  runtimeWindow.addEventListener('scroll', updatePanel, { passive: true });
  runtimeWindow.visualViewport?.addEventListener('resize', updatePanel);
  runtimeWindow.visualViewport?.addEventListener('scroll', updatePanel);

  runtimeWindow.setInterval(updatePanel, 500);
}

async function waitForStableSceneContainer(
  sceneContainer: HTMLDivElement,
  runtimeWindow: Window
) {
  let stableFrames = 0;
  let lastWidth = 0;
  let lastHeight = 0;
  const maxFrames = 24;

  for (let frame = 0; frame < maxFrames; frame += 1) {
    await new Promise<void>((resolve) => {
      runtimeWindow.requestAnimationFrame(() => resolve());
    });

    const rect = sceneContainer.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));

    if (width === lastWidth && height === lastHeight) {
      stableFrames += 1;
    } else {
      stableFrames = 0;
      lastWidth = width;
      lastHeight = height;
    }

    if (width > 1 && height > 1 && stableFrames >= 2) {
      return;
    }
  }
}

function parseViewerUiMode(value: string | null): ViewerUiMode | null {
  if (value === 'auto' || value === 'dev' || value === 'prod') {
    return value;
  }

  return null;
}

function readStoredViewerUiMode(runtimeWindow: Window) {
  try {
    return parseViewerUiMode(
      runtimeWindow.localStorage.getItem(viewerUiModeStorageKey)
    );
  } catch {
    return null;
  }
}

function writeStoredViewerUiMode(
  runtimeWindow: Window,
  mode: ViewerUiMode
) {
  try {
    runtimeWindow.localStorage.setItem(viewerUiModeStorageKey, mode);
  } catch {
    // ignore storage write failures
  }
}

function resolveViewerUiFlags(runtimeWindow: Window, isDev: boolean) {
  const searchParams = new URL(runtimeWindow.location.href).searchParams;
  const queryMode = parseViewerUiMode(searchParams.get('ui'));

  if (queryMode) {
    writeStoredViewerUiMode(runtimeWindow, queryMode);
  }

  const storedMode = readStoredViewerUiMode(runtimeWindow);
  const mode = queryMode ?? storedMode ?? 'auto';
  const showDevUi = mode === 'dev' || (mode === 'auto' && isDev);

  return {
    showExperimentalControls: showDevUi,
    showPerfHud: showDevUi
  };
}

const data = await fetch('/content/mvp.json').then(async (response): Promise<ViewerContent> => {
  if (!response.ok) {
    throw new Error(`Failed to load content: ${response.status}`);
  }

  return response.json() as Promise<ViewerContent>;
});

const viewerUiFlags = resolveViewerUiFlags(window, import.meta.env.DEV);
const viewerConfig = createViewerConfig({
  data,
  runtimeWindow: window,
  showExperimentalControls: viewerUiFlags.showExperimentalControls,
  showPerfHud: viewerUiFlags.showPerfHud
});
installViewportSizeSync(window);
ensureBleedLayout(document, appElement);

const root = ReactDOM.createRoot(appElement);
flushSync(() => {
  root.render(
    <App
      data={data}
      viewerConfig={viewerConfig}
    />
  );
});

if (shouldEnableViewportDebug(window)) {
  installViewportDebugPanel(window);
}

const sceneContainer = document.getElementById('scene-root');

if (!(sceneContainer instanceof HTMLDivElement)) {
  throw new Error('Missing #scene-root container');
}

await new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => resolve());
});

await waitForStableSceneContainer(sceneContainer, window);

const { initializeViewer, presentViewerStartupFailure } = await import('./app/viewer');

try {
  await initializeViewer({
    data,
    sceneContainer,
    viewerConfig
  });
} catch (error) {
  presentViewerStartupFailure(error);
  console.error(error);
}
