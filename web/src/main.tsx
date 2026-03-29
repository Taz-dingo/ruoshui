import { createRef } from 'react';
import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import './style.css';
import { App } from './app/App';
import { createViewerConfig } from './app/viewer-config';
import type { ViewerContent } from './content/types';

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('Missing #app root');
}

const data = await fetch('/content/mvp.json').then(async (response): Promise<ViewerContent> => {
  if (!response.ok) {
    throw new Error(`Failed to load content: ${response.status}`);
  }

  return response.json() as Promise<ViewerContent>;
});

const sceneContainerRef = createRef<HTMLDivElement>();
const viewerConfig = createViewerConfig({
  data,
  runtimeWindow: window,
  showPerfHud: import.meta.env.DEV
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
