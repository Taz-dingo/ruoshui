import { createRef } from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import './style.css';
import { App } from './app/App';
import { createViewerConfig } from './app/viewer-config';
import type { ViewerContent } from './content/types';

const viewerUiModeStorageKey = 'ruoshui-viewer-ui-mode-v1';
const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('Missing #app root');
}

type ViewerUiMode = 'auto' | 'dev' | 'prod';

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

const sceneContainerRef = createRef<HTMLDivElement>();
const viewerUiFlags = resolveViewerUiFlags(window, import.meta.env.DEV);
const viewerConfig = createViewerConfig({
  data,
  runtimeWindow: window,
  showExperimentalControls: viewerUiFlags.showExperimentalControls,
  showPerfHud: viewerUiFlags.showPerfHud
});

const root = ReactDOM.createRoot(appElement);
flushSync(() => {
  root.render(
    <App
      data={data}
      sceneContainerRef={sceneContainerRef}
      viewerConfig={viewerConfig}
    />
  );
});

await new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => resolve());
});

const sceneContainer = sceneContainerRef.current;

if (!sceneContainer) {
  throw new Error('Missing scene container');
}

const { initializeViewer } = await import('./app/viewer');

await initializeViewer({
  data,
  sceneContainer,
  viewerConfig
});
