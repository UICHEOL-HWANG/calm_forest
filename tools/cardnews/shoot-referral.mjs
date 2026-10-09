// =============================================================
//  calm forest · 🤝 친구 초대 카드뉴스(deck-03) 전용 촬영
//  ------------------------------------------------------------
//  shoot.mjs 는 게임 고정 카메라(camOffset)라 피사체를 크롭으로만 당긴다.
//  보상 꾸미기(날개·하트핀·도구)는 캐릭터에 붙은 작은 소품이라 크롭으로는 뭉갠다
//  → 씬 onBeforeRender 에서 카메라만 덮어써 가까이 찍는다(게임 코드 수정 없음).
//
//  보상은 실제 소유가 아니다 — 로컬 세션의 gameState 에 장착만 끼운다.
//  저장되면 서버 원장 가드가 지운다(security-hardening-2026-10). 촬영 전용.
//
//  사용: node shoot-referral.mjs <포트> [샷이름...]
//        node shoot-referral.mjs <포트> --live   ← 레코들리 녹화용 창(사람이 WASD 로 걷고, 카메라가 가까이 따라온다)
//        node shoot-referral.mjs <포트> --invitee ← 레코들리 녹화용 창(초대받은 친구 — 링크 도착 배너 → 입장 → 💗 하트핀 도착)
//        node shoot-referral.mjs <포트> --menu   ← 레코들리 녹화용 창(HUD 그대로 · ☰ → 🤝 친구 초대 시트를 가짜 코드로 연다)
// =============================================================
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enterGame, PHOTOMODE } from './game-session.mjs';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'shots');
const PORT = process.argv[2] || '8000';
const BASE = `http://localhost:${PORT}/?lang=ko&weather=clear`;

/** 장착 세트 — 슬롯 이름은 js/cosmetics/catalog.js */
const FULL = { tools: 'tools_star', back: 'friend_wing', head: 'friend_pin' };

// spot = 캐릭터를 세울 자리(__tp) · yaw = 캐릭터 방향(0 = 카메라 기본 쪽, +z 를 본다)
// cam = 캐릭터 기준 [dx,dy,dz] · at = 캐릭터 기준 바라볼 점 · tool = 손에 쥘 도구 키
export const SHOTS = {
  // 자리: (22,-6) 바다·등대가 뒤로 보이는 풀밭 · (10,-22) 개울 옆 빈 풀밭 — 나무가 카메라와 사이에 끼면
  //       게임이 반투명 처리(updateCameraFade)해 화면이 뿌옇게 찍힌다 → 나무 없는 자리만 쓴다
  d03_cover_wing: { time: 0.70, spot: [22, -6],  yaw: Math.PI * 1.78, cam: [2.0, 1.6, -3.0], at: [0, 1.0, 0], cos: FULL, tool: 'Digit4' },
  d03_tools:      { time: 0.46, spot: [22, -6],  yaw: Math.PI * 0.10, cam: [0.8, 1.4, 2.9],  at: [0.15, 0.75, 0], cos: FULL, tool: 'Digit4' },
  // 2장 재촬영 — 물뿌리개가 화면 위쪽 절반에 오도록(아래 46% 는 카드 글씨 자리) 낮은 점을 내려다본다
  d03_tools_b:    { time: 0.46, spot: [22, -6],  yaw: Math.PI * 0.10, cam: [0.9, 1.6, 3.6], at: [0.25, 0.35, 0], cos: FULL, tool: 'Digit4' },
  d03_tools_c:    { time: 0.46, spot: [22, -6],  yaw: Math.PI * 0.22, cam: [1.0, 1.5, 3.2], at: [0.3, 0.45, 0], cos: FULL, tool: 'Digit4' },
  d03_tools_d:    { time: 0.46, spot: [22, -6],  yaw: Math.PI * 0.00, cam: [0.6, 1.8, 3.9], at: [0.25, 0.3, 0], cos: FULL, tool: 'Digit4' },
  // 친구 카드 — 초대받은 친구가 받는 💗 우정 하트핀만 단 모습(다른 보상 없이). 하트핀은 옆머리 앞쪽(PIN_DIR x .8) → 오른쪽 앞에서
  d03_pin_a:      { time: 0.46, spot: [22, -6],  yaw: Math.PI * 0.15, cam: [1.1, 1.75, 2.7], at: [0.2, 0.55, 0], cos: { head: 'friend_pin' }, tool: 'Digit4' },
  d03_pin_b:      { time: 0.46, spot: [22, -6],  yaw: Math.PI * 0.22, cam: [1.05, 1.7, 1.75], at: [0.3, 0.72, 0], cos: { head: 'friend_pin' }, tool: 'Digit4' },
  d03_pin_c:      { time: 0.70, spot: [22, -6],  yaw: Math.PI * 0.15, cam: [1.1, 1.75, 2.7], at: [0.2, 0.55, 0], cos: { head: 'friend_pin' }, tool: 'Digit4' },
  d03_wing_back:  { time: 0.46, spot: [22, -6],  yaw: Math.PI * 1.85, cam: [1.6, 1.4, -2.7], at: [0, 1.0, 0], cos: FULL, tool: 'Digit2' },
  d03_arch:       { time: 0.72, spot: [22, -6],  yaw: Math.PI * 0.05, cam: [0.8, 1.9, 5.4],  at: [0, 1.5, -1.2], cos: FULL, tool: 'Digit4', hideSprites: true,
                    place: { id: 'friendarch', dx: 0, dz: -1.4 } },
};


