// 📷 포토모드 캡처 — 게임을 1080x1350 세로로 띄우고 HUD를 숨긴 채 촬영한다.
//
// 게임 코드에 촬영 전용 훅은 넣지 않는다. js/game.js:124~ 에 이미 있는
// ?time / ?weather / ?spawn / ?river / ?mist / ?sea 개발 파라미터를 그대로 쓴다.
//
// 사용: node shoot.mjs <서버포트> [샷이름...]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), 'shots');
const PORT = process.argv[2] || '8000';
const BASE = `http://localhost:${PORT}/`;

// 촬영 목록. q = 게임 URL 파라미터, wait = 진입 후 추가 대기(ms)
export const SHOTS = {
  village_noon:  { q: 'weather=clear&time=0.46', wait: 1200 },
  village_dusk:  { q: 'weather=clear&time=0.72', wait: 1200 },
  village_night: { q: 'weather=clear&time=0.90', wait: 1500 },
  village_rain:  { q: 'weather=rain&time=0.40',  wait: 1500 },
  farm_noon:     { q: 'weather=clear&time=0.46&spawn=13,6', wait: 1200 },
  pond_dusk:     { q: 'weather=clear&time=0.72&spawn=-6,-14', wait: 1200 },
  forest_morning:{ q: 'weather=clear&time=0.30&spawn=-18,4', wait: 1200 },
  sea:           { q: 'weather=clear&time=0.55&sea=1',  wait: 3000 },

  // 🏙️ 회사생활 파트 — 게임 인트로(도시 컷신)를 그대로 쓴다. AI 생성 이미지가 아니라
  //    같은 엔진·같은 로우폴리 화풍이라 숲 컷과 이어 붙여도 이질감이 없다.
  //    타임라인은 js/game.js:6607 INTRO_CAPTIONS 기준.
  city_slump:    { q: 'weather=clear', intro: 2.6,  wait: 700 },   // 벤치에 축 처져 앉음
  city_wide:     { q: 'weather=clear', intro: 4.8,  wait: 700 },   // 도시 전경
  city_leaf:     { q: 'weather=clear', intro: 7.6,  wait: 700 },   // 잎사귀가 날아옴
  city_leaf2:    { q: 'weather=clear', intro: 9.4,  wait: 700 },
  arrive_forest: { q: 'weather=clear', intro: 13.4, wait: 700 },   // 숲 도착
  arrive_look:   { q: 'weather=clear', intro: 15.2, wait: 700 },

  // 🌱 밭 — 게스트 새 세이브는 밭이 비어 있다. 직접 갈고 심고 물을 준다.
  //    "물 준 만큼 자란다"에는 다 자란 작물이 아니라 방금 물 준 새싹이 맞다.
  farm_watered:  { q: 'weather=clear&time=0.42&farm=1&give=seed:9', act: 'farm', wait: 150 },
  mist:          { q: 'weather=fog&time=0.35&mist=1',   wait: 3000 },

  // 🌇 CTA 후보 — 마을 시설(간판·게시판·집터 빌보드)은 전부 z >= -8 에 몰려 있고
  //    카메라가 플레이어 뒤 +Z 에서 -Z 를 본다. 그래서 북쪽으로 넘어가면 나무·풀만 남는다.
  //    마을 이동 반경은 42(js/game.js:7966).
  cta_n:         { q: 'weather=clear&time=0.72&spawn=0,-16',   wait: 1400 },
  cta_nw:        { q: 'weather=clear&time=0.72&spawn=-18,-14', wait: 1400 },
  cta_ne:        { q: 'weather=clear&time=0.72&spawn=18,-12',  wait: 1400 },
};

// HUD 전부 숨김. body 직계 중 #app(Three.js 캔버스)만 남긴다 —
// id 를 하나씩 나열하면 UI 가 추가될 때마다 깨진다.
const PHOTOMODE = 'body > *:not(#app):not(script){display:none!important}';

