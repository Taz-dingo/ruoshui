import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';
import './style.css';
import { App } from './App';
import { renderScaleMinPercent } from './config';
import { getInitialRenderScalePercent, getMaxSupportedPixelRatio } from './performance/render-scale';
import type { ViewerContent } from './types';

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

const showPerfHud = import.meta.env.DEV;
const maxRenderScalePercent = Math.round(getMaxSupportedPixelRatio(window) * 100);
const activeRenderScalePercent = getInitialRenderScalePercent(window, maxRenderScalePercent);

window.__ruoshuiInitialData = data;

const root = ReactDOM.createRoot(appElement);
flushSync(() => {
  root.render(
    <App
      data={data}
      showPerfHud={showPerfHud}
      maxRenderScalePercent={maxRenderScalePercent}
      activeRenderScalePercent={activeRenderScalePercent}
      renderScaleMinPercent={renderScaleMinPercent}
    />
  );
});

await new Promise<void>((resolve) => {
  window.requestAnimationFrame(() => resolve());
});

await import('./viewer');
