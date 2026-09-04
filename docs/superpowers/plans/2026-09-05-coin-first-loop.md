# 🪙 코인 첫 루프 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 첫 세션 안에 "팔아서 산다"를 한 바퀴 완성시킨다 — 상인이 찾아와 첫 매입, 좌판에서 🌱비료·🪱미끼 구매, 사용까지.

**Architecture:** 순수 판단 로직(환영 거래 제안·dev 세션 판정·시세 말풍선 문구)은 새 모듈 `js/first-loop.js`로 분리해 node 테스트로 고정한다. 연출·상태 머신·UI는 기존 패턴(NPC 배회 루프, `#hint-modal` 카드, `setDoorPrompt` 프롬프트 체인, `SHOP_BUY` 목록)에 얹는다. 계측은 기존 `shop_sell`/`shop_buy` 경로를 그대로 타고 이벤트 3종만 추가한다.

**Tech Stack:** Vanilla JS ES 모듈 + Three.js(importmap, 빌드 없음) · Supabase · GA4 · node 22 `node:test`(신설, 순수 모듈만) · 검증은 `node --check` + 로컬 서버 브라우저 확인.

**Spec:** `docs/superpowers/specs/2026-09-05-coin-first-loop-design.md`

## Global Constraints

- 빌드 없음. 모든 JS는 `for f in js/*.js; do node --check "$f"; done` 통과.
- 새 한국어 문구는 `js/i18n-en.js`에 영문 키 등록, `node scripts/i18n_check.mjs`에서 새 문구가 "빠짐 후보"에 뜨지 않게.
- 문구는 스펙 §8 그대로(수정 금지). 환영가: 목재 5개 → 30🪙, 물고기 1마리 → 25🪙. 비료 20🪙 1개, 미끼 25🪙 5회분.
- 원장 출처는 새로 만들지 않는다: 환영 거래 = `logEcon('shop_sell', '<item>|welcome', gain, balance)`.
- 새 GA4 이벤트: `merchant_visit{item,gain}`, `use_fert{left}`, `use_bait{left}`. `shop_sell`에 `via:'merchant'` 추가(환영 거래만).
- 모바일: 모달 폭 `min(400px, 92vw)`, 버튼 세로 스택·높이 48px 이상, 새 버튼 추가 없음(기존 액션 버튼 라벨 전환). 튜토리얼 문구는 `TOUCH` 분기 유지.
- 토스: 플랫폼 분기 없음. 모달은 화면 중앙(`#hint-modal`과 같은 `inset:0; place-items:center`)이라 상단 인셋과 무관.
- 새 색·SVG 도입 없음. 기존 토큰(`--mint`, `--ink`, `--shadow`)과 이모지만 사용.
- 커밋 메시지 형식은 저장소 관례(`Feat: 🧙 …`, `Fix: …`, `Docs: …`)와 공동 저자 트레일러:
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- 브랜치 `dev`에서 작업. `main` 머지·배포는 이 계획 밖.

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `js/first-loop.js` (신규) | DOM·Three 의존 없는 순수 규칙: `welcomeOffer`, `isDevSession`, `topPriceLine`, `fertBlockedByWatering` |
| `tests/first-loop.test.mjs` (신규) | 위 모듈의 `node:test` 테스트 |
| `js/config.js` | `IS_DEV_SESSION` 상수 export |
| `js/metrics.js`, `js/logger.js`, `js/analytics.js` | dev 세션이면 기록 조기 반환 |
| `js/game.js` | 상점 품목·인벤토리 키·비료 적용·미끼·상인 방문 상태 머신·좌판 말풍선·상점 큐 |
| `index.html` | `#merchant-modal` 마크업/CSS/`ui.openMerchantModal`·`ui.anyModalOpen`, 가방·상점 하단·튜토리얼 순서·프롬프트 아이콘 |
| `js/i18n-en.js` | 영문 키 |
| `docs/GA4_GUIDE.md` | 이벤트 표·변경 이력 |
| `sql/tableau_export.sql` | `t3_tutorial_funnel` key 기준 전환 |

---

### Task 1: 순수 규칙 모듈 `first-loop.js` (TDD)

**Files:**
- Create: `js/first-loop.js`
- Create: `tests/first-loop.test.mjs`

**Interfaces:**
- Produces:
  - `welcomeOffer(inv)` → `{ item:'wood', qty:5, gain:30 } | { item:'fish', qty:1, gain:25 } | null` (목재 우선)
  - `isDevSession(search)` → boolean. `search`는 `location.search` 문자열. `house`·`coop`·`weather`·`spawn` 중 하나라도 있으면 true
  - `topPriceLine(rates, icons)` → `{ key, pct, text }`. `rates`는 `{crop:117,...}`(100=기본가), `icons`는 `{crop:'🥕',...}`. `text`는 `'🐟 오늘 비싸요 +17%'`
  - `fertBlockedByWatering(toolId, toolPage, soilWet)` → boolean. 물조리개를 들고(`toolId==='water' && toolPage!=='none'`) 흙이 말라 있으면(`!soilWet`) true = 비료 대신 물주기

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/first-loop.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { welcomeOffer, isDevSession, topPriceLine, fertBlockedByWatering } from '../js/first-loop.js';

test('welcomeOffer: 목재 5개면 30코인 제안', () => {
  assert.deepEqual(welcomeOffer({ wood: 5, fish: 0 }), { item: 'wood', qty: 5, gain: 30 });
});
test('welcomeOffer: 물고기 1마리면 25코인 제안', () => {
  assert.deepEqual(welcomeOffer({ wood: 2, fish: 1 }), { item: 'fish', qty: 1, gain: 25 });
});
test('welcomeOffer: 둘 다 있으면 목재 우선', () => {
  assert.equal(welcomeOffer({ wood: 9, fish: 3 }).item, 'wood');
});
test('welcomeOffer: 조건 미달이면 null', () => {
  assert.equal(welcomeOffer({ wood: 4, fish: 0 }), null);
  assert.equal(welcomeOffer({}), null);
});

test('isDevSession: dev 파라미터가 있으면 true', () => {
  assert.equal(isDevSession('?house=6'), true);
  assert.equal(isDevSession('?platform=toss&coop=1'), true);
  assert.equal(isDevSession('?weather=rain'), true);
  assert.equal(isDevSession('?spawn=3,4'), true);
});
test('isDevSession: 일반 진입은 false', () => {
  assert.equal(isDevSession(''), false);
  assert.equal(isDevSession('?platform=toss'), false);
  assert.equal(isDevSession('?lang=en'), false);
});

