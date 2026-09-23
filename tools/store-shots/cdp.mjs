// 📸 tools/store-shots 전용 — 헤드리스 Chrome CDP 최소 클라이언트(Node 22 내장 WebSocket + fetch, 의존성 0)
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function launch(port = 9333) {
  const dir = mkdtempSync(path.join(tmpdir(), 'cdp-'));
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank',
  ], { stdio: 'ignore' });
  let ws;
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const pg = list.find(t => t.type === 'page');
      if (pg) { ws = pg.webSocketDebuggerUrl; break; }
    } catch {}
    await sleep(200);
  }
  if (!ws) throw new Error('chrome 기동 실패');
  const sock = new WebSocket(ws);
  await new Promise((res, rej) => { sock.onopen = res; sock.onerror = rej; });
  let id = 0; const pending = new Map(); const listeners = [];
  sock.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
    else if (m.method) listeners.forEach(l => l(m));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); sock.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expr, timeoutMs = 60000) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, timeout: timeoutMs });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await send('Page.enable'); await send('Runtime.enable');
  const logs = [];
  listeners.push(m => { if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') logs.push(m.params.args.map(a => a.value ?? a.description).join(' ')); if (m.method === 'Runtime.exceptionThrown') logs.push(m.params.exceptionDetails.exception?.description); });
  return {
    send, evaluate, logs, sleep,
    async viewport(width, height, { mobile = false, touch = false, ua, dsf = 1 } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dsf, mobile });
      await send('Emulation.setTouchEmulationEnabled', touch ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
      if (ua) await send('Emulation.setUserAgentOverride', { userAgent: ua });
    },
    async goto(url, waitMs = 3000) { await send('Page.navigate', { url }); await sleep(waitMs); },
    async shot(file, fmt = 'png', clip) {
      const r = await send('Page.captureScreenshot', { format: fmt, quality: fmt === 'jpeg' ? 92 : undefined, captureBeyondViewport: false, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async close() { try { await send('Browser.close'); } catch {} proc.kill(); },
  };
}
