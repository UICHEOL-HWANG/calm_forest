// =============================================================
//  calm forest · 🎬 광고 영상 녹화 — 프레임 단위(가상 시계) + 대본 카메라
//  ------------------------------------------------------------
//  node ad-record.mjs --scenario halloween|cozy --out out/ad/halloween_raw.mp4 [--port 8000] [--fps 30] [--scale 2]
//
//  record.mjs 와 무엇이 다른가:
//    record.mjs 는 MediaRecorder 로 **실시간** 녹화한다 — 헤드리스가 느리면 프레임이 1/2~1/4 로 떨어져
//    광고 영상이 뚝뚝 끊긴다. 여기선 게임 시계(performance.now·Date.now·requestAnimationFrame)를
//    가로채 1/fps 초씩 직접 넘기고, 그 프레임을 캔버스에서 바로 떠서 ffmpeg 로 잇는다.
//    → 기기가 느려도 항상 매끈한 30fps. 대신 녹화는 실시간보다 오래 걸린다.
//
//  카메라: game.js 의 setCameraRig(연출용 훅 — 산·세계수 컷신이 쓰는 것)에 대본 카메라를 꽂는다.
//    게임 코드는 고치지 않는다. 같은 모듈 인스턴스를 import('/js/game.js') 로 받아 쓴다.
//  캐릭터: 키 입력(keydown/keyup)을 대본 시각에 쏜다 — 걷기 애니메이션·발자국·눈 밟기가 게임 그대로 나온다.
//
//  자막·엔드카드·음악은 여기서 넣지 않는다 → ad-compose.mjs (원본은 깨끗하게 남겨 소재 버전을 쉽게 뽑게)
//  ⚠️ localhost 전용 dev 훅(__tp 등)을 쓴다 — 로컬 서버(python3 scripts/serve.py)로 띄울 것.
// =============================================================
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { enterGame } from './game-session.mjs';
import { SCENES } from './ad-scenes.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const SCENARIO = arg('--scenario', 'halloween');
const OUT = resolve(arg('--out', `out/ad/${SCENARIO}_raw.mp4`));
const PORT = arg('--port', '8000');
const FPS = Number(arg('--fps', '30'));
const SCALE = Number(arg('--scale', '2'));      // 540x960 × 2 = 1080x1920
const ONLY = arg('--secs');                      // 빠른 검수: 앞 N초만
const EXEC = process.env.CHROMIUM_PATH;          // 클라우드 샌드박스 등 브라우저 경로가 다를 때

const scene = SCENES[SCENARIO];
if (!scene) { console.error(`알 수 없는 --scenario: ${SCENARIO} (${Object.keys(SCENES).join('|')})`); process.exit(1); }
const DUR = ONLY ? Math.min(Number(ONLY), scene.duration) : scene.duration;

// ── 가상 시계 — 부팅 동안은 실시간, __vtStart() 뒤로는 __vtStep(ms) 로만 흐른다 ──
const VIRTUAL_CLOCK = () => {
  const realPerf = performance.now.bind(performance), realDate = Date.now, realRAF = window.requestAnimationFrame.bind(window);
  let on = false, virt = 0, base = 0, dBase = 0, queue = [], id = 0;
  performance.now = () => on ? virt : realPerf();
  Date.now = () => on ? dBase + (virt - base) : realDate();
  window.requestAnimationFrame = (cb) => { if (!on) return realRAF(cb); queue.push([++id, cb]); return id; };
  const realCancel = window.cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = (h) => { queue = queue.filter(([i]) => i !== h); realCancel(h); };
  window.__vtStart = () => { base = virt = realPerf(); dBase = realDate(); on = true; };
  window.__vtStep = (ms) => {
    virt += ms;
    const q = queue; queue = [];
    for (const [, cb] of q) { try { cb(virt); } catch (e) { console.error('[vt]', e); } }
  };
};

const browser = await chromium.launch({ ...(EXEC ? { executablePath: EXEC } : {}), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: SCALE, locale: 'ko-KR' });
page.on('pageerror', e => console.error('[page]', e.message));
await page.addInitScript(VIRTUAL_CLOCK);
if (process.env.THREE_LOCAL) {   // 샌드박스에서 unpkg 가 막혔을 때 — 로컬 three 패키지로 대신 준다
  await page.route('https://unpkg.com/three@0.160.0/**', r => r.fulfill({
    path: `${process.env.THREE_LOCAL}/${r.request().url().split('three@0.160.0/')[1]}`, contentType: 'application/javascript' }));
}
await page.goto(`http://localhost:${PORT}/?${scene.query}`, { waitUntil: 'domcontentloaded' });
await enterGame(page, { skipMs: 8000, playMs: 60000, char: scene.char });
await page.addStyleTag({ content: 'body > *:not(#app):not(script){display:none!important}' });   // HUD 전부 숨김(record.mjs PHOTOMODE)