/** 로그인 게이트 → 캐릭터 선택 → 인트로 → 튜토리얼 모달을 통과해 플레이 화면까지.
 *  두 번째 촬영부터는 localStorage 에 진행이 남아 인트로·튜토리얼이 아예 안 뜬다.
 *  그래서 각 단계는 "보이면 누른다"로 처리한다(고정 순서로 기다리면 타임아웃). */
async function step(page, sel, timeout = 8000) {
  try { await page.waitForSelector(sel, { state: 'visible', timeout }); }
  catch { return false; }
  // 캔버스·모달 오버레이가 포인터를 가로채 Playwright 의 클릭 가능성 검사에 걸린다.
  // 눈에 보이는 게 확인됐으면 DOM 클릭으로 넘긴다.
  await page.evaluate(s => document.querySelector(s)?.click(), sel);
  return true;
}

async function enterGame(page) {
  if (!await step(page, '#guest-btn', 30000)) throw new Error('로그인 게이트 통과 실패');  // 구글 로그인 안 씀
  if (!await step(page, '#char-confirm', 30000)) throw new Error('캐릭터 선택 실패');
  await step(page, '#intro-skip', 4000);   // 이미 본 세이브면 안 뜬다
  await step(page, '#tut-skip', 4000);     // 〃
}

/** 밭: 세 칸을 갈고 심은 뒤 마지막에 몰아서 물을 준다.
 *  키 매핑은 js/game.js:7583 (2 괭이 · 3 씨앗 · 4 물조리개 · Space 액션)
 *
 *  입장 직후 그냥 Space 를 누르면 안 된다. 두 가지가 가로챈다(둘 다 실측 확인):
 *   1) enterFarm() 이 띄우는 첫 안내 모달을 index.html:3239 의 capture 리스너가 잡아
 *      Space 를 stopPropagation 한다 → 첫 Space 는 도구질이 아니라 "알겠어요" 클릭이 된다.
 *   2) 스폰 지점(FARM.z + FARM_HALF - 1.5)이 남쪽 출구 판정(1.8) 안이라 nearDoor='farmexit' 다
 *      → Space 가 exitFarm() 을 때려 마을로 나가고, 이후 루틴이 마을 화분에 찍힌다.
 *
 *  칸 간격은 tryHoe() 의 Math.round(x/2)*2 — 2 유닛이다. 시간으로 걸으면 프레임 편차에
 *  따라 같은 칸을 두 번 때리므로(0.9 유닛밖에 안 감) __pos() 로 실제 이동량을 보고 멈춘다.
 *  물주기를 칸마다 섞으면 먼저 심은 칸이 촬영 시점에 다시 목말라 💧말풍선이 뜬다 → 맨 끝에 몰아서 준다. */
const PLOT_STEP = 2;
const PLOTS = 2;        // 칸 수. 물주기 전체가 WET_TIME(5초) 안에 끝나야 해서 3칸은 못 맞춘다