async function setup(page, s) {
  await page.evaluate(async ({ s, cos }) => {
    const g = await import('/js/game.js');
    const gs = g.gameState;
    gs.cosmetics = { owned: [...new Set([...gs.cosmetics.owned, ...Object.values(cos)])], equipped: { ...gs.cosmetics.equipped, ...cos } };
    g.applyCosmetics(gs.cosmetics);
    document.querySelector('#hint-modal.show') && document.querySelector('#hint-ok')?.click();
    window.__tp(s.spot[0], s.spot[1]);
  }, { s, cos: s.cos });
  if (s.tool) { await page.keyboard.press(s.tool); await page.waitForTimeout(300); }
  await page.evaluate(async (s) => {
    const g = await import('/js/game.js');
    const P = g.player.position;
    // 아치 값(나뭇잎 9999 — js/data/reward-decor.js)은 비용 검사에 걸린다 → 촬영 세션에서만 채운다
    if (s.place) { g.gameState.inventory.leaf = 99999; const ok = window.__place(s.place.id, P.x + s.place.dx, P.z + s.place.dz, 0); if (!ok) throw new Error('아치 배치 실패'); }
    g.player.rotation.y = s.yaw;
    const pos = [P.x + s.cam[0], P.y + s.cam[1], P.z + s.cam[2]];
    const at = [P.x + s.at[0], P.y + s.at[1], P.z + s.at[2]];
    window.__scene.onBeforeRender = (r, sc, c) => {
      g.player.rotation.y = s.yaw;            // 이동 입력이 없어도 게임이 방향을 되돌릴 수 있다
      c.position.set(...pos); c.lookAt(...at); c.updateMatrixWorld();
    };
  }, s);
}