// ── 장면 준비: 의상·장식·위치 — 같은 모듈 인스턴스에서 게임 함수를 받아 쓴다 ──
await page.evaluate(async (setup) => {
  const g = await import('/js/game.js');
  window.__g = g;
  const THREE = await import('three');
  window.__fillLight = new THREE.PointLight(0xffe6c8, 0, 0, 2);
  g.scene.add(window.__fillLight);
  if (setup.build) window.__buildTest(setup.build);   // 🏠 새 세이브는 집이 없다 — 마당 뒤에 집이 서 있게
  const cos = g.gameState.cosmetics;
  for (const [slot, id] of Object.entries(setup.wear || {})) {
    if (!cos.owned.includes(id)) cos.owned.push(id);
    cos.equipped[slot] = id;
  }
  g.applyCosmetics(cos);
  window.__tp(setup.at[0], setup.at[1]);
  if (setup.face != null) g.player.rotation.y = setup.face;
  for (const d of setup.decor || []) g.placeOutdoor(d[1], d[2], true, d[0], d[3] ?? 0);
  // 🌲 마당 앞(카메라가 지나갈 자리)의 나무는 숨긴다 — 새 세이브마다 나무 위치가 무작위라 화면을 가린다
  const [yx, yz] = setup.at;
  for (const t of g.trees) if (Math.abs(t.position.x - yx) < 7 && t.position.z > yz - 1.5 && t.position.z < yz + 14) { t.visible = false; if (t.userData.collider) t.userData.collider.off = true; }   // 충돌체도 꺼야 안 보이는 벽이 안 남는다
  // 🧑‍🤝‍🧑 NPC·이름표·퀘스트 '!' 는 광고 화면에서 뺀다 — 게임 루프가 visible 을 다시 켜므로 속성째 막는다
  for (const o of g.npcObjs) Object.defineProperty(o.group, 'visible', { get: () => false, set() {}, configurable: true });
}, scene.setup);
await page.waitForTimeout(5000);   // 의상 메시·장식 생성, 집 짓기 축하 연출이 끝나게(아직 실시간)

// ── 대본 카메라: 프레임마다 {p, l}(플레이어 기준 오프셋)을 받아 그대로 둔다 ──
await page.evaluate(() => {
  const g = window.__g;
  window.__camPose = null;
  // 💡 촬영용 보조광 — 카메라를 따라다니는 부드러운 필라이트(밤 장면에서 역광에 얼굴이 묻히지 않게). 게임 조명은 그대로
  const fill = window.__fillLight;
  g.setCameraRig((cam) => {
    const c = window.__camPose; if (!c) return;
    const P = g.player.position;
    cam.position.set(P.x + c.p[0], P.y + c.p[1], P.z + c.p[2]);
    if (c.fov && cam.fov !== c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    cam.lookAt(P.x + c.l[0], P.y + c.l[1], P.z + c.l[2]);
    if (fill) { fill.intensity = c.fill ?? 0; fill.position.set(cam.position.x, cam.position.y + 0.6, cam.position.z); }
  });
  window.__vtStart();
});
// 🔥 예열 12초(녹화 안 함) — 집 짓기 축하·장식 생성 연출을 가상 시계로 마저 흘려보낸다
{
  const first = scene.at(0, 0);
  for (let i = 0; i < 12 * FPS; i++) await page.evaluate(({ cam, dt }) => { window.__camPose = cam; window.__vtStep(dt); }, { cam: first.cam, dt: 1000 / FPS });
}

// ── ffmpeg 로 바로 흘려 보낸다(프레임 PNG 를 디스크에 쌓지 않는다) ──
await mkdir(dirname(OUT), { recursive: true });
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-r', String(FPS), OUT],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const N = Math.round(DUR * FPS);
const t0 = Date.now();
let held = new Set();
for (let f = 0; f < N; f++) {
  const t = f / FPS;
  const st = scene.at(t, f);   // { cam:{p,l,fov}, keys:[...], press:[...], run:[...] }
  const want = new Set(st.keys || []);
  const down = [...want].filter(k => !held.has(k)), up = [...held].filter(k => !want.has(k));
  held = want;
  const b64 = await page.evaluate(({ cam, down, up, press, run, dt }) => {
    const ev = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
    for (const k of up) ev('keyup', k);
    for (const k of down) ev('keydown', k);
    for (const k of press || []) { ev('keydown', k); ev('keyup', k); }
    for (const r of run || []) { try { (0, eval)(r)(window.__g); } catch (e) { console.error('[run]', e); } }
    window.__camPose = cam;
    window.__vtStep(dt);
    // 렌더 직후 같은 태스크 안에서 뜬다 — preserveDrawingBuffer 없이도 버퍼가 살아 있다
    return document.querySelector('#app canvas').toDataURL('image/jpeg', 0.94).split(',')[1];
  }, { cam: st.cam, down, up, press: st.press, run: st.run, dt: 1000 / FPS });
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if (f % FPS === 0) process.stdout.write(`\r${(t).toFixed(0)}s / ${DUR}s  (${((Date.now() - t0) / 1000).toFixed(0)}s 경과)`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
console.log(`\n✅ ${OUT} (${N} 프레임 · ${FPS}fps)`);
await browser.close();