test('topPriceLine: 가장 비싼 품목과 문구', () => {
  const r = topPriceLine({ crop: 97, fish: 117, wood: 110 }, { crop: '🥕', fish: '🐟', wood: '🪵' });
  assert.deepEqual(r, { key: 'fish', pct: 17, text: '🐟 오늘 비싸요 +17%' });
});
test('topPriceLine: 전부 기본가 이하면 +0%', () => {
  const r = topPriceLine({ crop: 90, fish: 100 }, { crop: '🥕', fish: '🐟' });
  assert.equal(r.text, '🐟 오늘 비싸요 +0%');
});

test('fertBlockedByWatering: 물조리개 + 마른 흙이면 물주기 우선', () => {
  assert.equal(fertBlockedByWatering('water', 'farm', false), true);
});
test('fertBlockedByWatering: 흙이 젖었거나 다른 도구·맨손이면 비료 가능', () => {
  assert.equal(fertBlockedByWatering('water', 'farm', true), false);
  assert.equal(fertBlockedByWatering('hoe', 'farm', false), false);
  assert.equal(fertBlockedByWatering('water', 'none', false), false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../js/first-loop.js'`

- [ ] **Step 3: 최소 구현**

`js/first-loop.js`:
```js
// =============================================================
//  calm forest · 코인 첫 루프 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  ▶ 상인 환영 거래 제안 · dev 세션 판정 · 좌판 시세 말풍선 · 비료/물주기 우선순위
//  ▶ 테스트: node --test tests/   (docs/superpowers/specs/2026-09-05-coin-first-loop-design.md)
// =============================================================

// 환영 거래(1회 한정, 정가 약 3배) — 목재 5개=30🪙 우선, 없으면 물고기 1마리=25🪙
export const WELCOME_OFFERS = [
  { item: 'wood', qty: 5, gain: 30 },
  { item: 'fish', qty: 1, gain: 25 },
];
export function welcomeOffer(inv = {}) {
  return WELCOME_OFFERS.find(o => (inv[o.item] || 0) >= o.qty) || null;
}

// 개발용 URL 파라미터가 하나라도 있으면 "dev 세션" — 원장·세션·센서·GA4 기록을 남기지 않는다
export const DEV_PARAMS = ['house', 'coop', 'weather', 'spawn'];
export function isDevSession(search = '') {
  const q = new URLSearchParams(search);
  return DEV_PARAMS.some(k => q.has(k));
}

// 오늘 시세 최고 품목 → 좌판 말풍선 문구. rates: {key: %}(100=기본가), icons: {key: 이모지}
export function topPriceLine(rates, icons) {
  const keys = Object.keys(rates);
  const key = keys.reduce((a, b) => (rates[a] >= rates[b] ? a : b));
  const pct = Math.max(0, rates[key] - 100);
  return { key, pct, text: `${icons[key]} 오늘 비싸요 +${pct}%` };
}

// 💧물조리개를 들고 흙이 말라 있으면 비료보다 물주기가 우선(평소 물주기 동선을 뺏지 않는다)
export function fertBlockedByWatering(toolId, toolPage, soilWet) {
  return toolPage !== 'none' && toolId === 'water' && !soilWet;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/ && node --check js/first-loop.js`
Expected: 모든 테스트 PASS

- [ ] **Step 5: 커밋**

```bash
git add js/first-loop.js tests/first-loop.test.mjs
git commit -m "Feat: 🧪 코인 첫 루프 규칙 모듈 first-loop.js — 환영 거래·dev 세션 판정·시세 말풍선·비료 우선순위 + node 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: dev 파라미터 세션 로깅 가드

**Files:**
- Modify: `js/config.js` (상단 import + 파일 끝 export)
- Modify: `js/metrics.js:21-25` (`logEcon`), `js/metrics.js:59-70` (`flushSummary`)
- Modify: `js/logger.js:33-36` (`sampleFrame`)
- Modify: `js/analytics.js:80-92` (`trackEvent`)

**Interfaces:**
- Consumes: `isDevSession(search)` (Task 1)
- Produces: `export const IS_DEV_SESSION` in `js/config.js`

- [ ] **Step 1: config.js에 상수 추가**

`js/config.js` 상단(`const API_BASE = '';` 앞)에 import, 파일 맨 끝에 export:
```js
import { isDevSession } from './first-loop.js';
```
```js
// 🧪 개발용 URL 파라미터(?house= ?coop= ?weather= ?spawn=)로 들어온 세션 —
//    원장·세션 요약·센서 로그·GA4 를 모두 끈다(2026-08-31 자동 테스트가 원장 수입의 85%를 오염시킨 사고 재발 방지)
export const IS_DEV_SESSION = isDevSession(typeof location !== 'undefined' ? location.search : '');
if (IS_DEV_SESSION) console.log('[dev] 개발 파라미터 세션 — 원장/세션/센서/GA4 기록을 남기지 않습니다');
```

- [ ] **Step 2: metrics.js 가드**

`js/metrics.js` import 아래에 `import { IS_DEV_SESSION } from './config.js';` 추가. `logEcon` 첫 줄과 `flushSummary` 첫 줄에:
```js
export function logEcon(source, item, amount, balance) {
  if (IS_DEV_SESSION) return;                                 // 🧪 dev 세션 — 원장 기록 없음
  econBuffer.push({ source, item, currency: 'coins', amount, balance });
```
```js
function flushSummary(final = false) {
  if (IS_DEV_SESSION) return;                                 // 🧪 dev 세션 — 세션 요약 없음
  if (!snapshotFn) return;
```

- [ ] **Step 3: logger.js 가드**

`js/logger.js`에 `import { IS_DEV_SESSION } from './config.js';`(이미 `CONFIG`를 import 중이면 같은 줄에 합친다). `sampleFrame` 첫 줄:
```js
export function sampleFrame(getSnapshot) {
  if (IS_DEV_SESSION) return;                                 // 🧪 dev 세션 — 센서 로그 없음
  const now = performance.now();
```

- [ ] **Step 4: analytics.js 가드**

`js/analytics.js`에 `import { IS_DEV_SESSION } from './config.js';`. `trackEvent`:
```js
export function trackEvent(name, params = {}) {
  if (IS_DEV_SESSION) return;                                 // 🧪 dev 세션 — GA4·세션 카운터 없음
  const payload = { ...params, ts: Date.now(), platform: PLATFORM };
```
순환 import 확인: `config.js → first-loop.js`(순수)만 새로 생기고 `first-loop.js`는 아무것도 import하지 않으므로 순환 없음.

- [ ] **Step 5: 검증**

Run: `for f in js/*.js; do node --check "$f"; done && node --test tests/`
Expected: 오류 없음.
브라우저: 로컬 서버(`.claude/launch.json`의 `calm-forest`)로 `http://localhost:8000/?house=6` 접속 → 콘솔에 `[dev] 개발 파라미터 세션` 한 줄, 이후 `[GA4 폴백] event:` 로그가 전혀 없어야 한다. `http://localhost:8000/` 일반 접속에서는 기존처럼 이벤트 로그가 보인다.

- [ ] **Step 6: 커밋**

```bash
git add js/config.js js/metrics.js js/logger.js js/analytics.js
git commit -m "Fix: 🧪 dev 파라미터(?house= 등) 세션은 원장·세션·센서·GA4 기록 제외 — 자동 테스트가 실데이터를 오염시키던 문제

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 상점 신상품 2종 + 인벤토리 키 + 가방·상점 UI

**Files:**
- Modify: `js/game.js:416-418` (`SHOP_BUY` 맨 앞), `js/game.js:635` (초기 인벤토리), `js/game.js:8595` (`RES_LABEL`)
- Modify: `index.html:3125-3138` (`ITEM_META`, `BAG_CATS`), `index.html` `renderShop` 구매 탭 끝(하단 한 줄)
- Modify: `js/i18n-en.js`

**Interfaces:**
- Produces: 인벤토리 키 `fert`, `bait`(숫자). 상점 id `fert1`, `bait5`.

- [ ] **Step 1: SHOP_BUY 맨 앞에 2종 추가**

`js/game.js` `const SHOP_BUY = [` 바로 아래(주석 `// 소모품·재료 번들` 위):
```js
  // 🪙 코인 전용 소모품 — 재료로는 못 얻는 "시간·운"을 판다(첫 구매처, 20~25🪙)
  { id: 'fert1', name: '비료 1개',    ico: '🌱', coin: 20, give: { fert: 1 }, desc: '자라는 작물을 바로 수확 가능하게' },
  { id: 'bait5', name: '미끼 5회분',  ico: '🪱', coin: 25, give: { bait: 5 }, desc: '5번 동안 희귀 물고기 확률↑' },
```

- [ ] **Step 2: 초기 인벤토리·라벨**

`js/game.js:635` 인벤토리 객체에 `fert: 0, bait: 0` 추가(예: `glow: 0, fert: 0, bait: 0 }`).
`RES_LABEL`에 `fert: '🌱비료', bait: '🪱미끼'` 추가.
`buyShop`(`js/game.js:6303`)의 `giveReward(it.give, 'shop_buy_bundle', id)`는 키를 일반 순회하므로 수정 불필요. 구매 자체는 `buyShop`이 `logEcon('shop_buy', id, -it.coin, …)`로 남긴다 — 기존 동작 확인만.

- [ ] **Step 3: 가방 표시**

`index.html` `ITEM_META`에:
```js
      fert: { ico: '🌱', name: '비료' }, bait: { ico: '🪱', name: '미끼' },
```
`BAG_CATS`의 `'🌱 농사·낚시·닭장'` 항목 keys를 `['crop', 'fish', 'egg', 'fert', 'bait']`로.

- [ ] **Step 4: 상점 구매 탭 하단 "다음 목표"**

`index.html` `renderShop()`의 `else` 블록, `forEach` 뒤에:
```js
        const next = document.createElement('div');
        next.className = 'market-hint';
        next.textContent = '다음 목표: 🐔 닭장 60 · 🏡 넓은 집 80 · ✨ 정령 등불 60';
        box.appendChild(next);
```
(`market-hint` 클래스는 도감 모달에서 이미 쓰는 작은 안내 스타일.)

- [ ] **Step 5: i18n 키**

`js/i18n-en.js`의 `EN` 객체 끝에(마지막 `};` 앞):
```js
  // ── 🪙 코인 첫 루프(2026-09-05) ──
  '비료 1개': 'Fertilizer ×1',
  '미끼 5회분': 'Bait ×5',
  '자라는 작물을 바로 수확 가능하게': 'Ripens a growing crop instantly',
  '5번 동안 희귀 물고기 확률↑': 'Rare fish odds up for 5 casts',
  '비료': 'Fertilizer',
  '미끼': 'Bait',
  '🌱비료': '🌱Fertilizer',
  '🪱미끼': '🪱Bait',
  '다음 목표: 🐔 닭장 60 · 🏡 넓은 집 80 · ✨ 정령 등불 60': 'Next goals: 🐔 Coop 60 · 🏡 Bigger house 80 · ✨ Spirit lamp 60',
```

- [ ] **Step 6: 검증**

Run: `node --check js/game.js && node --check js/i18n-en.js && node scripts/i18n_check.mjs | grep -E "비료|미끼|다음 목표" || echo "i18n OK(빠짐 없음)"`
Expected: 새 문구가 빠짐 후보에 없음.
브라우저: 상점 좌판(9,0) 앞에서 Space → 🛍️ 사기 탭에 🌱 비료 1개 🪙20 · 🪱 미끼 5회분 🪙25가 맨 위, 하단에 "다음 목표…" 한 줄. 코인이 부족하면 `off` 스타일. 가방(🎒)에 🌱 비료 0 · 🪱 미끼 0 표시.

- [ ] **Step 7: 커밋**

```bash
git add js/game.js index.html js/i18n-en.js
git commit -m "Feat: 🛍️ 상점 신상품 🌱비료 20·🪱미끼 25 — 인벤토리 키·가방 표시·구매탭 '다음 목표' 한 줄

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: 🌱 비료 사용 (프롬프트 + 액션)

**Files:**
- Modify: `js/game.js` — `handleAction()`(`js/game.js:7975-8027`, 채집 블록 앞), 근접 프롬프트 체인(`js/game.js:6906-6920`), `tryWater` 위에 `fertTarget`/`applyFert` 신설
- Modify: `index.html:1773-1782` (`setDoorPrompt` 아이콘 맵)
- Modify: `js/i18n-en.js`

**Interfaces:**
- Consumes: `fertBlockedByWatering(toolId, toolPage, soilWet)` (Task 1), 인벤토리 `fert` (Task 3)
- Produces: `fertTarget()` → plot|null, `applyFert(plot)`

- [ ] **Step 1: import**

`js/game.js` 상단 import 묶음(`import { t, LANG } from './i18n.js';` 아래)에:
```js
import { welcomeOffer, topPriceLine, fertBlockedByWatering } from './first-loop.js';   // 🪙 코인 첫 루프 규칙
```
(`welcomeOffer`·`topPriceLine`은 Task 7·8에서 사용.)

- [ ] **Step 2: fertTarget / applyFert**

`js/game.js` `tryWater` 함수 바로 위에:
```js
// ── 🌱 비료 — 자라는 밭 한 칸을 즉시 수확 가능 상태로(코인 전용 소모품, 상점 20🪙) ──
function fertTarget() {
  if (indoor || atMine || atCafe || (gameState.inventory.fert || 0) <= 0) return null;
  return plots.find(p => p.state === 'growing' && dist2D(p.group.position, player.position) < 1.8) || null;
}
function applyFert(plot) {
  gameState.inventory.fert -= 1;
  plot.growth = 1; plot.wetUntil = clock.elapsedTime + WET_TIME; plot.watered = true;
  doPlayerAction(plot.x, plot.z);
  refreshCropStage(plot);       // growth 1 → 단계 2 = mature(수확 토스트는 refreshCropStage 가 띄움)
  updatePlotVisual(plot);
  spawnSparkle(plot.x, 0.6, plot.z, 18); Sound.harvest();
  ui.toast?.('🌱 비료를 줬어요! 바로 수확할 수 있어요');
  trackEvent('use_fert', { left: gameState.inventory.fert });   // [GA4] 소모품 사용
  refreshInventoryUI();
  lastDoorPrompt = null;        // 비료가 떨어졌으면 프롬프트를 바로 내린다
}
```

- [ ] **Step 3: handleAction 분기**

`handleAction()`에서 `// 🍄 채집 — ...` 주석 줄 바로 앞에:
```js
  // 🌱 비료 — 자라는 밭 앞 + 비료 보유. 💧물조리개를 들고 흙이 말라 있으면 평소대로 물주기가 우선
  const fp = fertTarget();
  if (fp && !fertBlockedByWatering(TOOLS[currentTool].id, toolPage, clock.elapsedTime < (fp.wetUntil || 0))) return applyFert(fp);
```

- [ ] **Step 4: 근접 프롬프트**

`js/game.js:6918` 부근, `if (prompt !== lastDoorPrompt) { … }` 줄 **바로 앞**에:
```js
  if (!prompt && fertTarget()) prompt = '🌱 비료 주기';   // 다른 시설 프롬프트가 없을 때만
```
주의: 이 함수 안에서 `prompt`가 `let`으로 선언돼 있는지 확인(문·텃밭 게이트 프롬프트에 쓰는 변수). 선언은 위쪽 `nd` 계산부에 있다.

- [ ] **Step 5: 액션 버튼 아이콘**

`index.html` `setDoorPrompt`의 아이콘 삼항식 맨 앞에 `t.includes('비료') ? '🌱' :` 추가:
```js
        doorIcon = t.includes('비료') ? '🌱' : t.includes('주문판') ? '📋'
```

- [ ] **Step 6: i18n**

`js/i18n-en.js`에:
```js
  '🌱 비료 주기': '🌱 Use fertilizer',
  '🌱 비료를 줬어요! 바로 수확할 수 있어요': '🌱 Fertilized! You can harvest right away',
```

- [ ] **Step 7: 검증**

Run: `node --check js/game.js && node --test tests/`
브라우저(최소 회귀 검증): 밭 옆에서 비료 0개일 때 프롬프트가 **뜨지 않고**, 물조리개 동작이 그대로인지 확인. 비료 보유 시나리오는 Task 7 통합 검증에서.
Expected: 기존 물주기 회귀 없음.

- [ ] **Step 8: 커밋**

```bash
git add js/game.js index.html js/i18n-en.js
git commit -m "Feat: 🌱 비료 사용 — 자라는 밭 앞 '비료 주기' 프롬프트(액션 버튼 🌱) + 즉시 성숙, 물조리개·마른 흙이면 물주기 우선

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 🪱 미끼 자동 소모

**Files:**
- Modify: `js/game.js:461` (상태 변수), `tryFish`(`js/game.js:8033-8051`), `catchFish`(`js/game.js:8053-8056`), `resetFishing`(`js/game.js:8073-8075`)
- Modify: `js/i18n-en.js`

**Interfaces:**
- Consumes: 인벤토리 `bait` (Task 3)

- [ ] **Step 1: 상태 변수**

`js/game.js:461` `let fishState = 'idle';` 아래:
```js
let baitActive = false;   // 🪱 이번 캐스트에 미끼 사용 중(회당 소모, 희귀 확률 이중 굴림)
```

- [ ] **Step 2: 캐스팅 시 소모**

`tryFish()`에서 `ui.setFishPrompt?.('🎣 던졌어요… 물 때까지 기다려요');` 줄을 다음으로 교체:
```js
  if ((gameState.inventory.bait || 0) > 0) {                     // 🪱 미끼 — 캐스트마다 1개 자동 소모
    gameState.inventory.bait -= 1; baitActive = true; refreshInventoryUI();
    trackEvent('use_bait', { left: gameState.inventory.bait });   // [GA4] 소모품 사용
    ui.setFishPrompt?.(`🎣 던졌어요… 물 때까지 기다려요 · 🪱 미끼 (남은 ${gameState.inventory.bait}회)`);
  } else {
    ui.setFishPrompt?.('🎣 던졌어요… 물 때까지 기다려요');
  }
```

- [ ] **Step 3: 판정·리셋**

`catchFish()`의 `if (buffOn('luck') || RAIN_DAY) roll = Math.min(roll, Math.random());` → `if (buffOn('luck') || RAIN_DAY || baitActive) roll = Math.min(roll, Math.random());`
`resetFishing()`을:
```js
function resetFishing() {
  fishState = 'idle'; baitActive = false; if (bobber) bobber.visible = false; ui.setFishPrompt?.(null);
}
```
낚아채기 실패 경로도 `resetFishing`을 거치는지 `grep -n "fishing_miss" js/game.js`로 확인하고, 아니면 그 자리에도 `baitActive = false;`를 넣는다.

- [ ] **Step 4: i18n**

```js
  '🎣 던졌어요… 물 때까지 기다려요 · 🪱 미끼 (남은 {0}회)': '🎣 Cast… wait for a bite · 🪱 Bait ({0} left)',
```

- [ ] **Step 5: 검증**

Run: `node --check js/game.js`
브라우저: 미끼 0개면 기존 프롬프트 그대로. 미끼 보유 시나리오는 Task 11 통합 검증에서.

- [ ] **Step 6: 커밋**

```bash
git add js/game.js js/i18n-en.js
git commit -m "Feat: 🪱 미끼 — 캐스팅마다 자동 소모·남은 횟수 표시, 희귀 물고기 이중 굴림

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 상인 모달 UI (`index.html`)

**Files:**
- Modify: `index.html:226-227` (모달 표시 규칙에 `#merchant-modal` 추가), `index.html:738` 옆(CSS), `index.html:1339-1347` 아래에 마크업, `ui` 객체(`showHintModal` 옆), `openShop` (`index.html:1801`)
- Modify: `js/i18n-en.js`

**Interfaces:**
- Produces:
  - `ui.openMerchantModal({ title, body, primary:{label,onClick}, secondary:{label,onClick}|null })`
  - `ui.closeMerchantModal()`
  - `ui.anyModalOpen()` → boolean
  - `ui.openShop(tab = 'sell')`

- [ ] **Step 1: CSS**

`index.html:226-227`의 두 선택자 목록에 `#merchant-modal`을 추가:
```css
  #tutorial-modal, #seed-modal, #hint-modal, #photo-modal, #char-modal, #merchant-modal { position: fixed; inset: 0; z-index: 32; display: none; place-items: center; background: rgba(20,40,30,0.55); }
  #tutorial-modal.show, #seed-modal.show, #hint-modal.show, #photo-modal.show, #char-modal.show, #merchant-modal.show { display: grid; }
```
`#hint-modal { z-index: 45; }` 줄 옆에:
```css
  #merchant-modal { z-index: 45; }
  #merchant-modal .tut-card { width: min(400px, 92vw); }
  .merchant-actions { display: flex; flex-direction: column; gap: 10px; }
  .merchant-actions button { border: none; border-radius: 14px; min-height: 48px; padding: 12px 18px; font-weight: 700; font-size: 15px; cursor: pointer; box-shadow: var(--shadow); }
  #merchant-primary { background: var(--mint); color: var(--ink); }
  #merchant-secondary { background: #eef2ee; color: var(--ink); }
```

- [ ] **Step 2: 마크업**

`#hint-modal` 블록 바로 아래:
```html
  <!-- 🧙 상인 방문 모달 — 환영 거래(1회) → 좌판 안내 -->
  <div id="merchant-modal">
    <div class="tut-card">
      <div class="tut-emoji">🧙</div>
      <h2 id="merchant-title">방랑 상인</h2>
      <p id="merchant-body" style="font-size:14px; line-height:1.6; opacity:.85; margin:0 0 18px; white-space:pre-line;"></p>
      <div class="merchant-actions">
        <button id="merchant-primary"></button>
        <button id="merchant-secondary"></button>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: ui 메서드**

`ui` 객체의 `showHintModal` 바로 아래:
```js
      // 🧙 상인 모달 — primary/secondary 버튼 콜백을 매번 갈아끼운다(중복 리스너 방지: onclick 프로퍼티)
      openMerchantModal({ title, body, primary, secondary }) {
        $('merchant-title').textContent = title || '방랑 상인';
        $('merchant-body').textContent = body || '';
        const p = $('merchant-primary'), s = $('merchant-secondary');
        p.textContent = primary.label; p.onclick = () => primary.onClick();
        s.hidden = !secondary;
        if (secondary) { s.textContent = secondary.label; s.onclick = () => secondary.onClick(); }
        Input.setAnalog(0, 0);
        $('merchant-modal').classList.add('show');
      },
      closeMerchantModal() { $('merchant-modal').classList.remove('show'); },
      // 어떤 모달/메뉴든 열려 있으면 true — 상인 방문 같은 강제 이벤트가 겹쳐 뜨지 않게
      anyModalOpen() {
        return !!document.querySelector('#tutorial-modal.show, #seed-modal.show, #hint-modal.show, #photo-modal.show, #char-modal.show, #npc-modal.show, #merchant-modal.show')
          || document.body.classList.contains('menu-open') || document.body.classList.contains('mg-open');
      },
```
`openShop`을 탭 인자 지원으로:
```js
      openShop(tab = 'sell') { showShopTab(tab); Input.setAnalog(0, 0); $('shop-menu').classList.add('show'); document.body.classList.add('menu-open'); },
```
(`ui.openShop?.()` 기존 호출은 기본값으로 그대로 동작.)

- [ ] **Step 4: i18n**

```js
  '방랑 상인': 'Wandering Merchant',
```
(이미 있으면 생략 — `grep -n "'방랑 상인'" js/i18n-en.js`.)

- [ ] **Step 5: 검증**

`index.html`을 로컬 서버로 열어 콘솔 에러가 없고 상점(Space)이 기본 '팔기' 탭으로 열리는지 확인. 모달 표시·버튼 동작은 Task 7 통합 시나리오에서 확인.

- [ ] **Step 6: 커밋**

```bash
git add index.html js/i18n-en.js
git commit -m "Ux: 🧙 상인 모달 컴포넌트 — 힌트 카드 톤, 세로 스택 버튼 48px, anyModalOpen·openShop(tab)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: 🧙 상인 방문 이벤트 (상태 머신 + 환영 거래 + 좌판 큐)

**Files:**
- Modify: `js/game.js` — `updateNPC`(`js/game.js:8670-8683`), 새 함수 블록(`wanderNPC` 아래), 프레임 루프(`js/game.js:7132` `updateNPC(dt, t);` 옆)
- Modify: `js/i18n-en.js`

**Interfaces:**
- Consumes: `welcomeOffer(inv)` (Task 1), `ui.openMerchantModal/closeMerchantModal/anyModalOpen/openShop(tab)` (Task 6)
- Produces: `updateMerchantVisit(dt)`, `showShopCue(sec)`, `updateShopCue(t)`, `gameState.hintsSeen.merchantVisit`

- [ ] **Step 1: 상태와 이동 헬퍼**

`wanderNPC` 함수 바로 아래에 추가:
```js
// ── 🧙 상인 방문 이벤트(1회, 강제) — 첫 판매 경험을 상인이 직접 가져다준다 ──
//    발동: 마을 안 + 목재5 또는 물고기1 + 모달 없음 + hintsSeen.merchantVisit 없음
//    walk(플레이어에게 걸어옴, 12초 상한) → talk(모달) → return(좌판 홈으로)
let merchantVisit = null;   // null | { state:'walk'|'talk'|'return', t, offer }
function merchantObj() { return npcObjs.find(o => o.def.id === 'merchant') || null; }

// NPC 를 target 쪽으로 speed 만큼 전진(막히면 좌우 45° 우회). 남은 거리 반환
function stepNpcToward(o, target, speed, dt) {
  const dx = target.x - o.group.position.x, dz = target.z - o.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return d;
  const ang = Math.atan2(dx, dz);
  for (const off of [0, Math.PI / 4, -Math.PI / 4]) {
    const a = ang + off;
    const nx = o.group.position.x + Math.sin(a) * speed * dt, nz = o.group.position.z + Math.cos(a) * speed * dt;
    if (npcBlocked(nx, nz)) continue;
    o.group.position.x = nx; o.group.position.z = nz;
    break;
  }
  o.group.rotation.y = lerpAngle(o.group.rotation.y, ang, 0.2);
  return Math.hypot(target.x - o.group.position.x, target.z - o.group.position.z);
}

function updateMerchantVisit(dt) {
  if (mode !== 'play') return;
  const m = merchantObj(); if (!m) return;
  if (!merchantVisit) {
    if (gameState.hintsSeen.merchantVisit) return;
    if (indoor || atFarm || atMine || atCafe || atRiver) return;
    if (ui.anyModalOpen?.()) return;
    const offer = welcomeOffer(gameState.inventory);
    if (!offer) return;
    gameState.hintsSeen.merchantVisit = true;            // 즉시 소진(세이브에 남아 재발동 없음)
    merchantVisit = { state: 'walk', t: 0, offer };
    return;
  }
  const v = merchantVisit; v.t += dt;
  if (v.state === 'walk') {
    const d = stepNpcToward(m, player.position, 2.0, dt);
    if (d <= 1.6 || v.t > 12) { v.state = 'talk'; openMerchantOffer(v.offer); }
  } else if (v.state === 'talk') {
    const dx = player.position.x - m.group.position.x, dz = player.position.z - m.group.position.z;
    m.group.rotation.y = lerpAngle(m.group.rotation.y, Math.atan2(dx, dz), 0.2);   // 플레이어 바라보기
  } else if (v.state === 'return') {
    const d = stepNpcToward(m, m.home, 2.0, dt);
    if (d < 0.3 || v.t > 20) merchantVisit = null;      // 홈 도착 → 평소 배회로 복귀
  }
}

function openMerchantOffer(offer) {
  const wood = offer.item === 'wood';
  ui.openMerchantModal?.({
    title: '방랑 상인',
    body: wood ? '오, 그 🪵 목재 좋구먼! 처음 보는 얼굴이니 후하게 쳐주지.' : '오, 그 🐟 물고기 싱싱하구먼! 처음 보는 얼굴이니 후하게 쳐주지.',
    primary: { label: wood ? '🪵 목재 5개 팔기 (+30🪙)' : '🐟 물고기 팔기 (+25🪙)', onClick: () => merchantWelcomeSell(offer) },
    secondary: { label: '다음에', onClick: () => merchantDismiss() },
  });
}

function merchantWelcomeSell(offer) {
  if ((gameState.inventory[offer.item] || 0) < offer.qty) { merchantDismiss(); return; }   // 그새 써버렸으면 조용히 종료
  gameState.inventory[offer.item] -= offer.qty;
  gameState.inventory.coins = (gameState.inventory.coins || 0) + offer.gain;
  refreshInventoryUI(); Sound.complete();
  spawnFloatText(player.position.x, 1.9, player.position.z, `+${offer.gain}🪙`, '#2fa564');
  questEvent('sell', offer.qty);                          // 상인 퀘스트 '장사의 신' 진행
  ui.act?.('sell');                                       // 튜토리얼 ④ 팔기
  trackEvent('shop_sell', { item: offer.item, qty: offer.qty, gain: offer.gain, rate: 300, via: 'merchant' }); // [GA4] 기존 판매 이벤트 + via
  trackEvent('merchant_visit', { item: offer.item, gain: offer.gain });                                        // [GA4] 방문 퍼널
  logEcon('shop_sell', offer.item + '|welcome', offer.gain, gameState.inventory.coins);                        // [원장] 출처는 shop_sell, 품목 접미사로 구분
  ui.openMerchantModal?.({
    title: '방랑 상인',
    body: '더 팔 거면 동쪽 좌판으로 오게. 새로 들어온 🌱비료랑 🪱미끼도 보고 가고.',
    primary: { label: '🛒 좌판 구경', onClick: () => { merchantDismiss(); ui.openShop?.('buy'); } },
    secondary: { label: '다음에', onClick: () => merchantDismiss() },
  });
}

function merchantDismiss() {
  ui.closeMerchantModal?.();
  if (merchantVisit) { merchantVisit.state = 'return'; merchantVisit.t = 0; }
  showShopCue(60);
  firstHintBanner('merchantShop', '🛒', '상점 좌판', '동쪽 좌판에서 언제든 팔 수 있어요');
}

// 좌판 위 🛒 안내 스프라이트 — sec 초 동안 둥실거리며 위치를 알려준다
let shopCue = null, shopCueUntil = 0;
function showShopCue(sec) {
  if (!shopCue) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'); c.font = '96px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🛒', 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    shopCue = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    shopCue.scale.set(1.1, 1.1, 1); shopCue.position.set(SHOP.x, 3.2, SHOP.z);
    scene.add(shopCue);
  }
  shopCue.visible = true; shopCueUntil = clock.elapsedTime + sec;
}
function updateShopCue(t) {
  if (!shopCue || !shopCue.visible) return;
  if (clock.elapsedTime > shopCueUntil) { shopCue.visible = false; return; }
  shopCue.position.y = 3.2 + Math.sin(t * 2.4) * 0.15;
}
```

- [ ] **Step 2: 배회 루프에서 방문 중 상인 제외**

`updateNPC(dt, t)`의 `for` 본문에서:
```js
    if (merchantVisit && o.def.id === 'merchant') {
      // 방문 이벤트 중엔 updateMerchantVisit 가 이동·시선을 담당
    } else if (mode === 'play' && nearNPC === o) {
      const dx = player.position.x - o.group.position.x, dz = player.position.z - o.group.position.z;
      o.group.rotation.y = lerpAngle(o.group.rotation.y, Math.atan2(dx, dz), 0.2); // 플레이어 바라보기
    } else {
      wanderNPC(o, dt);                                                            // 홈 주변 배회
    }
```

- [ ] **Step 3: 프레임 루프 연결**

`js/game.js:7132` `updateNPC(dt, t);` 바로 아래:
```js
  updateMerchantVisit(dt);   // 🧙 상인 방문 이벤트(1회)
  updateShopCue(t);          // 🛒 좌판 안내 스프라이트
```

- [ ] **Step 4: i18n**

```js
  '오, 그 🪵 목재 좋구먼! 처음 보는 얼굴이니 후하게 쳐주지.': "Oh, fine 🪵 lumber! New face, eh? I'll pay you well.",
  '오, 그 🐟 물고기 싱싱하구먼! 처음 보는 얼굴이니 후하게 쳐주지.': "Oh, fresh 🐟 fish! New face, eh? I'll pay you well.",
  '🪵 목재 5개 팔기 (+30🪙)': '🪵 Sell 5 wood (+30🪙)',
  '🐟 물고기 팔기 (+25🪙)': '🐟 Sell a fish (+25🪙)',
  '더 팔 거면 동쪽 좌판으로 오게. 새로 들어온 🌱비료랑 🪱미끼도 보고 가고.': 'Come to my stall in the east to sell more. Have a look at the new 🌱fertilizer and 🪱bait too.',
  '🛒 좌판 구경': '🛒 Browse the stall',
  '다음에': 'Later',
  '상점 좌판': 'Market stall',
  '동쪽 좌판에서 언제든 팔 수 있어요': 'You can sell anytime at the stall in the east',
```

- [ ] **Step 5: 통합 검증(데스크톱)**

Run: `for f in js/*.js; do node --check "$f"; done && node --test tests/`
브라우저(시크릿 창 = 새 게스트, `http://localhost:8000/`): 캐릭터 선택 → 튜토리얼 건너뛰기 → 🪓로 나무 벌목 5회 → 상인이 걸어와 모달 "오, 그 🪵 목재…" → [🪵 목재 5개 팔기] → 코인 +30, 두 번째 모달 → [🛒 좌판 구경] → 상점 사기 탭 → 🌱 비료 구매(코인 10 남음) → 밭에서 씨앗 심고 물 1회 → 액션 버튼 🌱 "비료 주기" → 즉시 성숙 토스트 → 🪱 미끼는 코인 부족이라 `off` 표시. 콘솔에 `[GA4 폴백] event: shop_sell {…via:'merchant'}`, `merchant_visit`, `econ_tx {source:'shop_sell', item:'wood|welcome', amount:30}`, `shop_buy`, `use_fert`.
새로고침 후 상인이 다시 오지 않아야 한다(세이브에 `hintsSeen.merchantVisit`).

- [ ] **Step 6: 커밋**

```bash
git add js/game.js js/i18n-en.js
git commit -m "Feat: 🧙 상인 방문 이벤트 — 목재5/물고기1 첫 획득 시 상인이 찾아와 환영가 매입(1회) → 좌판 구매탭 연결 + 🛒 좌판 큐 60초

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: 좌판 활성화 — 상인 상주 + 시세 말풍선

**Files:**
- Modify: `js/game.js:491` (상인 `pos`, `roam` 추가), `wanderNPC`(`js/game.js:8691-8700` 반경), `spawnShop`(`js/game.js:6214-6230`)
- Modify: `js/i18n-en.js`

**Interfaces:**
- Consumes: `topPriceLine(rates, icons)` (Task 1), `priceRate(k)`, `SELL_PRICE`, `SELL_ICO_G`, `roundRect(c, x, y, w, h, r)`(`js/game.js:8645`)

- [ ] **Step 1: 상인 홈 이동·배회 반경**

`js/game.js:491` 상인 정의를:
```js
    // 좌판 바로 뒤(북쪽) 상주 — 좌판 장애물 반경 1.6 + NPC 여유 0.35 = 1.95 밖이어야 npcBlocked 에 안 걸린다
    id: 'merchant', name: '방랑 상인', emoji: '🧙', color: 0xc9a8ff, hat: 0x8a5cd0, pos: [9, 0, -2.1], roam: 0.6,
```
`wanderNPC`의 `const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6;` → `const a = Math.random() * Math.PI * 2, r = Math.random() * (o.def.roam ?? 1.6);`

- [ ] **Step 2: 좌판 말풍선**

`spawnShop()`의 `scene.add(g);` 앞에:
```js
  // 💬 오늘 시세 최고 품목 말풍선 — 멀리서도 "여기서 판다"가 읽히게(자정 시세 갱신은 새로고침 시 반영)
  const rates = {}; for (const k in SELL_PRICE) rates[k] = Math.round(priceRate(k) * 100);
  const top = topPriceLine(rates, SELL_ICO_G);
  const bcv = document.createElement('canvas'); bcv.width = 512; bcv.height = 160;
  const bc = bcv.getContext('2d');
  bc.fillStyle = '#f5efe0'; roundRect(bc, 12, 12, 488, 116, 30); bc.fill();
  bc.beginPath(); bc.moveTo(236, 126); bc.lineTo(276, 126); bc.lineTo(256, 152); bc.closePath(); bc.fill();   // 꼬리
  bc.fillStyle = '#2fa564'; bc.textAlign = 'center'; bc.font = 'bold 52px sans-serif';
  bc.fillText(t(top.text), 256, 88);
  const btex = new THREE.CanvasTexture(bcv); btex.minFilter = THREE.LinearFilter; btex.magFilter = THREE.LinearFilter; btex.generateMipmaps = false;
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: btex, transparent: true, depthWrite: false }));
  bubble.scale.set(2.4, 0.75, 1); bubble.position.set(0, 2.55, 0.2); g.add(bubble);
```
`t(top.text)`는 조립된 문자열(`'🐟 오늘 비싸요 +17%'`)을 넘긴다. `i18n.js`는 패턴 키를 정규식으로 매칭하므로 사전에 `'{0} 오늘 비싸요 +{1}%'` 패턴을 두면 번역된다.

- [ ] **Step 3: i18n**

```js
  '{0} 오늘 비싸요 +{1}%': '{0} Best price today +{1}%',
```

- [ ] **Step 4: 검증**

Run: `node --check js/game.js && node --test tests/`
브라우저: 상인이 좌판 뒤에 서서 반경 0.6 안에서만 서성이고, 좌판 차양 위에 크림색 말풍선 "🐟 오늘 비싸요 +N%"가 보인다. 말풍선 품목이 상점 팔기 탭 배너의 "비싸요" 품목과 같다. 언어를 영어로 바꾸면 "Best price today"로 번역.

- [ ] **Step 5: 커밋**

```bash
git add js/game.js js/i18n-en.js
git commit -m "Ux: 🛒 좌판 활성화 — 상인이 좌판 뒤에 상주(배회 0.6) + 오늘 시세 최고 품목 말풍선

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: 튜토리얼 순서 — 벌목 직후 팔기

**Files:**
- Modify: `index.html:1984-2010` (`TUT_STEPS`)
- Modify: `js/i18n-en.js`

- [ ] **Step 1: 순서·문구**

`TUT_STEPS` 배열에서 `sell` 항목을 `chop` 바로 다음으로 옮기고 문구를 교체. `market` 항목은 `harvest` 다음에 둔다. 결과 순서: move, toolpage, chop, sell, till, seed, water, harvest, market, quest, mine, carve, dex, fish, build, enter, decor.
```js
      { key: 'sell',    text: `④ 🛒 찾아온 상인이나 동쪽 좌판에 목재를 팔아 첫 코인을 벌어요 (${A})` },
```
앞 번호(①~⑰)는 `renderCoach()`가 인덱스로 다시 찍으므로(`index.html:2019-2020`) 기능상 무관하지만, 읽기 쉽게 각 항목의 번호 문자를 실제 순서대로 맞춘다(till ⑤ … decor ⑰).

- [ ] **Step 2: i18n**

기존 sell 키(`grep -n "좌판에서 수확물" js/i18n-en.js`로 찾은 줄)를 새 문구 키로 교체. 다른 단계 키가 번호 문자 포함/미포함 어느 관례인지 `grep -n "마을을 걸어보세요" js/i18n-en.js`로 확인해 같은 형식으로:
```js
  '④ 🛒 찾아온 상인이나 동쪽 좌판에 목재를 팔아 첫 코인을 벌어요 ({0})': '④ 🛒 Sell wood to the visiting merchant or at the east stall to earn your first coins ({0})',
```

- [ ] **Step 3: 검증**

브라우저(시크릿 창): 튜토리얼 시작 → ③ 벌목 후 코치 문구가 ④ 팔기로 넘어가고, 상인 거래(또는 좌판 판매) 직후 ⑤ 밭 갈기로 진행. 콘솔 `tutorial_step {step:4, key:'sell'}`.

- [ ] **Step 4: 커밋**

```bash
git add index.html js/i18n-en.js
git commit -m "Ux: 🎓 튜토리얼 ④ 팔기를 벌목 직후로 — 첫 코인을 3분 안에

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: 계측 문서 + Tableau 튜토리얼 퍼널 key 기준 전환

**Files:**
- Modify: `docs/GA4_GUIDE.md:50` (`shop_sell` 행), 표 끝(`badge_earn` 행 아래)에 3행 추가, 문서 끝에 변경 이력
- Modify: `sql/tableau_export.sql:91-113` (`t3_tutorial_funnel`)

- [ ] **Step 1: GA4 가이드**

`shop_sell` 행의 판매 매개변수에 `, via('merchant'=상인 환영 거래, 그 외 없음)` 추가. `badge_earn` 행 아래에:
```markdown
| `merchant_visit` | 🧙 상인 방문 환영 거래 성사(1회) | `item`(wood/fish), `gain` |
| `use_fert` | 🌱 비료 사용 | `left`(남은 개수) |
| `use_bait` | 🪱 미끼 소모(캐스팅) | `left`(남은 횟수) |
```
문서 끝에:
```markdown
## 6. 변경 이력
- 2026-09-05 — 🪙 코인 첫 루프(상인 방문·비료/미끼) 계측 추가. 원장 출처는 `shop_sell` + 품목 `|welcome`. dev 파라미터(`?house=` 등) 세션은 모든 기록 제외. 배포일은 배포 후 여기에 기입 — 초반 세션 이동 분포가 바뀌므로 이탈 모델 전후 세그먼트 구분에 사용.
```

- [ ] **Step 2: t3 쿼리**

`-- @tab: t3_tutorial_funnel` 다음 줄부터 세미콜론까지를 교체:
```sql
with s as (
  select
    (select value.string_value from unnest(event_params) where key = 'key')  as step_key,
    user_pseudo_id
  from `calm-forest.analytics_547127440.events_*`
  where event_name = 'tutorial_step'
)
select
  case step_key
    when 'move' then 1 when 'toolpage' then 2 when 'chop' then 3 when 'sell' then 4
    when 'till' then 5 when 'seed' then 6 when 'water' then 7 when 'harvest' then 8
    when 'market' then 9 when 'quest' then 10 when 'talk' then 10 when 'mine' then 11
    when 'carve' then 12 when 'dex' then 13 when 'fish' then 14 when 'build' then 15
    when 'enter' then 16 when 'decor' then 17 else 99 end as ord,   -- 2026-09-05 순서(개편 전후 혼재해도 key 로 합침)
  step_key,
  count(distinct user_pseudo_id) as devices,
  count(*)                       as events
from s
where step_key is not null
group by ord, step_key
order by ord, step_key;
```
주석 블록(`-- A3. …`)의 "step 기준으로 합치고" 설명을 "key 기준(2026-09-05 sell 단계 이동으로 번호가 바뀌어 key 로 전환)"으로 고친다.

- [ ] **Step 3: 검증**

BigQuery MCP `execute_sql`로 위 쿼리를 `dry_run: true`로 문법 검사 후 실행해 결과가 `ord` 오름차순, 20행 이내인지 확인.

- [ ] **Step 4: 커밋**

```bash
git add docs/GA4_GUIDE.md sql/tableau_export.sql
git commit -m "Docs: 📊 GA4 이벤트 3종(merchant_visit·use_fert·use_bait)·via 매개변수 + Tableau 튜토리얼 퍼널 key 기준 전환

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 5: Airflow VM 반영(사용자 확인 후)**

사용자에게 실행 여부를 묻고 승인되면:
```bash
scp sql/tableau_export.sql oracle-calmforest:/opt/airflow/dags/sql/
```
다음 04:00 DAG 실행 후 시트 탭 `t3_tutorial_funnel`에 `ord` 컬럼이 생기는지 확인. Tableau Public 워크북이 `step` 필드를 참조하면 `ord`로 바꿔야 한다(스펙 밖, 사용자에게 알림).

---

### Task 11: 통합 검증 — 데스크톱·모바일·토스

**Files:** 없음(검증만). 문제가 나오면 해당 Task 파일을 고치고 `Fix:` 커밋.

- [ ] **Step 1: 정적 검사**

Run: `for f in js/*.js; do node --check "$f"; done && node --test tests/ && node scripts/i18n_check.mjs | grep -E "비료|미끼|상인|좌판|오늘 비싸요" || echo "i18n OK"`

- [ ] **Step 2: 데스크톱 전체 시나리오**

시크릿 창 `http://localhost:8000/`: Task 7 Step 5 시나리오 + 미끼까지. 코인 마련: 상인 거래 30 + 좌판에서 목재 추가 판매(2🪙/개)로 45 이상 → 비료 20 + 미끼 25 구매. 호수에서 캐스팅 → 프롬프트 "🪱 미끼 (남은 4회)" → 5회 뒤 프롬프트에서 미끼 표기 사라짐. 스크린샷 1장(상인 모달) 저장.

- [ ] **Step 3: 모바일 실측**

브라우저 도구 `resize_window` preset `mobile`(375×812)로 새로고침: 상인 모달이 하단 컨트롤과 겹치지 않고 버튼 2개가 세로 스택으로 48px 이상, 액션 버튼이 밭 앞에서 🌱로 바뀌고 탭하면 비료 적용, 상점 사기 탭이 스크롤 안에서 "다음 목표" 줄까지 보임. 스크린샷 2장(모달·상점).

- [ ] **Step 4: 토스 뷰**

`http://localhost:8000/?platform=toss`(모바일 프리셋 유지): `body.platform-toss` 상태에서 모달이 중앙에 뜨고 우상단 52px 예약 영역과 겹치지 않음. 새 게스트로 벌목 5회 시 이벤트 발동. 스크린샷 1장. (`platform`은 dev 파라미터가 아니므로 로깅은 유지된다.)

- [ ] **Step 5: 원장 확인**

Supabase MCP `execute_sql`:
```sql
select source, item, amount, balance, created_at from public.econ_logs
where created_at > now() - interval '1 hour' order by created_at desc limit 20;
```
`shop_sell / wood|welcome / 30`, `shop_buy / fert1 / -20`, `shop_buy / bait5 / -25`가 보여야 한다. `?house=6`으로 한 번 더 진입해 벌목·판매를 해도 새 행이 생기지 않는다.

- [ ] **Step 6: 마무리**

`git status`가 깨끗하면 `git log --oneline -12`로 커밋(스펙·계획 포함)을 확인하고 사용자에게 스크린샷 4장과 함께 보고. `main` 머지·`npx wrangler deploy`·토스 번들은 사용자 지시 후.