// ── 🎥 라이브(레코들리 녹화) — 창을 띄워 두고 사람이 직접 걷는다 ──
//   고정 카메라 대신 '가까운 추적 카메라': 캐릭터 기준 LIVE.cam 만큼 떨어져 따라온다.
//   아치는 출발점 북쪽(LIVE.arch)에 놓아 걸어 들어가는 장면을 찍을 수 있게 한다.
const LIVE = { time: 0.70, spot: [22, -2], cam: [0, 2.3, 4.6], at: [0, 1.0, -0.6], arch: [0, -5], size: [720, 900] };
// ── 🎥 방법 카드(☰ → 친구 초대) 녹화 ──
//   URL 에 time·weather 가 있어 dev 세션(IS_DEV_SESSION)이다 → GA4·원장 기록이 없지만 ☰ 친구 초대도 숨는다.
//   그래서 이 창에서만 js/referral/index.js 를 고쳐 서빙한다: 버튼 켜기 · 서버 호출 차단 · 가짜 코드 시트.
//   실제 계정으로 찍으면 진짜 초대 코드가 인스타에 노출된다 — 그래서 가짜 코드를 쓴다.
// 코드는 rules.js CODE_RE(I·O·0·1 제외 8자)를 지켜야 초대 링크로 읽힌다 — FOREST24 는 O 때문에 버려졌다
const FAKE = { code: 'SPRUCE24', active: 2, pending: 1 };
const PATCHES = [
  ['const enabled = () => !!CONFIG.REFERRAL_ON && !IS_DEV_SESSION;', 'const enabled = () => true;'],
  ['async function call(action, body = {}) {', 'async function call(action, body = {}) { return null;'],
  ["const guest = !auth || auth.isGuest || auth.provider === 'offline' || auth.provider === 'anonymous';", 'const guest = false;'],
  ['  if (guest || !enabled()) return;', `  renderInviteSheet(box, { ...view, loading: false, code: '${FAKE.code}', active: ${FAKE.active}, pending: ${FAKE.pending} }, on); return;`],
];
// ── 🎥 초대받은 친구 쪽 녹화 ──
//   실제 연결(bind)은 로그인 계정 + 서버가 해야 한다 → 이 창에서만 '연결 성공'을 흉내 낸다:
//   입장하면 MSG.bindOk 토스트를 실제와 같은 경로(quietToast — 온보딩이 끝난 뒤)로 띄우고 💗 우정 하트핀을 옷장에 넣는다(장착은 사람이 옷장에서).
//   새 게스트는 인트로·튜토리얼이 길다 → 한 번 입장해 진행을 남긴 뒤, 초대 링크로 다시 들어와 로그인 화면에서 멈춘다.
const INVITEE_PATCHES = [
  PATCHES[0], PATCHES[1],
  ['  try {\n    memo.claim = await runOnPlay(',
   "  quietToast(MSG.bindOk);\n  import('/js/game.js').then(g => { const c = g.gameState.cosmetics; g.gameState.cosmetics = { owned: [...new Set([...c.owned, 'friend_pin'])], equipped: { ...c.equipped } }; });\n  return;\n  try {\n    memo.claim = await runOnPlay("],
];
async function patchedPage(browser, patches, pos) {
  const ctx = await browser.newContext({ viewport: { width: LIVE.size[0], height: LIVE.size[1] } });
  const page = await ctx.newPage();
  await page.route('**/js/referral/index.js', async route => {
    const res = await route.fetch();
    let body = await res.text();
    for (const [a, b] of patches) {
      if (!body.includes(a)) throw new Error('referral/index.js 가 바뀌었다 — 패치 대상 없음: ' + a.slice(0, 50));
      body = body.replace(a, b);
    }
    await route.fulfill({ response: res, body });
  });
  return page;
}
if (process.argv.includes('--invitee')) {
  const browser = await chromium.launch({ headless: false, args: [`--window-size=${LIVE.size[0]},${LIVE.size[1] + 90}`, `--window-position=${LIVE.size[0] + 40},0`] });
  const page = await patchedPage(browser, INVITEE_PATCHES);
  const url = `${BASE}&time=${LIVE.time}&spawn=${LIVE.spot[0] - 3},${LIVE.spot[1]}`;
  await page.goto(url, { waitUntil: 'load' });
  try { await enterGame(page); } catch { await page.reload({ waitUntil: 'load' }); await enterGame(page); }
  await page.goto(url + `&invite=${FAKE.code}`, { waitUntil: 'load' });
  await page.waitForSelector('#login-invite.show', { timeout: 30000 }).catch(() => {});
  const banner = await page.evaluate(() => document.querySelector('#login-invite.show')?.textContent || null);
  await page.bringToFront();
  console.log(banner ? `🎥 초대받은 친구 창 준비 — 로그인 화면 배너: "${banner}"` : '⚠️ 초대 배너가 안 떴다');
  await page.waitForEvent('close', { timeout: 0 });
  await browser.close();
  process.exit(0);
}

