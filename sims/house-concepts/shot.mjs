// headless Chrome(CDP :9223) 캡처 — node shot.mjs <out.png> "<query>" [W=1280] [H=720]
//   예) node shot.mjs cottage.png "house=cottage"   ·  node shot.mjs all.png "all=1" 1600 720
//   크롬: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9223 --user-data-dir=/tmp/cf-chrome --use-angle=swiftshader --enable-unsafe-swiftshader
const [,, out, query = 'house=cottage', W = '1280', H = '720'] = process.argv;
const url = `http://localhost:8000/sims/house-concepts/?${query}`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const tab = await (await fetch(`http://127.0.0.1:9223/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pending = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') console.log('EXC', JSON.stringify(m.params.exceptionDetails).slice(0, 300)); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.log('ERR', m.params.args.map(a => a.value || a.description).join(' ').slice(0, 300)); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
await send('Page.reload');
for (let i = 0; i < 30; i++) { if (await ev('!!window.__ready')) break; await sleep(500); }
await sleep(1200);
const shot = await send('Page.captureScreenshot', { format: 'png' });
(await import('node:fs')).writeFileSync(out, Buffer.from(shot.result.data, 'base64')); console.log('saved', out);
await send('Target.closeTarget', { targetId: tab.id }).catch(() => {}); ws.close();