async function farmRoutine(page) {
  const tap = async (key, hold = 90) => { await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key); };
  const pos = () => page.evaluate(() => window.__pos?.() ?? null);
  const use = async (tool, settle = 420) => { await tap(tool, 60); await page.waitForTimeout(140); await tap('Space', 60); await page.waitForTimeout(settle); };
  /** 실제 x 이동량이 PLOT_STEP 을 넘을 때까지 걷는다(시간이 아니라 좌표 기준) */
  const walk = async (key) => {
    const [x0] = await pos();
    for (let n = 0; n < 8; n++) {
      await tap(key, 900); await page.waitForTimeout(80);   // 물주기 창(WET_TIME 5초) 안에 끝나야 해 한 번에 크게 밟는다
      const [x] = await pos();
      if (Math.abs(x - x0) >= PLOT_STEP) return;
    }
    throw new Error('옆 칸으로 못 감');
  };

  await page.evaluate(() => document.querySelector('#hint-modal.show') && document.querySelector('#hint-ok')?.click());
  await page.waitForTimeout(250);
  await tap('KeyW', 900);                  // 남쪽 출구 판정에서 벗어난다
  await page.waitForTimeout(250);
  const away = await pos();
  if (!away || away[1] > 88) throw new Error(`출구에서 못 벗어남: ${JSON.stringify(away)}`);

  for (let i = 0; i < PLOTS; i++) {        // 갈고 심기
    await use('Digit2'); await use('Digit3');
    if (i < PLOTS - 1) await walk('KeyD');
  }
  // 흙은 WET_TIME(=5초)만 촉촉하다(js/game.js:105). 먼저 물 준 칸이 촬영 전에 마르면
  // 💧'물 줘요!' 말풍선이 뜬 채로 찍힌다 — 헤드라인('밭에 물 줬다')과 정면으로 어긋난다.
  // 그래서 물주기는 한 번에 몰아치고, 예산을 넘기면 조용히 넘어가지 말고 실패시킨다.
  const t0 = Date.now();
  for (let i = 0; i < PLOTS; i++) {        // 왔던 길로 되돌아오며 물주기 — 마지막 칸이 가장 촉촉하다
    await use('Digit4', 220);              // 물은 Space 즉시 반영이라 제스처를 끝까지 안 기다린다
    if (i < PLOTS - 1) await walk('KeyA');
  }
  farmWaterAt = Date.now();
  const spent = (farmWaterAt - t0) / 1000;
  if (spent > 3.2) throw new Error(`물주기가 ${spent.toFixed(1)}초 걸림 — 첫 칸이 마른다(WET_TIME 5초)`);
}

/** 마지막 물주기 시각 — shoot() 이 촬영까지 남은 시간을 검사한다 */
let farmWaterAt = 0;

const ACTS = { farm: farmRoutine };

async function shoot(page, name, { q, wait, intro, act }) {
  await page.goto(BASE + '?lang=ko&' + q, { waitUntil: 'load' });
  await enterGame(page);
  if (intro != null) {
    // 인트로 강제 재생 후 타임라인 점프. 둘 다 js/game.js:1624 의 기존 로컬 전용 훅.
    await page.evaluate(() => window.__introTest());
    await page.waitForTimeout(400);
    const ok = await page.evaluate(s => window.__introJump(s), intro);
    if (!ok) throw new Error('intro 진입 실패');
  }
  if (act) { await ACTS[act](page); }
  await page.waitForTimeout(wait);
  await page.addStyleTag({ content: PHOTOMODE });
  await page.waitForTimeout(600);                            // 다음 렌더 프레임까지
  // 밭 샷: 물 준 지 5초(WET_TIME)가 지나면 흙이 말라 💧말풍선이 뜬 채로 찍힌다
  if (act === 'farm') {
    const since = (Date.now() - farmWaterAt) / 1000;
    if (since > 4.2) throw new Error(`물 준 뒤 ${since.toFixed(1)}초 경과 — 흙이 마른 채로 찍힌다`);
  }
  const out = resolve(OUT, name + '.png');
  await page.screenshot({ path: out });
  console.log('shot', name);
  return out;
}

const names = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(SHOTS);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
// 해상도는 샷마다 다르다.
//   정지 샷 → 2배. 카메라 거리(camOffset)가 게임에 고정이라 피사체를 당길 방법이 크롭뿐인데,
//              등배로 찍으면 크롭한 만큼 뭉갠다(deck.mjs 의 zoom).
//   조작 샷(act) → 1배. 헤드리스에서 2배로 그리면 10fps → 4fps 로 떨어지고,
//              이동이 프레임 기반이라 같은 900ms 를 눌러도 2.40유닛 → 0.60유닛만 간다(실측).
//              그 상태로는 밭 물주기가 WET_TIME(5초) 안에 안 끝난다.
// aspect 는 CSS 픽셀 기준이라 어느 쪽이든 화각은 같다.
for (const n of names) {
  if (!SHOTS[n]) { console.warn('unknown shot:', n); continue; }
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 },
                                       deviceScaleFactor: SHOTS[n].act ? 1 : 2 });
  try { await shoot(page, n, SHOTS[n]); }
  catch (e) { console.error('FAIL', n, e.message); }
  await page.close();
}
await browser.close();