if (process.argv.includes('--menu')) {
  const browser = await chromium.launch({ headless: false, args: [`--window-size=${LIVE.size[0]},${LIVE.size[1] + 90}`] });
  const page = await browser.newPage({ viewport: { width: LIVE.size[0], height: LIVE.size[1] } });
  await page.route('**/js/referral/index.js', async route => {
    const res = await route.fetch();
    let body = await res.text();
    for (const [a, b] of PATCHES) {
      if (!body.includes(a)) throw new Error('referral/index.js 가 바뀌었다 — 패치 대상 없음: ' + a.slice(0, 50));
      body = body.replace(a, b);
    }
    await route.fulfill({ response: res, body });
  });
  await page.goto(`${BASE}&time=${LIVE.time}&spawn=${LIVE.spot.join(',')}`, { waitUntil: 'load' });
  try { await enterGame(page); } catch { await page.reload({ waitUntil: 'load' }); await enterGame(page); }
  await page.evaluate(async ({ L, cos }) => {
    const g = await import('/js/game.js');
    const gs = g.gameState;
    gs.cosmetics = { owned: [...new Set([...gs.cosmetics.owned, ...Object.values(cos)])], equipped: { ...gs.cosmetics.equipped, ...cos } };
    g.applyCosmetics(gs.cosmetics);
    document.querySelector('#hint-modal.show') && document.querySelector('#hint-ok')?.click();
    window.__tp(L.spot[0], L.spot[1]);
  }, { L: LIVE, cos: FULL });
  const shown = await page.evaluate(() => getComputedStyle(document.getElementById('invite-btn')).display !== 'none');
  await page.bringToFront();
  console.log(shown ? '🎥 녹화 준비 완료 — ☰ → 🤝 친구 초대 → 공유하기. 창을 닫으면 끝난다.' : '⚠️ ☰ 친구 초대 버튼이 안 보인다');
  await page.waitForEvent('close', { timeout: 0 });
  await browser.close();
  process.exit(0);
}

if (process.argv.includes('--live')) {
  const browser = await chromium.launch({ headless: false, args: [`--window-size=${LIVE.size[0]},${LIVE.size[1] + 90}`] });
  const page = await browser.newPage({ viewport: { width: LIVE.size[0], height: LIVE.size[1] } });
  await page.goto(`${BASE}&time=${LIVE.time}&spawn=${LIVE.spot.join(',')}`, { waitUntil: 'load' });
  try { await enterGame(page); } catch { await page.reload({ waitUntil: 'load' }); await enterGame(page); }
  await page.evaluate(async ({ L, cos }) => {
    const g = await import('/js/game.js');
    const gs = g.gameState;
    gs.cosmetics = { owned: [...new Set([...gs.cosmetics.owned, ...Object.values(cos)])], equipped: { ...gs.cosmetics.equipped, ...cos } };
    g.applyCosmetics(gs.cosmetics);
    document.querySelector('#hint-modal.show') && document.querySelector('#hint-ok')?.click();
    window.__tp(L.spot[0], L.spot[1]);
    gs.inventory.leaf = 99999;   // 아치 비용 검사 통과용(촬영 세션 전용)
    window.__place('friendarch', L.spot[0] + L.arch[0], L.spot[1] + L.arch[1], 0);
    const P = g.player.position;
    window.__scene.onBeforeRender = (r, sc, c) => {
      c.position.set(P.x + L.cam[0], P.y + L.cam[1], P.z + L.cam[2]);
      c.lookAt(P.x + L.at[0], P.y + L.at[1], P.z + L.at[2]); c.updateMatrixWorld();
    };
    setTimeout(() => window.__scene.traverse(o => { if (o.isSprite) o.visible = false; }), 2500);   // '🌈 설치!' 문구 걷기
  }, { L: LIVE, cos: FULL });
  await page.keyboard.press('Digit4');          // 💎 물뿌리개를 쥔 채로 시작
  await page.addStyleTag({ content: PHOTOMODE });
  await page.bringToFront();
  console.log('🎥 녹화 준비 완료 — WASD 이동 · 2~6 도구 · Space 도구질. 창을 닫으면 끝난다.');
  await page.waitForEvent('close', { timeout: 0 });
  await browser.close();
  process.exit(0);
}

const names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(SHOTS);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const n of names) {
  const s = SHOTS[n];
  if (!s) { console.warn('unknown shot:', n); continue; }
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  try {
    await page.goto(`${BASE}&time=${s.time}&spawn=${s.spot.join(',')}`, { waitUntil: 'load' });
    try { await enterGame(page); } catch { await page.reload({ waitUntil: 'load' }); await enterGame(page); }   // 인트로 스킵을 놓치는 경우가 있다
    await setup(page, s);
    await page.addStyleTag({ content: PHOTOMODE });
    await page.waitForTimeout(1800);
    // 아치: 배치 직후 '🌈 설치!' 월드 스프라이트(spawnFloatText)가 헤드리스 저프레임에선 한참 남는다 → 스프라이트를 끈다
    if (s.hideSprites) {
      await page.evaluate(() => window.__scene.traverse(o => { if (o.isSprite) o.visible = false; }));
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: resolve(OUT, n + '.png') });
    console.log('shot', n);
  } catch (e) { console.error('FAIL', n, e.message); }
  await page.close();
}
await browser.close();
