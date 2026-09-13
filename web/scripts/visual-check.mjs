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
 *   node web/scripts/visual-check.mjs --url http://localhost:5173 --dock-hover
 *
 * 说明：
 *   - 输出目录默认 web/.visual-check/，内含 shot.png 与 report.json。
 *   - 由于 WebGL 画布在未开启 preserveDrawingBuffer 时无法直接读像素，
 *     脚本改用 CDP 整页截图，再回灌到页面里用 Image+canvas 统计像素。
 *   - 真实「天空是否黑」的判断建议配合视觉模型读 shot.png；本脚本只提供
 *     确定性信号（就绪状态、canvas 尺寸、报错、亮度统计）。
 *   - `--dock-hover` 额外跑一次 dock 菜单 hover 轨迹断言：从图标沿真实鼠标
 *     路径移入玻璃面板时菜单必须保持打开，移开后必须关闭。失败时脚本以
 *     非零退出码结束，结果写入 report.json 的 dockHover 字段。它需要桌面
 *     宽度视口与已运行的前端服务，因此不默认开启。
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

  let dockHover = null;
  if (ARGS.dockHover) {
    dockHover = await runDockHoverCheck();
    logs.push(`[dock-hover] ${JSON.stringify(dockHover)}`);
    if (!dockHover.skipped && !dockHover.pass) {
      process.exitCode = 1;
    }
  }

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
    dockHover,
    consoleErrors: logs.filter((l) => l.startsWith('[console.error') || l.startsWith('[exception') || l.startsWith('[net-fail')),
    requests
  };
  const reportPath = join(OUT_DIR, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  return report;
}

/**
 * dock 菜单 hover 轨迹断言。
 *
 * 回归背景：`useFloating` 不传 `placement` 时默认 `bottom`，而面板用 CSS
 * 定位在按钮上方（`bottom-full`），`safePolygon()` 的安全三角方向因此相反，
 * 鼠标从图标斜向面板时菜单会在离开按钮后被误判为离开安全区而关闭。
 * 这里用 CDP 真实鼠标事件逐像素走一遍路径，确保菜单行为不再回退。
 */
async function runDockHoverCheck() {
  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text ?? 'dock-hover evaluate failed');
    }
    return res.result?.value;
  };
  const moveMouse = (x, y) =>
    send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y,
      button: 'none',
      buttons: 0
    });

  const buttonJson = await evaluate(`(() => {
    const btn = document.querySelector('button[title="导览镜头"]');
    if (!btn) return null;
    const b = btn.getBoundingClientRect();
    return JSON.stringify({ cx: b.x + b.width / 2, cy: b.y + b.height / 2 });
  })()`);
  if (!buttonJson) {
    return { skipped: true, reason: '未找到 dock 导览镜头按钮（移动端视口或非生产 UI）' };
  }
  const button = JSON.parse(buttonJson);

  const isOpen = () =>
    evaluate(`(() => {
      const btn = document.querySelector('button[title="导览镜头"]');
      const panel = document.querySelector('#dock-menu-presets');
      return Boolean(btn && panel) &&
        btn.getAttribute('aria-expanded') === 'true' &&
        getComputedStyle(panel).visibility === 'visible';
    })()`);

  const openMenu = async () => {
    await moveMouse(20, 20);
    await sleep(400);
    await moveMouse(button.cx, button.cy);
    await sleep(500);
    return isOpen();
  };

  if (!(await openMenu())) {
    return { skipped: false, pass: false, reason: 'hover dock 图标后菜单没有打开' };
  }

  // 面板 rect 必须在打开状态读取：关闭时还带 translate-y-2 偏移。
  const panel = JSON.parse(await evaluate(`(() => {
    const p = document.querySelector('#dock-menu-presets').getBoundingClientRect();
    return JSON.stringify({ left: p.left, right: p.right, top: p.top, bottom: p.bottom });
  })()`));

  const runPath = async (label, points, expectOpen) => {
    const opened = await openMenu();
    let closedAt = null;
    let from = { x: button.cx, y: button.cy };
    for (const target of points) {
      for (let i = 1; i <= 16; i++) {
        const x = from.x + (target.x - from.x) * (i / 16);
        const y = from.y + (target.y - from.y) * (i / 16);
        await moveMouse(x, y);
        await sleep(40);
        if (!(await isOpen()) && !closedAt) {
          closedAt = { x: Math.round(x), y: Math.round(y) };
        }
      }
      from = target;
    }
    const endOpen = await isOpen();
    return {
      label,
      opened,
      closedAt,
      endOpen,
      pass: opened && endOpen === expectOpen
    };
  };

  const paths = [
    await runPath('straight-up', [{ x: button.cx, y: (panel.top + panel.bottom) / 2 }], true),
    // 回归路径：斜向面板右上区域，缺少 placement: 'top' 时会在离开按钮后立刻关闭。
    await runPath('diagonal-right', [{ x: panel.right - 24, y: panel.bottom - 28 }], true),
    await runPath('leave-away', [{ x: 40, y: 300 }], false)
  ];

  return {
    skipped: false,
    pass: paths.every((path) => path.pass),
    button,
    panel,
    paths
  };
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
    hideLoading: true,
    dockHover: false
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
    else if (flag === '--dock-hover') out.dockHover = true;
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
