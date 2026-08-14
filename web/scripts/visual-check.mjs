#!/usr/bin/env node
/**
 * 若水广场 · 视觉验证最小闭环
 *
 * 用无头 Chrome 打开站点，等待 viewer 就绪后截图落盘，并收集控制台/网络
 * 错误与一张截图的基础像素统计（顶部 1/3 平均色与亮度占比），供 Agent 或
 * 人类快速判断「天空是否非全黑 / 场景是否可见」。
 *
 * 用法：
 *   node web/scripts/visual-check.mjs --url http://localhost:5173
 *   node web/scripts/visual-check.mjs --url https://ruoshui-web.pages.dev/ --backend webgl2
 *
 * 说明：
 *   - 输出目录默认 web/.visual-check/，内含 shot.png 与 report.json。
 *   - 由于 WebGL 画布在未开启 preserveDrawingBuffer 时无法直接读像素，
 *     脚本改用 CDP 整页截图，再回灌到页面里用 Image+canvas 统计像素。
 *   - 真实「天空是否黑」的判断建议配合视觉模型读 shot.png；本脚本只提供
 *     确定性信号（就绪状态、canvas 尺寸、报错、亮度统计）。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const ARGS = parseArgs(process.argv.slice(2));
const OUT_DIR = resolve(ARGS.out);
mkdirSync(OUT_DIR, { recursive: true });

const CHROME =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const chromeArgs = [
  '--headless=new',
  '--remote-debugging-port=0',
  '--remote-allow-origins=*',
  '--no-first-run',
  '--no-default-browser-check',
  `--window-size=${ARGS.window}`,
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  'about:blank'
];
if (ARGS.noSandbox) {
  chromeArgs.splice(2, 0, '--no-sandbox', '--disable-breakpad');
}
const profileDir = join(OUT_DIR, '.chrome-profile');
rmSync(profileDir, { recursive: true, force: true });
chromeArgs.splice(3, 0, `--user-data-dir=${profileDir}`);

const chrome = spawn(CHROME, chromeArgs, { stdio: ['ignore', 'ignore', 'pipe'] });

const logs = [];
const requests = [];
let devtoolsPort = null;

function readDevtoolsPort(chunk) {
  const text = String(chunk);
  const match = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
  if (match && devtoolsPort === null) {
    devtoolsPort = Number(match[1]);
  }
}
chrome.stderr.on('data', readDevtoolsPort);

let ws;
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 30000);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      }
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

function onMessage(raw) {
  const msg = JSON.parse(raw);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    if (msg.params.type === 'error' || msg.params.type === 'warning') {
      logs.push(
        `[console.${msg.params.type}] ${(msg.params.args ?? [])
          .map((a) => a.value ?? a.description ?? '')
          .join(' ')}`
      );
    }
  } else if (msg.method === 'Runtime.exceptionThrown') {
    logs.push(
      `[exception] ${msg.params.exceptionDetails?.exception?.description ??
        JSON.stringify(msg.params.exceptionDetails)}`
    );
  } else if (msg.method === 'Log.entryAdded') {
    logs.push(`[log.${msg.params.entry.level}] ${msg.params.entry.text}`);
  } else if (msg.method === 'Network.loadingFailed') {
    logs.push(`[net-fail] ${msg.params.errorText} ${msg.params.blockedReason ?? ''}`);
  } else if (msg.method === 'Network.requestWillBeSent') {
    const u = msg.params.request?.url ?? '';
    if (/edge-models|edge-media|\/api\/|\.sog|\.json|\.jpg|\.png|\.wasm|\.bin/.test(u)) {
      requests.push(`${msg.params.request?.method} ${u}`);
    }
  }
}

async function connect() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (devtoolsPort === null) {
      await sleep(200);
      continue;
    }
    try {
      const res = await fetch(
        `http://127.0.0.1:${devtoolsPort}/json/new?about:blank`,
        { method: 'PUT' }
      );
      if (res.ok) {
        return (await res.json()).webSocketDebuggerUrl;
      }
    } catch {}
    await sleep(300);
  }
  throw new Error('Chrome DevTools endpoint not reachable');
}

async function main() {
  const targetUrl = await connect();
  ws = new WebSocket(targetUrl);
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });
  ws.onmessage = (e) => onMessage(e.data);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: Number(ARGS.window.split('x')[0]),
    height: Number(ARGS.window.split('x')[1]),
    deviceScaleFactor: 1,
    mobile: false
  });

  if (ARGS.backend === 'webgl2') {
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `Object.defineProperty(navigator, 'gpu', { get: () => ({ requestAdapter: () => Promise.reject(new Error('visual-check: webgl2 forced')) }) });`
    });
    logs.push('[config] webgl2 forced (navigator.gpu stubbed)');
  }

  logs.push(`[navigate] ${ARGS.url}`);
  await send('Page.navigate', { url: ARGS.url });

  const startedAt = Date.now();
  let bridgeAt = null;
  let canvas = null;
  let bodyText = '';
  let scenePresentedAt = null;
  while (Date.now() - startedAt < ARGS.timeoutMs) {
    await sleep(3000);
    try {
      const probe = await send('Runtime.evaluate', {
        expression: `JSON.stringify({
          bridge: Boolean(window.__ruoshuiViewCapture),
          canvas: (() => { const c = document.querySelector('canvas'); return c ? { w: c.width, h: c.height } : null; })(),
          loadingVisible: (() => { const el = document.querySelector('[data-mode]'); return el ? el.className.includes('opacity-100') : false; })(),
          body: document.body.innerText.replace(/\\s+/g,' ').slice(0, 120)
        })`,
        returnByValue: true
      });
      const state = JSON.parse(probe.result.value ?? '{}');
      if (state.bridge && !bridgeAt) bridgeAt = Date.now() - startedAt;
      if (state.canvas) canvas = state.canvas;
      bodyText = state.body ?? '';
      if (state.bridge && !state.loadingVisible && !scenePresentedAt) {
        scenePresentedAt = Date.now() - startedAt;
      }
      logs.push(`[probe t=${Date.now() - startedAt}ms] ${JSON.stringify(state)}`);
      // 就绪后：若首帧已呈现则等 settleMs；否则等 ARGS.bridgeSettleMs 兜底。
      const sinceBridge = bridgeAt ? Date.now() - startedAt - bridgeAt : 0;
      if (scenePresentedAt && Date.now() - startedAt - scenePresentedAt > ARGS.settleMs) break;
      if (bridgeAt && !scenePresentedAt && sinceBridge > ARGS.bridgeSettleMs) break;
    } catch (e) {
      logs.push(`[probe-error] ${e.message}`);
    }
  }

  // 遮罩是 84% 黑，会压暗天空；截图前隐藏加载遮罩以观察真实天空。
  if (ARGS.hideLoading) {
    try {
      await send('Runtime.evaluate', {
        expression: `(() => { const el = document.querySelector('[data-mode]'); if (el) { el.style.display = 'none'; } return Boolean(el); })()`,
        returnByValue: true
      });
      logs.push('[config] loading overlay hidden before capture');
    } catch (e) {
      logs.push(`[hide-loading-error] ${e.message}`);
    }
  }

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = join(OUT_DIR, 'shot.png');
  writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));

  const pixelStats = await analyzePixels(shot.data);
  logs.push(`[pixels] ${JSON.stringify(pixelStats)}`);

  const domProbe = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      bridge: Boolean(window.__ruoshuiViewCapture),
      webgl2: (() => { try { const c = document.createElement('canvas'); return Boolean(c.getContext('webgl2')); } catch { return false; } })(),
      webgpu: Boolean(navigator.gpu),
      ua: navigator.userAgent
    })`,
    returnByValue: true
  });

  const report = {
    url: ARGS.url,
    requestedBackend: ARGS.backend,
    shot: shotPath,
    ready: Boolean(bridgeAt),
    bridgeAtMs: bridgeAt,
    scenePresentedAtMs: scenePresentedAt,
    canvas,
    bodyText,
    dom: JSON.parse(domProbe.result.value ?? '{}'),
    pixelStats,
    consoleErrors: logs.filter((l) => l.startsWith('[console.error') || l.startsWith('[exception') || l.startsWith('[net-fail')),
    requests
  };
  const reportPath = join(OUT_DIR, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  return report;
}

async function analyzePixels(base64Png) {
  try {
    const res = await send('Runtime.evaluate', {
      expression: `(async () => {
        const img = new Image();
        img.src = 'data:image/png;base64,${base64Png}';
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const w = img.width, h = img.height;
        const stat = (x, y, ww, hh) => {
          const d = ctx.getImageData(x, y, ww, hh).data;
          let r = 0, g = 0, b = 0, n = 0, bright = 0;
          for (let i = 0; i < d.length; i += 4) {
            r += d[i]; g += d[i + 1]; b += d[i + 2];
            const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
            if (l > 24) bright++;
            n++;
          }
          return {
            mean: [Math.round(r / n), Math.round(g / n), Math.round(b / n)],
            brightFrac: Number((bright / n).toFixed(3))
          };
        };
        return JSON.stringify({
          top: stat(0, 0, w, Math.floor(h / 3)),
          full: stat(0, 0, w, h)
        });
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    return JSON.parse(res.result.value ?? '{}');
  } catch (e) {
    return { error: e.message };
  }
}

function parseArgs(argv) {
  const out = {
    url: 'https://ruoshui-web.pages.dev/',
    out: 'web/.visual-check',
    backend: 'auto',
    timeoutMs: 120000,
    settleMs: 5000,
    bridgeSettleMs: 15000,
    window: '1400x900',
    noSandbox: true,
    hideLoading: true
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === '--url') out.url = value;
    else if (flag === '--out') out.out = value;
    else if (flag === '--backend') out.backend = value;
    else if (flag === '--timeout-ms') out.timeoutMs = Number(value);
    else if (flag === '--settle-ms') out.settleMs = Number(value);
    else if (flag === '--bridge-settle-ms') out.bridgeSettleMs = Number(value);
    else if (flag === '--window') out.window = value;
    else if (flag === '--sandbox') out.noSandbox = false;
    else if (flag === '--keep-loading') out.hideLoading = false;
  }
  return out;
}

main().catch((err) => {
  console.error('VISUAL-CHECK FAILED:', err.message);
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify({ error: err.message, logs }, null, 2));
  process.exitCode = 1;
}).finally(() => {
  ws?.close();
  chrome.kill('SIGKILL');
  if (existsSync(profileDir)) {
    rmSync(profileDir, { recursive: true, force: true });
  }
});
