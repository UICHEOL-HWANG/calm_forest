# 🎃 할로윈 프리미엄 한정 판매 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 할로윈 한정 프리미엄 상품 10종(자국 2·전신 스킨 4·도구 세트 2·망토 2)을 기간 한정(날짜 창)으로 판매할 수 있게 만든다. 판매 시작은 Paddle 승인 후.

**Architecture:** 카탈로그 항목에 `sale: 'halloween'` 키만 두고, 날짜는 `js/shop/sale-window.js` 의 `SALE_WINDOWS` 한 곳에 둔다. `premiumRowMode` 가 기간 밖의 안 산 사람에게 `hidden` 을 돌려주고 산 사람은 늘 `owned`. 상품 외형은 기존 슬롯별 구조(`trail.js`·`skin.js`·`tool-skins.js`·`art.js`)에 새 파일로 확장하고, 시안(`sims/halloween-*-sim.html`)의 조형 코드를 이식한다. 결제 후 지급은 기존 웹훅·원장 경로를 그대로 쓴다(기간 검사 없음).

**Tech Stack:** Vanilla ES modules · Three.js 0.160(CDN, node 테스트에선 import 불가) · `node --test` · Paddle(웹 전용) · Cloudflare Workers.

**Spec:** `docs/superpowers/specs/2026-10-06-halloween-premium-design.md` (§4-4a 에 확정 상품·금액). 시안: `dev/active/halloween-premium/look/compare.html` + `sims/halloween-{trail,skin,tools}-sim.html`.

## Global Constraints

- **전용 워크트리에서 작업한다**(`superpowers:using-git-worktrees`, 브랜치 `feat/halloween-premium`, main 기준). 메인 작업트리에는 다른 세션의 미커밋 수정(`js/game.js`·`js/spaces/cafe.js`·박물관 테스트)이 있다 — 건드리지 않는다. 커밋할 땐 **내 파일만 경로를 지정해서 add** 한다(전체 add 금지).
- 금액(`won`): 걷는 자국 2종 **₩4,000** · 도구 세트 2종·망토 2종 **₩4,500** · 전신 스킨 4종 **₩4,900**. 전부 현금 전용(코인 없음).
- 한정 판매: 기본 창 `2026-10-24` ~ `2026-11-02`(KST 날짜, 양끝 포함). 승인일에 맞춰 `SALE_WINDOWS` 한 곳만 고친다. 산 사람은 기간과 무관하게 `owned`.
- **웹훅은 판매 기간을 검사하지 않는다**(결제 완료분은 무조건 지급). 종료일 최종 차단 = Paddle Price Archive(사용자 대시보드 작업).
- priceId 는 승인 전까지 전부 `null` — 이 계획은 `price-ids.js` 에 `id: null` 칸만 추가한다. 라이브 가격 등록은 승인 후(`PADDLE_ENV=production`).
- **도구 휘두르는 모션(스윙)은 건드리지 않는다.** 도구 스킨은 외형만. 도구 쥐기 자리(`TOOL_GRIP`·`gripForwardZ`)도 그대로.
- **새 한국어 UI 문구는 구현 전에 사용자에게 먼저 보여 검수받는다**(Task 1). i18n 은 한국어 원문 키 사전(`js/i18n-en.js`) — **조합 문장 글루 금지**(문장 전체가 키).
- 확률형·뽑기·압박 문구("놓치면 영영") 금지. 시즌 안내는 "할로윈 한정" 정도.
- 블룸 임계 0.85 — 넓은 면의 발광색은 임계 아래로. 캐릭터 얼굴을 옛 방식으로 되돌리지 않는다(`js/animal-faces.js` 사용).
- 새 코드는 `game.js` 에 몰지 않는다. 새 파일은 `js/cosmetics/` · `js/shop/` 아래. 파일 하나 800줄 이하.
- 드로우콜 상한 점검 항목: 호박불(자국) 최대 ≈9, 달밤 보라 도구 최대 ≈5 — 구현 후 실측(Task 14).
- 공개 저장소: 푸시 전 비밀 스캔 필수(Task 14 Step 6).
- 커밋 메시지는 영어, 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` 한 줄.
- 코드 수정 후마다 `npm test`(= `node --test tests/*.test.mjs`) 가 전부 통과해야 한다. 빌드 에러를 남긴 채 다음 Task 로 가지 않는다(Task 4 의 도구 칸 테스트는 Task 11 에서 고치는 예외 — 실패 목록을 메모).

## ID·이름·금액 표 (이 계획 전체의 단일 출처)

| id | slot | ico | 이름(카탈로그) | won | 시안 |
|---|---|---|---|---|---|
| `pumpkin_glow` | trail | 🎃 | 꼬마 호박등 | 4000 | trail-sim 호박불 A |
| `bat_swirl` | trail | 🦇 | 박쥐 회오리 | 4000 | trail-sim 박쥐 B |
| `ghost_nightcap` | skin | 👻 | 나이트캡 유령 | 4900 | skin-sim 유령 B |
| `ghost_cloud` | skin | ☁️ | 구름 유령 | 4900 | skin-sim 유령 C |
| `witch_classic` | skin | 🧙 | 클래식 마녀 | 4900 | skin-sim 마녀 A |
| `witch_starry` | skin | 🔮 | 별밤 견습 마녀 | 4900 | skin-sim 마녀 C |
| `tools_batnight` | tools | 🦇 | 달밤 보라 세트 | 4500 | tools-sim B |
| `tools_harvest` | tools | 🌽 | 수확제 세트 | 4500 | tools-sim C |
| `bat_wing` | back | 🦇 | 박쥐 날개 | 4500 | tools-sim 망토 A |
| `bat_cape` | back | 🧛 | 박쥐 망토 | 4500 | tools-sim 망토 C |

테마 키: `tools_batnight` → `batnight`, `tools_harvest` → `harvest`(`themeOf` 가 `tools_` 접두 제거).
`pumpkin_glow`·`bat_swirl` 의 Paddle 상품명은 `buildPlan` 이 "○○ 자국" 으로 붙인다.

## File Structure

| 파일 | 역할 | 동작 |
|---|---|---|
| `js/shop/sale-window.js` | 판매 기간 규칙(순수) | 신규 |
| `js/shop/premium-row.js` | 행 모드 — 기간 밖 hidden | 수정 |
| `js/cosmetics/catalog.js` | 상품 10개 + `sale` 키 | 수정 |
| `js/shop/price-ids.js` | 10칸 `null` 추가 | 수정 |
| `js/shop/reveal-pose.js` | 연출 문구 10개 · 망토 카드·모드 | 수정 |
| `js/i18n-en.js` | 영어 사전 | 수정 |
| `js/spaces/cafe.js` | 시즌 태그 · `premium_row_view` 에 `sale` | 수정(소량) |
| `js/cosmetics/trail.js` | 자국 조형 2개 | 수정 |
| `js/cosmetics/trail-fx-sprites.js` | 박쥐 스프라이트 입자(시안 이식) | 신규 |
| `js/cosmetics/trail-fx.js` | FX 등록 · points 를 Group 으로 | 수정 |
| `js/cosmetics/skin-ghost.js` · `skin-witch.js` | 스킨 조형 4개 | 신규 |
| `js/cosmetics/skin.js` · `skin-rules.js` | 디스패치 · 부위 가시 규칙 | 수정 |
| `js/cosmetics/tool-skins-halloween.js` | 도구 테마 2개 | 신규 |
| `js/cosmetics/tool-skins.js` · `tool-skin-rules.js` | 테마 등록 · 우산 | 수정 |
| `js/cosmetics/art-bats.js` | 망토 2개 | 신규 |
| `js/cosmetics/art.js` | BACK 표 등록 | 수정 |
| `js/game.js` | `showSprout` 호출 2곳 → `showSkinParts` | 수정(2줄) |
| `tests/halloween-*.test.mjs` | 신규 테스트 | 신규 |
| `tests/cosmetics-catalog` · `paddle-seed` · `reveal-pose` · `tool-skins` `.test.mjs` | 하드코딩 개수·목록 | 수정 |
| `sims/halloween-verify.html` | 실제 모듈로 렌더 확인 | 신규 |

---

### Task 0: 워크트리와 기준선

**Files:** (없음 — 환경 준비)

- [ ] **Step 1: 워크트리 만들기** — `superpowers:using-git-worktrees` 로 `feat/halloween-premium` (main 기준) 생성. 이후 모든 경로는 그 워크트리 루트 기준.
- [ ] **Step 2: 기준선 테스트 기록**

Run: `npm test 2>&1 | tail -12`
Expected: `# fail 0`. 통과 수(`# pass N`)를 메모한다(Task 14 에서 비교).

- [ ] **Step 3: 시안·문서 가져오기** — 시안·spec·계획은 메인 작업트리의 미추적 파일이라 워크트리에 없다. 메인에서 복사한다(`<메인>` = `/Users/uicheol_hwang/calm_forest`):

```bash
mkdir -p sims dev/active/halloween-premium/look docs/superpowers/specs docs/superpowers/plans
cp <메인>/sims/halloween-trail-sim.html <메인>/sims/halloween-skin-sim.html <메인>/sims/halloween-tools-sim.html sims/
cp <메인>/dev/active/halloween-premium/look/*.png <메인>/dev/active/halloween-premium/look/compare.html dev/active/halloween-premium/look/
cp <메인>/dev/active/halloween-premium/halloween-premium-*.md dev/active/halloween-premium/
cp <메인>/docs/superpowers/specs/2026-10-06-halloween-premium-design.md docs/superpowers/specs/
cp <메인>/docs/superpowers/plans/2026-10-06-halloween-premium.md docs/superpowers/plans/
git add sims/halloween-trail-sim.html sims/halloween-skin-sim.html sims/halloween-tools-sim.html dev/active/halloween-premium docs/superpowers/specs/2026-10-06-halloween-premium-design.md docs/superpowers/plans/2026-10-06-halloween-premium.md
git commit -m "docs: halloween premium spec, plan and look sims" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 1: 한국어 문구 검수 (구현 전 게이트)

**Files:** (없음 — 사용자 확인 후 이후 Task 에서 사용)

- [ ] **Step 1: 아래 표를 그대로 사용자에게 보여 주고 수정·승인을 받는다.** 승인 전에 Task 4~6 에서 이 문구를 코드에 넣지 않는다.

| id | 카탈로그 이름 | 구매 연출 이름 | 구매 연출 설명 |
|---|---|---|---|
| `pumpkin_glow` | 꼬마 호박등 | 꼬마 호박등 자국 | 걸음마다 작은 호박등이 톡 켜져요 |
| `bat_swirl` | 박쥐 회오리 | 박쥐 회오리 자국 | 걸을 때마다 박쥐가 빙글 날아올라요 |
| `ghost_nightcap` | 나이트캡 유령 | 나이트캡 유령 | 시트를 두르고 나이트캡을 쓴 포근한 유령이에요 |
| `ghost_cloud` | 구름 유령 | 구름 유령 | 몽글몽글 구름이 된 유령이에요 |
| `witch_classic` | 클래식 마녀 | 클래식 마녀 | 보랏빛 고깔모자와 별 브로치 망토예요 |
| `witch_starry` | 별밤 견습 마녀 | 별밤 견습 마녀 | 꼬마 고깔과 별이 반짝이는 망토, 등엔 빗자루예요 |
| `tools_batnight` | 달밤 보라 세트 | 달밤 보라 세트 | 도구 9종이 박쥐 날개와 별빛으로, 비 오는 날엔 보랏빛 우산 |
| `tools_harvest` | 수확제 세트 | 수확제 세트 | 짚과 옥수수로 만든 도구 9종, 비 오는 날엔 짚 우산 |
| `bat_wing` | 박쥐 날개 | 박쥐 날개 | 등에서 활짝 펼쳐지는 보랏빛 날개예요 |
| `bat_cape` | 박쥐 망토 | 박쥐 망토 | 꼬마 박쥐가 달린 보랏빛 망토예요 |

추가 문구: 상점 행 시즌 태그 = **`🎃 할로윈 한정`** + 날짜 **`~11/2`**(날짜는 번역하지 않는 별도 조각). 망토 구매 연출 카드 = 태그 **`PREMIUM · 등 꾸미기`**, 버튼 **`바로 입어보기`**.
⚠️ 확인 요청 하나: 기존 `달밤 세트`(tools_moon)와 `달밤 보라 세트` 가 헷갈릴 수 있다 — 대안 `박쥐 달밤 세트`.

- [ ] **Step 2: 승인된 최종 문구를 spec §4-5 에 한 표로 기록하고 이후 Task 의 문구를 그에 맞춘다.** (이 계획의 문구와 다르면 승인된 쪽이 이긴다.)

---

### Task 2: 판매 기간 규칙 `sale-window.js`

**Files:**
- Create: `js/shop/sale-window.js`
- Test: `tests/halloween-sale-window.test.mjs`

**Interfaces:**
- Produces: `SALE_WINDOWS`(frozen, `{ halloween: { from, to } }`), `saleOpen(item, now?) → boolean`, `saleEndLabel(item) → string|null`(예 `'11/2'`).

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-sale-window.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SALE_WINDOWS, saleOpen, saleEndLabel } from '../js/shop/sale-window.js';

const item = { id: 'pumpkin_glow', sale: 'halloween' };
const at = (iso) => Date.parse(iso);

test('sale 키가 없는 상품은 늘 열려 있다', () => {
  assert.equal(saleOpen({ id: 'firefly' }, at('2026-01-01T00:00:00Z')), true);
  assert.equal(saleOpen(null), true);
});

test('기간 전 — KST 10/23 23:59:59 는 닫힘, KST 10/24 00:00 에 열림', () => {
  assert.equal(saleOpen(item, at('2026-10-23T14:59:59Z')), false);   // = KST 10/23 23:59:59
  assert.equal(saleOpen(item, at('2026-10-23T15:00:00Z')), true);    // = KST 10/24 00:00:00
});

test('마지막 날(11/2) 끝까지 열려 있고 11/3 00:00 KST 에 닫힌다', () => {
  assert.equal(saleOpen(item, at('2026-11-02T14:59:59Z')), true);    // = KST 11/2 23:59:59
  assert.equal(saleOpen(item, at('2026-11-02T15:00:00Z')), false);   // = KST 11/3 00:00:00
});

test('모르는 시즌 키는 닫는다 — 오타로 상시 판매되지 않게', () => {
  assert.equal(saleOpen({ sale: 'halloweeen' }, at('2026-10-30T00:00:00Z')), false);
});

test('종료 날짜 라벨 — 11/2', () => {
  assert.equal(saleEndLabel(item), '11/2');
  assert.equal(saleEndLabel({ id: 'firefly' }), null);
  assert.ok(Object.isFrozen(SALE_WINDOWS));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-sale-window.test.mjs`
Expected: FAIL — `Cannot find module '../js/shop/sale-window.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// js/shop/sale-window.js
// =============================================================
//  calm forest · 🎃 기간 한정 판매 창 — 순수(THREE/DOM 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-06-halloween-premium-design.md §4-1
//  ▶ 카탈로그 항목은 sale: '<키>' 만 가진다. 날짜는 아래 표 한 곳 — 내년엔 이 표만 바꾼다.
//  ▶ 날짜는 KST 자정 기준 · 양끝 포함('to' 날 23:59:59 까지 열림). js/season.js 와 같이 날짜만 본다.
//  ▶ 이 판정은 **표시용**이다 — 결제 자체는 막지 못한다. 최종 차단 = 종료일에 Paddle Price 보관(Archive).
//    웹훅은 기간을 보지 않는다(결제 끝난 건 무조건 지급).
// =============================================================

export const SALE_WINDOWS = Object.freeze({
  halloween: Object.freeze({ from: '2026-10-24', to: '2026-11-02' }),
});

const DAY_MS = 86400000;
const KST_MS = 9 * 3600 * 1000;

/** 'YYYY-MM-DD'(KST) 자정 → 에포크 ms */
function kstMidnight(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - KST_MS;
}

/** 지금 이 상품을 팔고 있나. sale 키가 없으면 늘 true, 모르는 키는 false(닫는 쪽으로 틀린다) */
export function saleOpen(item, now = Date.now()) {
  const key = item?.sale;
  if (!key) return true;
  const w = SALE_WINDOWS[key];
  if (!w) return false;
  return now >= kstMidnight(w.from) && now < kstMidnight(w.to) + DAY_MS;
}

/** 종료일 라벨 '11/2' — sale 이 없거나 모르는 키면 null */
export function saleEndLabel(item) {
  const w = SALE_WINDOWS[item?.sale];
  if (!w) return null;
  const [, m, d] = w.to.split('-').map(Number);
  return `${m}/${d}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/halloween-sale-window.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add js/shop/sale-window.js tests/halloween-sale-window.test.mjs
git commit -m "feat: 🎃 sale-window — KST date window for limited-time premium items" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `premiumRowMode` 가 기간 밖을 숨긴다

**Files:**
- Modify: `js/shop/premium-row.js`
- Test: `tests/premium-row.test.mjs` (기존 파일에 추가)

**Interfaces:**
- Consumes: `saleOpen(item, now)` from `js/shop/sale-window.js`
- Produces: `premiumRowMode(item, { owned, platform, online, isGuest, tokenSet, storeOpen, now? })` — 순서: `owned` → 웹 아님 `hidden` → **기간 밖 `hidden`** → 기존 규칙.

- [ ] **Step 1: Write the failing test** — `tests/premium-row.test.mjs` 맨 아래에 추가

```js
const sale = { ...it, id: 'pumpkin_glow', sale: 'halloween' };
const IN = Date.parse('2026-10-28T03:00:00Z'), BEFORE = Date.parse('2026-10-10T03:00:00Z'), AFTER = Date.parse('2026-11-10T03:00:00Z');

test('🎃 한정 상품 — 기간 안에서만 안 산 사람에게 보인다', () => {
  assert.equal(premiumRowMode(sale, { ...base, now: IN }), 'buy');
  assert.equal(premiumRowMode(sale, { ...base, now: BEFORE }), 'hidden');
  assert.equal(premiumRowMode(sale, { ...base, now: AFTER }), 'hidden');
});

test('🎃 산 사람은 기간과 무관하게 owned — 옷장·가게에서 계속 보인다', () => {
  assert.equal(premiumRowMode(sale, { ...base, owned: true, now: AFTER }), 'owned');
  assert.equal(premiumRowMode(sale, { ...base, owned: true, now: BEFORE, platform: 'toss' }), 'owned');
});

test('🎃 웹 밖은 기간 안이어도 hidden · 게스트는 기간 안에서 login', () => {
  assert.equal(premiumRowMode(sale, { ...base, platform: 'android', now: IN }), 'hidden');
  assert.equal(premiumRowMode(sale, { ...base, isGuest: true, now: IN }), 'login');
});

test('🎃 sale 키가 없는 기존 프리미엄은 기간과 무관(영향 없음)', () => {
  assert.equal(premiumRowMode(it, { ...base, now: AFTER }), 'buy');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/premium-row.test.mjs`
Expected: FAIL — 한정 상품 `BEFORE` 케이스가 `'buy'` 를 돌려줌(아직 기간을 안 본다).

- [ ] **Step 3: Write minimal implementation** — `js/shop/premium-row.js`

```js
// 파일 맨 위 주석 아래 import 추가
import { saleOpen } from './sale-window.js';

/** @returns {'owned'|'buy'|'login'|'unavailable'|'hidden'} */
export function premiumRowMode(item, { owned, platform, online, isGuest, tokenSet, storeOpen, now }) {
  if (owned) return 'owned';
  if (platform !== 'web') return 'hidden';
  if (!saleOpen(item, now)) return 'hidden';   // 🎃 기간 한정 — 기간 밖이면 안 산 사람에겐 행 자체가 없다(승인 전 배포도 안전)
  if (!tokenSet || !storeOpen || !item.price.cash) return 'unavailable';   // 상점이 닫혔으면 게스트에게도 "로그인하면" 이라 하지 않는다
  if (isGuest) return 'login';
  if (!online) return 'unavailable';
  return 'buy';
}
```
(`slotVisible` 은 그대로 둔다.)

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/premium-row.test.mjs tests/halloween-sale-window.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add js/shop/premium-row.js tests/premium-row.test.mjs
git commit -m "feat: 🎃 premiumRowMode hides sale items outside their window" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 카탈로그 10종 + price-ids 칸 + 하드코딩 테스트 갱신

**Files:**
- Modify: `js/cosmetics/catalog.js` (RAW 배열), `js/shop/price-ids.js`
- Modify: `tests/cosmetics-catalog.test.mjs`, `tests/paddle-seed.test.mjs`
- Test: `tests/halloween-catalog.test.mjs`

**Interfaces:**
- Consumes: Task 1 승인 문구(이름·ico), 위 "ID·이름·금액 표".
- Produces: `findItem('<id>')` 가 `{ id, slot, ico, name, premium:true, sale:'halloween', tier:'프리미엄', price:{ coins:null, won, cash:null } }`.

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-catalog.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, itemsOf, findItem } from '../js/cosmetics/catalog.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';

const HALLOWEEN = {
  pumpkin_glow:   { slot: 'trail', won: 4000 },
  bat_swirl:      { slot: 'trail', won: 4000 },
  ghost_nightcap: { slot: 'skin',  won: 4900 },
  ghost_cloud:    { slot: 'skin',  won: 4900 },
  witch_classic:  { slot: 'skin',  won: 4900 },
  witch_starry:   { slot: 'skin',  won: 4900 },
  tools_batnight: { slot: 'tools', won: 4500 },
  tools_harvest:  { slot: 'tools', won: 4500 },
  bat_wing:       { slot: 'back',  won: 4500 },
  bat_cape:       { slot: 'back',  won: 4500 },
};

test('🎃 할로윈 10종 — 슬롯·금액·현금 전용·sale 키', () => {
  for (const [id, want] of Object.entries(HALLOWEEN)) {
    const it = findItem(id);
    assert.ok(it, `${id} 가 카탈로그에 없다`);
    assert.equal(it.slot, want.slot, id);
    assert.equal(it.price.won, want.won, id);
    assert.equal(it.price.coins, null, id);
    assert.equal(it.premium, true, id);
    assert.equal(it.sale, 'halloween', id);
    assert.equal(it.tier, '프리미엄', id);
  }
  assert.equal(ITEMS.filter(i => i.sale === 'halloween').length, 10);
});

test('🎃 금액은 모두 ₩4,000대', () => {
  for (const id of Object.keys(HALLOWEEN)) {
    const w = findItem(id).price.won;
    assert.ok(w >= 4000 && w < 5000, `${id}: ${w}`);
  }
});

test('🎃 망토 2종은 등(back) 앵커 · priceId 는 승인 전이라 null', () => {
  assert.equal(findItem('bat_wing').anchor, 'back');
  assert.equal(findItem('bat_cape').anchor, 'back');
  for (const id of Object.keys(HALLOWEEN)) {
    assert.ok(id in PRICE_IDS, `${id}: price-ids.js 에 칸이 없다`);
    assert.equal(PRICE_IDS[id], null, `${id}: 승인 전엔 null`);
    assert.equal(findItem(id).price.cash, null, id);
  }
});

test('🎃 슬롯별 순서 — 자국은 프리미엄 뒤에 이어 붙고, 스킨·도구·등은 기존 프리미엄 뒤', () => {
  assert.deepEqual(itemsOf('trail').slice(0, 4).map(i => i.id), ['firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl']);
  assert.deepEqual(itemsOf('skin').map(i => i.id),
    ['forest_spirit', 'plush_doll', 'ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry']);
  assert.deepEqual(itemsOf('tools').map(i => i.id),
    ['tools_shroom', 'tools_moon', 'tools_bloom', 'tools_batnight', 'tools_harvest']);
  assert.deepEqual(itemsOf('back').map(i => i.id), ['pack', 'basket', 'cape', 'bat_wing', 'bat_cape']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-catalog.test.mjs`
Expected: FAIL — `pumpkin_glow 가 카탈로그에 없다`

- [ ] **Step 3: Write minimal implementation**

`js/cosmetics/catalog.js` — `RAW` 안에서 **정확한 위치**에 삽입(`itemsOf` 순서 = RAW 순서):

`rainbow` 줄 바로 뒤:
```js
  // 🎃 할로윈 한정 자국 — sale 이 있으면 js/shop/sale-window.js 의 기간에만 안 산 사람에게 보인다(스펙 2026-10-06)
  { id: 'pumpkin_glow', slot: 'trail', ico: '🎃', name: '꼬마 호박등', won: 4000, tier: '프리미엄', sale: 'halloween' },
  { id: 'bat_swirl',    slot: 'trail', ico: '🦇', name: '박쥐 회오리', won: 4000, tier: '프리미엄', sale: 'halloween' },
```
`plush_doll` 줄 바로 뒤:
```js
  // 🎃 할로윈 한정 전신 스킨 4종
  { id: 'ghost_nightcap', slot: 'skin', ico: '👻', name: '나이트캡 유령',  won: 4900, tier: '프리미엄', sale: 'halloween' },
  { id: 'ghost_cloud',    slot: 'skin', ico: '☁️', name: '구름 유령',     won: 4900, tier: '프리미엄', sale: 'halloween' },
  { id: 'witch_classic',  slot: 'skin', ico: '🧙', name: '클래식 마녀',    won: 4900, tier: '프리미엄', sale: 'halloween' },
  { id: 'witch_starry',   slot: 'skin', ico: '🔮', name: '별밤 견습 마녀', won: 4900, tier: '프리미엄', sale: 'halloween' },
```
`tools_bloom` 줄 바로 뒤(기존 `// 👣 발자국` 주석 위):
```js
  // 🎃 할로윈 한정 도구 세트 2종 + 등 꾸미기(박쥐) 2종
  { id: 'tools_batnight', slot: 'tools', ico: '🦇', name: '달밤 보라 세트', won: 4500, tier: '프리미엄', sale: 'halloween' },
  { id: 'tools_harvest',  slot: 'tools', ico: '🌽', name: '수확제 세트',    won: 4500, tier: '프리미엄', sale: 'halloween' },
  { id: 'bat_wing', slot: 'back', ico: '🦇', name: '박쥐 날개', won: 4500, tier: '프리미엄', anchor: 'back', sale: 'halloween' },
  { id: 'bat_cape', slot: 'back', ico: '🧛', name: '박쥐 망토', won: 4500, tier: '프리미엄', anchor: 'back', sale: 'halloween' },
```
(`ITEMS` 를 만드는 `RAW.map(({ coins = null, won = null, ...it }) => …)` 는 `sale` 을 rest 로 그대로 보존한다 — 수정 불필요. 파일 상단 주석에 `sale` 한 줄 설명 추가.)

`js/shop/price-ids.js` — `PRICE_IDS` 의 `// 🪓 도구 테마 세트` 줄 아래에 추가:
```js
  // 🎃 할로윈 한정(2026-10-06) — 승인 후 scripts/paddle-seed.mjs(PADDLE_ENV=production)가 채운다
  pumpkin_glow: null, bat_swirl: null, ghost_nightcap: null, ghost_cloud: null, witch_classic: null, witch_starry: null,
  tools_batnight: null, tools_harvest: null, bat_wing: null, bat_cape: null,
```

기존 테스트 갱신:
- `tests/cosmetics-catalog.test.mjs`: 첫 테스트 제목 `품목 35종(…)` · `ITEMS.length 35` · `itemsOf('back').length 5` · `trail 9` · `skin 6` · `tools 5`. `'발자국 — 프리미엄 2개가 맨 앞…'` 테스트의 `deepEqual` 을 `['firefly','rainbow','pumpkin_glow','bat_swirl','paw','drop','flower','star','sparkle']` 로(코인 자국 검사 `coin = t.filter(i => !i.premium)` 는 그대로).
- `tests/paddle-seed.test.mjs`: `buildPlan` 첫 테스트의 기대 순서를 `['firefly','rainbow','pumpkin_glow','bat_swirl','forest_spirit','plush_doll','ghost_nightcap','ghost_cloud','witch_classic','witch_starry','tools_shroom','tools_moon','tools_bloom','tools_batnight','tools_harvest','bat_wing','bat_cape']` 로. 같은 파일 아래쪽에서 개수·금액을 하드코딩한 단언을 읽고(`sed -n 30,57p tests/paddle-seed.test.mjs`) 새 상품에 맞게 늘린다.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/halloween-catalog.test.mjs tests/cosmetics-catalog.test.mjs tests/paddle-seed.test.mjs`
Expected: PASS. 그다음 전체 `npm test 2>&1 | tail -15` — 개수·목록을 하드코딩해서 실패하는 다른 테스트는 **개수 갱신만으로** 고친다(동작 변경 금지). 도구 칸을 3종으로 가정한 `tool-skins.test.mjs` 는 Task 11 에서 고치므로 이 시점에 실패해도 된다 — 실패 목록을 메모한다.

- [ ] **Step 5: Commit**

```bash
git add js/cosmetics/catalog.js js/shop/price-ids.js tests/halloween-catalog.test.mjs tests/cosmetics-catalog.test.mjs tests/paddle-seed.test.mjs
git commit -m "feat: 🎃 add 10 halloween premium items to the catalog (sale-gated, priceIds pending approval)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 구매 연출 — 문구·망토 카드/모드·영어 사전

**Files:**
- Modify: `js/shop/reveal-pose.js`, `js/i18n-en.js`, `docs/superpowers/specs/2026-10-06-halloween-premium-design.md`(망토 연출 문장 정정)
- Test: `tests/reveal-pose.test.mjs`(필요 시 수정), `tests/halloween-reveal.test.mjs`

**Interfaces:**
- Consumes: Task 1 승인 문구, `findItem`.
- Produces: `REVEAL_COPY[id]` 10개 · `revealModeOf({slot:'back'}) === 'boxburst'` · `revealCardOf({slot:'back'}) → { tag:'PREMIUM · 등 꾸미기', cta:'바로 입어보기' }`.

> ⚠️ **스펙 정정:** 스펙 §4-4a 는 "망토(`back`)는 스포트라이트"라고 적었지만, `spot` 모드는 `buildTrailMark(itemId)` 를 띄우는 **자국 전용** 연출이라 망토에서는 빈 화면이 된다. 망토는 캐릭터가 입은 모습을 보여 주는 `boxburst` 로 보낸다. 이 Task 의 코드가 그렇게 하고, 스펙 문서의 해당 문장도 같이 고친다.

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-reveal.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REVEAL_COPY, revealModeOf, revealCardOf } from '../js/shop/reveal-pose.js';
import { ITEMS, findItem } from '../js/cosmetics/catalog.js';

test('🎃 프리미엄 상품은 모두 구매 연출 문구가 있다(이름·설명 비어 있지 않음)', () => {
  for (const it of ITEMS.filter(i => i.premium)) {
    const c = REVEAL_COPY[it.id];
    assert.ok(c && c.name && c.desc, `${it.id}: REVEAL_COPY 없음`);
  }
});

test('🎃 연출 모드 — 자국은 spot, 스킨·도구·망토는 boxburst', () => {
  assert.equal(revealModeOf(findItem('pumpkin_glow')), 'spot');
  assert.equal(revealModeOf(findItem('bat_swirl')), 'spot');
  for (const id of ['ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry', 'tools_batnight', 'tools_harvest', 'bat_wing', 'bat_cape']) {
    assert.equal(revealModeOf(findItem(id)), 'boxburst', id);
  }
});

test('🎃 망토 카드 — 걷는 자국이라고 쓰지 않는다', () => {
  assert.deepEqual(revealCardOf(findItem('bat_wing')), { tag: 'PREMIUM · 등 꾸미기', cta: '바로 입어보기' });
  assert.equal(revealCardOf({ slot: 'back', id: 'cape' }).tag, 'PREMIUM · 등 꾸미기');
});

test('🎃 기존 연출은 그대로 — 스킨 카드·도구 카드·자국 카드', () => {
  assert.equal(revealCardOf(findItem('forest_spirit')).tag, 'PREMIUM · 전신 스킨');
  assert.equal(revealCardOf(findItem('tools_moon')).tag, 'PREMIUM · 도구 세트');
  assert.equal(revealCardOf(findItem('firefly')).tag, 'PREMIUM · 걷는 자국');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/halloween-reveal.test.mjs`
Expected: FAIL — `pumpkin_glow: REVEAL_COPY 없음`

- [ ] **Step 3: Write minimal implementation** — `js/shop/reveal-pose.js`

`REVEAL_COPY` 안(`tools_bloom` 줄 뒤)에 Task 1 승인 문구로:
```js
  pumpkin_glow: Object.freeze({ name: '꼬마 호박등 자국', desc: '걸음마다 작은 호박등이 톡 켜져요' }),
  bat_swirl: Object.freeze({ name: '박쥐 회오리 자국', desc: '걸을 때마다 박쥐가 빙글 날아올라요' }),
  ghost_nightcap: Object.freeze({ name: '나이트캡 유령', desc: '시트를 두르고 나이트캡을 쓴 포근한 유령이에요' }),
  ghost_cloud: Object.freeze({ name: '구름 유령', desc: '몽글몽글 구름이 된 유령이에요' }),
  witch_classic: Object.freeze({ name: '클래식 마녀', desc: '보랏빛 고깔모자와 별 브로치 망토예요' }),
  witch_starry: Object.freeze({ name: '별밤 견습 마녀', desc: '꼬마 고깔과 별이 반짝이는 망토, 등엔 빗자루예요' }),
  tools_batnight: Object.freeze({ name: '달밤 보라 세트', desc: '도구 9종이 박쥐 날개와 별빛으로, 비 오는 날엔 보랏빛 우산' }),
  tools_harvest: Object.freeze({ name: '수확제 세트', desc: '짚과 옥수수로 만든 도구 9종, 비 오는 날엔 짚 우산' }),
  bat_wing: Object.freeze({ name: '박쥐 날개', desc: '등에서 활짝 펼쳐지는 보랏빛 날개예요' }),
  bat_cape: Object.freeze({ name: '박쥐 망토', desc: '꼬마 박쥐가 달린 보랏빛 망토예요' }),
```
모드·카드 함수 교체:
```js
/** 칸이 정한 연출: 전신 스킨·도구 세트·등(망토) = B+C 상자 폭발(캐릭터가 입은 모습), 걷는 자국 = A 스포트라이트
 *  ※ 'spot' 은 buildTrailMark(itemId) 를 띄우는 자국 전용 — 등 꾸미기를 넣으면 빈 화면이다. */
export function revealModeOf(item) { return item?.slot === 'skin' || item?.slot === 'tools' || item?.slot === 'back' ? 'boxburst' : 'spot'; }

//  🪓 도구 세트·🦇 망토는 상자 연출을 같이 쓰되 카드 문구는 따로 — "전신 스킨" 이라 쓰면 거짓말이다
const TOOLS_CARD = Object.freeze({ tag: 'PREMIUM · 도구 세트', cta: '바로 들어보기' });
const BACK_CARD = Object.freeze({ tag: 'PREMIUM · 등 꾸미기', cta: '바로 입어보기' });
/** 카드 태그·버튼 — 칸이 정한다 */
export function revealCardOf(item) {
  if (item?.slot === 'tools') return TOOLS_CARD;
  if (item?.slot === 'back') return BACK_CARD;
  return REVEAL_CARD[revealModeOf(item)];
}
```
`js/i18n-en.js` — 기존 `'숲의 정령': 'Forest Spirit'` 근처 패턴(한국어 원문 → 영어)으로 **카탈로그 이름 10개 + 구매 연출 이름·설명 + 카드 문구 + 시즌 태그**를 추가한다. 예: `'꼬마 호박등': 'Little Pumpkin Lantern'`, `'박쥐 회오리': 'Bat Swirl'`, `'나이트캡 유령': 'Nightcap Ghost'`, `'구름 유령': 'Cloud Ghost'`, `'클래식 마녀': 'Classic Witch'`, `'별밤 견습 마녀': 'Starry Night Apprentice'`, `'달밤 보라 세트': 'Purple Moonlight Set'`, `'수확제 세트': 'Harvest Festival Set'`, `'박쥐 날개': 'Bat Wings'`, `'박쥐 망토': 'Bat Cape'`, `'PREMIUM · 등 꾸미기': 'PREMIUM · Back Wear'`, `'🎃 할로윈 한정': '🎃 Halloween Only'`. `'바로 입어보기'` 는 이미 있으면 재사용. 설명 문장은 위 표를 자연스러운 영어로(문장 전체가 키). 이미 사전에 있는 키는 중복 정의 금지.
스펙 §4-4a 의 "망토(`back`)는 스포트라이트가 된다" 문장을 "망토는 `boxburst`(캐릭터가 입은 모습) — `spot` 은 자국 전용이라 빈 화면이 되기 때문" 으로 고친다.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/halloween-reveal.test.mjs tests/reveal-pose.test.mjs tests/purchase-reveal-wiring.test.mjs`
Expected: PASS. `tests/reveal-pose.test.mjs` 에 `revealModeOf`/`revealCardOf` 가 back 슬롯을 `spot` 으로 가정한 단언이 있으면 그 줄만 새 규칙에 맞게 고친다. 그다음 `npm test 2>&1 | grep -E "^# (pass|fail)"` — i18n 커버리지 테스트(`i18n-*.test.mjs`)가 새 한국어 문자열 누락을 잡으면 사전에 추가한다.

- [ ] **Step 5: Commit**

```bash
git add js/shop/reveal-pose.js js/i18n-en.js tests/halloween-reveal.test.mjs tests/reveal-pose.test.mjs docs/superpowers/specs/2026-10-06-halloween-premium-design.md
git commit -m "feat: 🎃 reveal copy for halloween items; back slot uses boxburst with its own card" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 상점 시즌 태그 + `premium_row_view` 에 `sale`

**Files:**
- Modify: `js/shop/sale-window.js`(태그 데이터 함수 추가), `js/spaces/cafe.js`(`drawCosMenu` 안 행 생성부, 약 1058~1075행), 스타일 파일(`.sh-row` 가 정의된 곳)
- Test: `tests/halloween-sale-window.test.mjs`(추가), `tests/premium-shop-wiring.test.mjs`(추가)

**Interfaces:**
- Consumes: Task 1 승인 문구(`🎃 할로윈 한정`).
- Produces: `saleTagOf(item) → { label: '🎃 할로윈 한정', until: '~11/2' } | null`.

- [ ] **Step 1: Write the failing test** — sale-window 테스트 파일에 추가

```js
import { saleTagOf } from '../js/shop/sale-window.js';
test('시즌 태그 — 라벨과 날짜는 따로(날짜는 번역 안 함)', () => {
  assert.deepEqual(saleTagOf(item), { label: '🎃 할로윈 한정', until: '~11/2' });
  assert.equal(saleTagOf({ id: 'firefly' }), null);
});
```
`tests/premium-shop-wiring.test.mjs` 에 추가(그 파일이 `cafe.js` 를 읽는 기존 변수 이름을 그대로 쓴다):
```js
test('🎃 시즌 태그 · premium_row_view 에 sale 파라미터', () => {
  assert.match(cafe, /saleTagOf\(it\)/);
  assert.match(cafe, /trackEvent\('premium_row_view', \{ item_id: it\.id, mode, \.\.\.\(it\.sale \? \{ sale: it\.sale \} : \{\}\) \}\)/);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/halloween-sale-window.test.mjs tests/premium-shop-wiring.test.mjs`
Expected: FAIL — `saleTagOf is not a function` / 소스 패턴 불일치.

- [ ] **Step 3: Implement**

`js/shop/sale-window.js` 에 추가:
```js
/** 상점 행 태그 — 라벨(번역 대상)과 날짜(번역 안 함)를 따로 준다. 조합 문장 글루 금지(i18n) */
export function saleTagOf(item) {
  const until = saleEndLabel(item);
  if (!until) return null;
  return { label: '🎃 할로윈 한정', until: `~${until}` };
}
```
`js/spaces/cafe.js`: `import { saleTagOf } from '../shop/sale-window.js';` 추가. `drawCosMenu` 에서 `premium_row_view` 호출을
```js
      if (!premiumViewed.has(it.id)) { premiumViewed = new Set([...premiumViewed, it.id]); trackEvent('premium_row_view', { item_id: it.id, mode, ...(it.sale ? { sale: it.sale } : {}) }); }
```
로 바꾸고, `row.innerHTML = …` 줄 바로 뒤에 태그를 붙인다:
```js
    const tag = it.sale && mode !== 'owned' ? saleTagOf(it) : null;
    if (tag) {
      const t = document.createElement('small');
      t.className = 'sale-tag';
      const l = document.createElement('span'); l.textContent = tag.label;       // i18n 옵저버가 번역
      const u = document.createElement('span'); u.textContent = ` ${tag.until}`;  // 날짜는 그대로
      t.append(l, u);
      row.firstElementChild.appendChild(t);
    }
```
스타일: `grep -n "\.sh-row" index.html css/*.css 2>/dev/null` 로 정의된 파일을 찾아 그 옆에 `.sale-tag{display:block;font-size:11px;opacity:.8}` 한 줄 추가.

- [ ] **Step 4: Run to verify pass** — `node --test tests/halloween-sale-window.test.mjs tests/premium-shop-wiring.test.mjs` PASS 후 `npm test` 로 회귀 확인. 모바일(390 폭) 줄바꿈은 Task 13 스모크에서 눈으로 본다.

- [ ] **Step 5: Commit**

```bash
git add js/shop/sale-window.js js/spaces/cafe.js tests/halloween-sale-window.test.mjs tests/premium-shop-wiring.test.mjs index.html
git commit -m "feat: 🎃 season tag on shop rows and sale param on premium_row_view" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
(스타일을 `index.html` 이 아닌 다른 파일에 넣었다면 그 파일을 add.)

---

### Task 7: 걷는 자국 2종 — 조형 + 입자

**Files:**
- Create: `js/cosmetics/trail-fx-sprites.js`
- Modify: `js/cosmetics/trail.js`(조형 표 `marksFor` 안), `js/cosmetics/trail-fx.js`
- Test: `tests/halloween-trail.test.mjs`

**Interfaces:**
- Consumes: 시안 `sims/halloween-trail-sim.html` — 이식 원본: 호박 조형 `pumpkinGeo`(≈195행)·`lanternCell`(≈223행), 박쥐 스프라이트 `drawBat`(≈117행)·아틀라스 `makeAtlas`(≈78행)·`makePoints`(≈157행)·`helixCell`(≈335행). **줄 번호는 근사치 — 함수 이름으로 찾는다.**
- Produces: `FX_IDS` 에 `'pumpkin_glow'`,`'bat_swirl'` 포함 · `spawnBat(pos, rnd)` · `createTrailFx` 의 `points` 는 **THREE.Group**(점 입자 Points + 박쥐 스프라이트 Points) — `game.js` 의 `scene.add(trailFx.points)`·`.parent` 사용은 그대로 동작 · `onStamp(id, at, opts)` 가 두 id 를 처리.

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-trail.test.mjs — node 는 three 를 못 불러 소스·순수 함수만 검사한다(기존 trail-fx.test.mjs 와 같은 방식)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FX_IDS, spawnBat, particleStep } from '../js/cosmetics/trail-fx.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🎃 FX 등록 — 호박등·박쥐 회오리', () => {
  assert.ok(FX_IDS.includes('pumpkin_glow'));
  assert.ok(FX_IDS.includes('bat_swirl'));
  assert.ok(FX_IDS.includes('firefly') && FX_IDS.includes('rainbow'), '기존 FX 유지');
});

test('🦇 박쥐 입자 — 나선으로 오르며 수명이 다하면 null', () => {
  let n = 0; const r = () => (n = (n + 0.37) % 1);
  let p = spawnBat({ x: 0, y: 0, z: 0 }, r);
  assert.equal(p.kind, 'bat');
  const y0 = p.y;
  p = particleStep(p, 0.5);
  assert.ok(p.y > y0, '위로 오른다');
  assert.ok(Math.hypot(p.x - p.bx, p.z - p.bz) > 0, '나선으로 돈다');
  assert.equal(particleStep({ ...p, age: p.life - 0.01 }, 0.1), null);
});

test('🎃 조형 표에 두 자국이 있다 · 입자 파일은 THREE 를 인자로 받는다', () => {
  const trail = read('../js/cosmetics/trail.js');
  assert.match(trail, /pumpkin_glow:\s*\(g, s, o\)/);
  assert.match(trail, /bat_swirl:\s*\(g, s, o\)/);
  const spr = read('../js/cosmetics/trail-fx-sprites.js');
  assert.match(spr, /export function createBatSprites\(THREE/);
  assert.doesNotMatch(spr, /^import .*from 'three'/m, 'THREE 는 인자로 받는다(node 테스트)');
});

test('🎃 points 는 Group — game.js 의 scene.add(trailFx.points) 가 그대로 동작', () => {
  assert.match(read('../js/cosmetics/trail-fx.js'), /const points = new THREE\.Group\(\)/);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/halloween-trail.test.mjs`
Expected: FAIL — `spawnBat` is not exported.

- [ ] **Step 3: Implement**

(a) **순수 함수** `js/cosmetics/trail-fx.js`:
```js
export const FX_IDS = Object.freeze(['firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl']);
const EMBER_HEX = 0xff9a3c;     // 🎃 불씨 — 블룸 임계 아래의 주황
const MOON_HEX = 0xdcd2ff;      // 🦇 달가루

/** 🦇 박쥐 한 마리 — 발자국에서 나선으로 오른다(kind 'bat' 은 스프라이트 Points 로 그린다) */
export function spawnBat(pos, rnd) {
  return { kind: 'bat', x: pos.x, y: pos.y + 0.1, z: pos.z, bx: pos.x, bz: pos.z,
    vy: 0.5 + rnd() * 0.2, age: 0, life: 1.8 + rnd() * 0.5, phase: rnd() * 6.28, turns: 1.2 + rnd() * 0.6,
    r0: 0.12, r1: 0.42 + rnd() * 0.12, hex: 0xc9b8ff, size: 0.3 };
}
```
`particleStep` 의 `age` 계산·수명 검사 직후, 기존 `sway` 계산 앞에 박쥐 분기를 추가:
```js
  if (p.kind === 'bat') {
    const k = age / p.life, ang = p.phase + k * p.turns * Math.PI * 2, rad = p.r0 + (p.r1 - p.r0) * k;
    return { ...p, age, x: p.bx + Math.cos(ang) * rad, z: p.bz + Math.sin(ang) * rad, y: p.y + p.vy * dt };
  }
```
`alphaOf` 에 `fade` 계산 다음 줄로 `if (p.kind === 'bat') return Math.min(1, p.age * 4) * fade;` 추가.

(b) **스프라이트 Points** `js/cosmetics/trail-fx-sprites.js` (신규): 시안의 `drawBat`·`makeAtlas`·`makePoints` 를 이식한다.
- 시안 `drawBat(c, S, a, st)` 은 날개 짓 프레임(`st`)을 아틀라스에 그린다 — 그대로 옮긴다.
- 시안의 전역(`THREE`, `env`, `night`)에 의존하는 부분은 인자로 바꾼다: `export function createBatSprites(THREE, { cap = 16 } = {})` → 반환 `{ points, setBats(list, nightLevel), dispose() }`. `points` 는 `THREE.Points`(시안 `makePoints` 방식 — 아틀라스 UV 를 점마다 주는 ShaderMaterial), `frustumCulled = false`, `depthWrite = false`, 일반(Normal) 혼합.
- 모든 지오메트리·텍스처는 이 파일에서 만들고 `dispose()` 로 정리. 파일 상단 주석에 시안 출처와 "THREE 는 인자" 를 적는다.

(c) `createTrailFx` 수정:
```js
import { createBatSprites } from './trail-fx-sprites.js';
...
export function createTrailFx(THREE, { cap = 64, rnd = Math.random, blending = 'additive' } = {}) {
  // 기존 점 입자 Points 변수 이름 points → dots 로만 바꾼다(내용 동일)
  const bats = createBatSprites(THREE, { cap: 16 });
  const points = new THREE.Group();           // game.js·purchase-reveal 이 scene/root 에 add 하는 단일 핸들
  points.add(dots, bats.points);
```
`onStamp` 에 두 분기 추가:
```js
    if (id === 'pumpkin_glow') {
      for (let i = 0; i < 2; i++) push(spawnSpark(at, EMBER_HEX, rnd));        // 🎃 불씨 2개(점 입자 재사용)
      return { tint: null };
    }
    if (id === 'bat_swirl') {
      push(spawnBat(at, rnd));
      for (let i = 0; i < 2; i++) push(spawnSpark(at, MOON_HEX, rnd));         // 🦇 달가루
      return { tint: null };
    }
```
`update` 에서 `live` 를 점 입자(`kind !== 'bat'`)와 박쥐(`kind === 'bat'`)로 나눠, 점 입자는 기존 방식으로, 박쥐는 `bats.setBats(batList, nightLevel)` 로 그린다. `clear()` 는 둘 다 비운다. 반환 키는 그대로 `{ points, onStamp, update, clear }`.

(d) **바닥 조형** `js/cosmetics/trail.js` `marksFor` 의 표(예: `firefly:` 항목 근처)에 추가:
```js
    //  🎃 꼬마 호박등 — 결 있는 납작 호박 + 꼭지 + 얼굴(밝은 주황). 시안 sims/halloween-trail-sim.html lanternCell(A).
    //     바닥 소품이 주인공이라 입체다. 한 자국 = 단일 메시(bake) — 색은 정점색으로, 재질 종류를 늘리지 않는다.
    //     얼굴 색은 블룸 임계(0.85) 아래의 밝은 주황(0xffd27a).
    pumpkin_glow: (g, s, o) => { /* 아래 "본문" 참고 */ },
    //  🦇 박쥐 회오리 — 바닥엔 연보랏빛 달가루 원판만. 주인공은 위로 도는 박쥐(trail-fx.js).
    bat_swirl: (g, s, o) => {
      put(g, new THREE.Mesh(new THREE.CircleGeometry(s * 0.78, 14), film(0xcfc2ff, o * 0.30)), 0, 0.004, 0, false)
        .rotation.x = -Math.PI / 2;
    },
```
**`pumpkin_glow` 본문 = 시안 코드의 이식:** 시안 `pumpkinGeo(night)`(≈195~222행)의 정점 변형 루프(6결 납작 구 + 결 음영)를 복사해 `SphereGeometry(s * 0.62, 14, 10)` 위에서 돌리고(`night` 인자는 상수 `false` 로), 몸통 `film(0xe8863a, o)`, 꼭지 `film(0x5f8f4a, o)`(작은 원기둥), 얼굴 눈 2개·입 1개(`film(0xffd27a, o)` 납작 도형, 시안 `lanternCell` 의 `faceShapes` 윤곽), 바닥 따뜻한 원판 `film(0xffa347, o * 0.25)` 순으로 `put(g, mesh, x, y, z, false)`. `put`·`film` 은 같은 파일의 기존 헬퍼. 최종 코드에 위 `/* … */` 자리표시 주석이 남지 않아야 한다.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/halloween-trail.test.mjs tests/trail-fx.test.mjs tests/trail-marks.test.mjs tests/trail-fx-wiring.test.mjs tests/trail-walk.test.mjs`
Expected: PASS (기존 trail 테스트 포함 — `points` 가 Group 이 되어 깨지는 단언이 있으면 **Group 계약에 맞게만** 고친다).

- [ ] **Step 5: 시각 확인은 Task 13** — `sims/halloween-verify.html` 이 생기면 시안 캡처(`dev/active/halloween-premium/look/trail-pc-night.png`)와 나란히 본다.

- [ ] **Step 6: Commit**

```bash
git add js/cosmetics/trail.js js/cosmetics/trail-fx.js js/cosmetics/trail-fx-sprites.js tests/halloween-trail.test.mjs
git commit -m "feat: 🎃🦇 pumpkin_glow and bat_swirl trails (marks, embers, bat sprites)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 부위 가시 규칙 + 스킨 디스패치 뼈대

**Files:**
- Modify: `js/cosmetics/skin-rules.js`, `js/cosmetics/skin.js`, `js/game.js`(호출 2곳, 약 3403·3597행)
- Create(빈 뼈대): `js/cosmetics/skin-ghost.js`, `js/cosmetics/skin-witch.js`
- Test: `tests/halloween-skin-rules.test.mjs`, `tests/skin-wiring.test.mjs`(단언 갱신)

**Interfaces:**
- Produces: `skinPartVisible(part, cos) → boolean` — `'sprout'`·`'skinhead'` 는 머리 칸이 비었을 때만, `'skinback'` 은 등 칸이 비었을 때만, 그 외는 true. `showSkinParts(group, cos)`(skin.js). `SKIN_IDS` 에 4개 추가. `applySkin` 이 4개 id 를 디스패치.
- 규칙 근거(스펙 외 결정 — 사용자 보고 사항): 스킨이 머리·등을 덮는 부위(나이트캡 후드 끝·마녀 모자·별밤 망토·빗자루)는 머리·등 꾸미기를 입으면 숨긴다 — 기존 정령 새싹(`sproutVisible`)과 같은 선례.

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-skin-rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skinPartVisible, sproutVisible } from '../js/cosmetics/skin-rules.js';
import { SKIN_IDS } from '../js/cosmetics/skin.js';

const empty = { equipped: { head: null, back: null } };
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('머리 부위 — 머리 칸이 비었을 때만(새싹·후드 끝·마녀 모자)', () => {
  for (const part of ['sprout', 'skinhead']) {
    assert.equal(skinPartVisible(part, empty), true, part);
    assert.equal(skinPartVisible(part, { equipped: { head: 'cap' } }), false, part);
  }
});

test('등 부위 — 등 칸이 비었을 때만(별밤 망토·빗자루)', () => {
  assert.equal(skinPartVisible('skinback', empty), true);
  assert.equal(skinPartVisible('skinback', { equipped: { back: 'pack' } }), false);
});

test('그 외 부위·null 꾸미기는 늘 보인다 · sproutVisible 은 그대로', () => {
  assert.equal(skinPartVisible('belly', { equipped: { head: 'cap', back: 'cape' } }), true);
  assert.equal(skinPartVisible('skinhead', null), true);
  assert.equal(sproutVisible({ equipped: { head: 'cap' } }), false);
});

test('SKIN_IDS 4종 추가 · applySkin 이 모두 디스패치 · game.js 는 showSkinParts 를 쓴다', () => {
  const ids = ['ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry'];
  for (const id of ids) assert.ok(SKIN_IDS.includes(id), id);
  const skin = read('../js/cosmetics/skin.js');
  for (const id of ids) assert.match(skin, new RegExp(`skinId === '${id}'`), id);
  assert.match(skin, /export function showSkinParts\(group, cos\)/);
  const game = read('../js/game.js');
  assert.match(game, /showSkinParts\(charGroup, cos\)/);
  assert.match(game, /showSkinParts\(built\.group, cos\)/);
});
```

- [ ] **Step 2: Run to verify fail**

Run: `node --test tests/halloween-skin-rules.test.mjs`
Expected: FAIL — `skinPartVisible is not a function`.

- [ ] **Step 3: Implement**

`js/cosmetics/skin-rules.js` 에 추가(기존 `sproutVisible` 은 그대로 둔다):
```js
/** 🧥 스킨 부위 표식(userData.part)별 가시 규칙 — 머리·등을 덮는 부위는 그 칸이 비었을 때만 보인다.
 *  'sprout'(🌱 정령 새싹)·'skinhead'(후드 끝·마녀 모자) = 머리 칸 · 'skinback'(망토·빗자루) = 등 칸.
 *  모자를 쓰면 스킨 모자가 뚫고 나와 보였던 정령 새싹(2026-10-01)과 같은 이유 */
export function skinPartVisible(part, cos) {
  const eq = cos?.equipped;
  if (part === 'sprout' || part === 'skinhead') return !eq?.head;
  if (part === 'skinback') return !eq?.back;
  return true;
}
```
`js/cosmetics/skin.js`:
```js
import { applyGhostNightcap, applyGhostCloud } from './skin-ghost.js';
import { applyWitchClassic, applyWitchStarry } from './skin-witch.js';
import { skinPartVisible } from './skin-rules.js';

export const SKIN_IDS = Object.freeze(['forest_spirit', 'plush_doll', 'ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry']);
...
export function applySkin(THREE, built, skinId) {
  if (skinId === 'forest_spirit') applySpirit(THREE, built);
  else if (skinId === 'plush_doll') applyPlush(THREE, built);
  else if (skinId === 'ghost_nightcap') applyGhostNightcap(THREE, built);
  else if (skinId === 'ghost_cloud') applyGhostCloud(THREE, built);
  else if (skinId === 'witch_classic') applyWitchClassic(THREE, built);
  else if (skinId === 'witch_starry') applyWitchStarry(THREE, built);
  return built.group;
}

/** 🧥 머리·등을 덮는 스킨 부위 켜고 끄기 — 표식(part)만 건드린다. 판정은 skin-rules.js skinPartVisible */
export function showSkinParts(group, cos) {
  group?.traverse(o => {
    const part = o.userData?.part;
    if (part === 'sprout' || part === 'skinhead' || part === 'skinback') o.visible = skinPartVisible(part, cos);
  });
}
```
(기존 `showSprout` 은 남겨 둔다.) **빈 뼈대**로 import 가 깨지지 않게 먼저 만든다:
```js
// js/cosmetics/skin-ghost.js
export function applyGhostNightcap(THREE, built) { return built.group; }   // Task 9 에서 채운다
export function applyGhostCloud(THREE, built) { return built.group; }
// js/cosmetics/skin-witch.js
export function applyWitchClassic(THREE, built) { return built.group; }    // Task 10 에서 채운다
export function applyWitchStarry(THREE, built) { return built.group; }
```
`js/game.js`: `skin.js` import 줄에 `showSkinParts` 를 추가하고, 기존 두 호출을 교체한다.
```js
  showSkinParts(charGroup, cos);        // 3403행 근처 — 🌱 모자·🎒 가방을 입으면 스킨의 머리·등 부위를 숨긴다
  showSkinParts(built.group, cos);      // 3597행 근처 — 입어보기 꾸미기도 같은 규칙
```
(`cos` 는 그 자리에서 쓰던 변수 이름과 같다 — 기존 `showSprout(…, sproutVisible(cos))` 줄의 `cos`.) `sproutVisible` import 가 다른 곳에서 안 쓰이면 제거.

- [ ] **Step 4: Run to verify pass**

Run: `node --test tests/halloween-skin-rules.test.mjs tests/skin-rules.test.mjs tests/skin-wiring.test.mjs tests/skin-art.test.mjs tests/skin-parts.test.mjs`
Expected: PASS. `skin-wiring.test.mjs` 가 `showSprout(…, sproutVisible(cos))` 소스 패턴을 기대하면 새 호출 패턴으로 **그 단언만** 고친다.

- [ ] **Step 5: Commit**

```bash
git add js/cosmetics/skin-rules.js js/cosmetics/skin.js js/cosmetics/skin-ghost.js js/cosmetics/skin-witch.js js/game.js tests/halloween-skin-rules.test.mjs tests/skin-wiring.test.mjs
git commit -m "feat: 🧥 skin part visibility rule (head/back parts hide under hats and back items) + 4 skin dispatch stubs" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 유령 스킨 2종 (나이트캡 · 구름)

**Files:**
- Modify: `js/cosmetics/skin-ghost.js`(Task 8 뼈대를 채운다), 필요 시 `js/cosmetics/skin.js`(`bakeInto`·`own`·`headOf` 를 export 로 열기)
- Test: `tests/halloween-skin-ghost.test.mjs`

**Interfaces:**
- Consumes: 시안 `sims/halloween-skin-sim.html` — `ghostNightcap`(≈317행)·`ghostCloud`(≈341행)·`ghostSheet`(≈301행)와 보조(`silhouette`≈240, `drape`≈264, `faceWindow`≈289, `put`≈224, `lathe`, `bend`, `tube`, `grow`). **본체를 읽는 법:** 시안은 `buildAnimal(a)` 근사 몸체 위에서 만들고, 게임은 `applySpirit`/`applyPlush`(skin.js)가 받는 `built` 를 쓴다 — 먼저 `skin.js` 의 `applySpirit` 을 읽어 `built` 에서 머리(`headOf`)·몸 치수(`R`, `bs`, `bodyY`, 머리 반경)를 어떻게 꺼내는지 확인하고, 시안의 `a`(동물 파라미터) 자리에 그 값을 대응시킨다.
- Produces: `applyGhostNightcap(THREE, built)`, `applyGhostCloud(THREE, built)` — `built.group` 을 제자리에서 고쳐 돌려준다. 파일 800줄 이하.

규칙(이식 시 반드시):
1. 새로 만든 모든 메시에 `userData.skinOwned = true; userData.skin = true`(skin.js 의 `own()` 와 같은 방식) → `disposeSkin` 이 지오메트리를 버린다. 캐릭터 원본 재질은 dispose 금지, 스킨 재질은 **모듈 캐시(스킨·색당 1벌)**.
2. 나이트캡 후드 끝(뾰족한 처진 끝+방울)은 `userData.part = 'skinhead'`(머리 꾸미기를 입으면 숨는다). 시트·목 리본은 항상 보인다.
3. 눈동자 판별은 시안처럼 추측하지 말고 게임의 `userData.part` 표식(`animal-faces.js`)을 쓴다 — 시안 보고가 지적한 "시안과 구현의 차이".
4. 시트 흰색·구름 흰색은 블룸 임계 0.85 아래(시안 값 유지), 시트는 밤에도 보이게 약한 발광(시안 값).
5. 드로우콜: 나이트캡 재질별 병합 후 ≈4, 구름 ≈2(시안 수치) — `bakeInto`(재질별 한 메시씩 굽기)를 쓴다.
6. 알려진 한계 처리: 구름 유령은 몸이 마시멜로라 팔이 남는다 → 도구 쥔 손이 보여야 한다. 토끼·곰·판다·병아리의 귀·볏은 시안 값 그대로. 여우·고양이 얼굴 무늬는 구름 유령에서 하얗게 덮여 윤곽과 눈으로만 읽힌다(시안 보고) — 허용, 사용자 보고 사항.

- [ ] **Step 1: Write the failing test** (소스 검사 — three 불가)

```js
// tests/halloween-skin-ghost.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/cosmetics/skin-ghost.js', import.meta.url), 'utf8');

test('👻 유령 2종 — export · 표식 · 소유 표시', () => {
  assert.match(src, /export function applyGhostNightcap\(THREE, built\)/);
  assert.match(src, /export function applyGhostCloud\(THREE, built\)/);
  assert.match(src, /part\s*=\s*'skinhead'/, '후드 끝은 머리 꾸미기에 숨는다');
  assert.match(src, /skinOwned\s*=\s*true/, 'disposeSkin 이 지오메트리를 버리게');
  assert.doesNotMatch(src, /\.dispose\(\)/, '캐릭터 원본 재질은 dispose 금지');
  assert.ok(src.split('\n').length < 800, '800줄 이하');
});
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/halloween-skin-ghost.test.mjs` → FAIL(스텁엔 `skinhead` 가 없다).
- [ ] **Step 3: Implement** — 위 규칙대로 두 함수를 `skin-ghost.js` 에 구현(시안 코드를 옮기고 규칙 1~6 적용). `skin.js` 의 `bakeInto`·`own`·`headOf` 가 필요하면 export 로 열어 쓴다(복제 금지).
- [ ] **Step 4: Run to verify pass** — `node --test tests/halloween-skin-ghost.test.mjs tests/skin-art.test.mjs tests/skin-parts.test.mjs tests/halloween-skin-rules.test.mjs` → PASS.
- [ ] **Step 5: 시각 확인은 Task 13** — 스킨은 실제 `buildAnimalMesh` 가 필요해 게임 안에서 확인한다.
- [ ] **Step 6: Commit**

```bash
git add js/cosmetics/skin-ghost.js js/cosmetics/skin.js tests/halloween-skin-ghost.test.mjs
git commit -m "feat: 👻 ghost skins — nightcap and cloud" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 마녀 스킨 2종 (클래식 고깔 · 별밤 견습)

**Files:**
- Modify: `js/cosmetics/skin-witch.js`(Task 8 뼈대를 채운다)
- Test: `tests/halloween-skin-witch.test.mjs`

**Interfaces:**
- Consumes: 시안 `sims/halloween-skin-sim.html` — `witchClassic`(≈381행)·`witchStarry`(≈427행)·`witchCone`(≈367행)·`perch`(≈375행)·`HAT_FIT`/`fitOf`(≈364행). (`witchPumpkin` 은 탈락안 — 이식하지 않는다.)
- Produces: `applyWitchClassic(THREE, built)`, `applyWitchStarry(THREE, built)`.

규칙: Task 9 의 규칙 1·3·4 동일. 추가:
1. 고깔 모자 전체는 `userData.part = 'skinhead'`. 클래식의 어깨 망토·브로치, 별밤의 짧은 망토·등 빗자루는 `userData.part = 'skinback'`(등 꾸미기를 입으면 숨는다). 목도리·띠처럼 몸에 붙는 것은 표식 없음(항상 보임).
2. **동물별 보정은 시안의 `HAT_FIT` 표를 그대로 이식**한다(토끼는 모자를 0.7배·앞으로 기울임·위로 올림 — 긴 귀와 충돌). 동물 id 는 `built` 에서 가져오는 방법을 `skin.js`·`game.js` 의 `buildAnimalMesh` 에서 확인해 맞춘다(예: `built.animalId` 가 없으면 `game.js` 가 넘기는 인자 확인). 곰·판다는 귀가 챙을 관통하는 것을 허용(시안 판단), 병아리는 볏이 모자 안에 눌리는 것을 허용.
3. 별밤의 별(발광)은 작은 면만 발광 — 블룸 임계 아래.
4. 드로우콜: 클래식 ≈5, 별밤 ≈9 — 재질별 병합.

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-skin-witch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../js/cosmetics/skin-witch.js', import.meta.url), 'utf8');

test('🧙 마녀 2종 — export · 모자는 skinhead · 망토·빗자루는 skinback', () => {
  assert.match(src, /export function applyWitchClassic\(THREE, built\)/);
  assert.match(src, /export function applyWitchStarry\(THREE, built\)/);
  assert.match(src, /part\s*=\s*'skinhead'/);
  assert.match(src, /part\s*=\s*'skinback'/);
  assert.match(src, /HAT_FIT/, '동물별 모자 보정(토끼 귀 충돌)');
  assert.match(src, /rabbit/, '토끼 보정');
  assert.match(src, /skinOwned\s*=\s*true/);
  assert.doesNotMatch(src, /witchPumpkin|호박 마녀/, '탈락안은 이식하지 않는다');
  assert.ok(src.split('\n').length < 800);
});
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/halloween-skin-witch.test.mjs` → FAIL.
- [ ] **Step 3: Implement** — 위 규칙대로.
- [ ] **Step 4: Run to verify pass** — `node --test tests/halloween-skin-witch.test.mjs tests/halloween-skin-rules.test.mjs tests/skin-art.test.mjs` → PASS.
- [ ] **Step 5: Commit**

```bash
git add js/cosmetics/skin-witch.js tests/halloween-skin-witch.test.mjs
git commit -m "feat: 🧙 witch skins — classic hat and starry apprentice" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 도구 세트 2종 (달밤 보라 · 수확제) + 우산

**Files:**
- Create: `js/cosmetics/tool-skins-halloween.js`
- Modify: `js/cosmetics/tool-skin-rules.js`, `js/cosmetics/tool-skins.js`(`themeBuilders` 반환·`UMBRELLAS` 표·`buildUmbrella` 의 테마별 장식, 약 158행·490행·514~590행)
- Modify test: `tests/tool-skins.test.mjs`
- Test: `tests/halloween-tool-skins.test.mjs`

**Interfaces:**
- Consumes: 시안 `sims/halloween-tools-sim.html` — 달밤 보라 `BT` 팔레트·`batHandle`·`starGlow`(≈363~457행), 수확제 `HV` 팔레트·`twine`·`strawKnob`·`hvHandle`·`patch`·`cobGeo`·`cob`·`strawHat`(≈458~597행), 공통 `batWingShape`(≈132)·`batSilShape`(≈140)·`pumpkinGeo`·`pumpkin`·`carved`(≈156~183)·`handle`·`calyx`·`rodFrame`·`pickArms`·`sickleBlade`(≈184~230). 시안의 `buildTool(theme, tool)`(≈598) 이 각 테마의 9종을 만드는 방식이다.
- Produces: `halloweenThemes(THREE, K) → { batnight: { axe, hoe, seed, water, sickle, shovel, hammer, rod, net }, harvest: { …9종 } }` (각 값은 `(g) => void`, 원점 = 쥐는 곳 — `tool-skins.js` 의 기존 `themeBuilders` 반환과 같은 모양). `TOOL_THEMES = ['shroom','moon','bloom','batnight','harvest']`. `UMBRELLAS.batnight`·`UMBRELLAS.harvest`.

규칙:
1. `themeBuilders(THREE, K)` 의 반환 객체에 `...halloweenThemes(THREE, K)` 를 펼쳐 넣는다. `K = kit(THREE)` 가 주는 헬퍼(`clay`, `M`, `V`, `starShape`, `petalShape`, `crescentShape`, `ext`, `dot` …)를 쓰고, 시안에만 있는 헬퍼(`batWingShape`, `pumpkinGeo`, `handle`, `cob`, …)는 `tool-skins-halloween.js` 안에 옮긴다. **새 파일 800줄 이하** — 넘으면 `tool-skins-batnight.js` / `tool-skins-harvest.js` 로 더 쪼갠다.
2. **쥐는 자리·자루 앞 오프셋을 건드리지 않는다.** 시안은 `js/data/character.js` 의 `TOOL_GRIP`·`TOOL_QREST_HOLD`, `js/data/grip.js` 의 `gripForwardZ` 를 그대로 import 해 검증했다 — 구현도 그 값을 쓰는 기존 `buildToolSkin` 경로를 그대로 탄다(새 코드는 "원점 = 쥐는 곳" 규칙만 지킨다).
3. 발광: `clay(..., { glow, k })` 로 굽는다(`setToolSkinNight` 가 밤에만 켠다). 발광은 작은 별·꼬마 호박 얼굴만(넓은 면 금지, 블룸 임계 0.85).
4. 굽기: 도구 1개 ≤ 5콜 상한. 달밤 보라는 최대 5콜(시안 평균 3.4) — Task 14 에서 실측.
5. **우산 2개는 시안이 없다**(시안의 우산 탭은 기존 3테마 간이판). 테마 팔레트로 설계한다: `UMBRELLAS.batnight = { N: 8, R: 1.08, th: 0.86, overlap: 1, shape: { w: () => 1, tip: -0.05 }, twist: Math.PI / 8 }`(보랏빛, 가장자리 박쥐 톱니 + 별 점), `UMBRELLAS.harvest = { N: 6, R: 1.0, th: 1.0, overlap: 1.2, layer: true, shape: { w: () => 1, tip: 0.04 } }`(짚빛 + 기움천). `buildUmbrella` 의 테마별 장식 분기에 두 테마를 추가한다. **구현 후 우산 스크린샷을 사용자에게 보여 승인받는다**(Task 13 Step 4).

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-tool-skins.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOL_THEMES, SKIN_TOOLS, themeOf, toolSkinOf } from '../js/cosmetics/tool-skin-rules.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🎃 테마 5종 — 기존 3 + 달밤 보라(batnight) + 수확제(harvest)', () => {
  assert.deepEqual([...TOOL_THEMES], ['shroom', 'moon', 'bloom', 'batnight', 'harvest']);
  assert.equal(themeOf('tools_batnight'), 'batnight');
  assert.equal(themeOf('tools_harvest'), 'harvest');
  assert.equal(themeOf('tools_moon'), 'moon', '기존 달밤 세트와 안 섞인다');
  assert.equal(toolSkinOf({ equipped: { tools: 'tools_harvest' } }), 'harvest');
});

test('🎃 새 테마 파일 — 9종 전부 · 우산 · themeBuilders 에 펼침', () => {
  const h = read('../js/cosmetics/tool-skins-halloween.js');
  assert.match(h, /export function halloweenThemes\(THREE, K\)/);
  for (const theme of ['batnight', 'harvest']) assert.match(h, new RegExp(`${theme}:`), theme);
  for (const tool of SKIN_TOOLS) assert.match(h, new RegExp(`\\b${tool}\\b`), `도구 ${tool}`);
  const ts = read('../js/cosmetics/tool-skins.js');
  assert.match(ts, /\.\.\.halloweenThemes\(THREE, K\)/);
  assert.match(ts, /batnight:\s*\{/);
  assert.match(ts, /harvest:\s*\{/);   // UMBRELLAS
});

test('🎃 스윙·쥐기 값은 건드리지 않는다(새 파일이 모션 상수를 정의하지 않음)', () => {
  const h = read('../js/cosmetics/tool-skins-halloween.js');
  assert.doesNotMatch(h, /TOOL_GRIP\s*=|TOOL_QREST_HOLD\s*=|[sS]wing/);
  assert.ok(h.split('\n').length < 800);
});
```
`tests/tool-skins.test.mjs` 기존 단언 갱신: `'🪓 도구 칸 — 테마 세트 3종, 각 ₩5,000'` → 기존 3종 ₩5,000 · 새 2종 ₩4,500 으로 나눈 테스트로, `ids` 기대를 5종으로, `TOOL_THEMES` 기대(`['shroom','moon','bloom']`)를 5종으로.

- [ ] **Step 2: Run to verify fail** — `node --test tests/halloween-tool-skins.test.mjs tests/tool-skins.test.mjs` → FAIL.
- [ ] **Step 3: Implement** — 위 규칙대로. `tool-skin-rules.js`: `TOOL_THEMES = Object.freeze(['shroom', 'moon', 'bloom', 'batnight', 'harvest'])`.
- [ ] **Step 4: Run to verify pass** — `node --test tests/halloween-tool-skins.test.mjs tests/tool-skins.test.mjs tests/tool-grip.test.mjs tests/tool-tiers.test.mjs tests/tool-blueprints.test.mjs` → PASS(스윙·쥐기 테스트 불변이 핵심).
- [ ] **Step 5: Commit**

```bash
git add js/cosmetics/tool-skins-halloween.js js/cosmetics/tool-skin-rules.js js/cosmetics/tool-skins.js tests/halloween-tool-skins.test.mjs tests/tool-skins.test.mjs
git commit -m "feat: 🌙🌽 batnight and harvest tool themes with umbrellas" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 박쥐 망토 2종

**Files:**
- Create: `js/cosmetics/art-bats.js`
- Modify: `js/cosmetics/art.js`(`tablesFor` 안 `BACK` 객체, 기존 `cape:` 항목 뒤 — 약 506~560행)
- Test: `tests/halloween-capes.test.mjs`

**Interfaces:**
- Consumes: 시안 `sims/halloween-tools-sim.html` — 망토 `capeKit`(≈741행)·`CAPES`(≈841행)·`CAPE_C`(≈733행)·`batWingShape`(≈132행). **A = 펼친 박쥐 날개 · C = 일반 망토 + 꼬마 박쥐** (B 는 탈락 — 이식하지 않는다). 기존 `cape:`(art.js 506행) 구조가 기준: `clothShell`(art.js 53행) 겉감·안감, 몸 타원체에서 푸는 방식, 팔 앞에서 끊는 각(`ARC`), 여우 꼬리 뒤트임.
- Produces: `buildBatWing(THREE, g, k, h)`, `buildBatCape(THREE, g, k, h)`(`h = { clay, put, P, clothShell }`) · `BACK.bat_wing`, `BACK.bat_cape` · `buildCosmetic(THREE, 'bat_wing', k)` 가 Group 반환.

규칙:
1. `art.js` 의 `tablesFor` 안에서 `BACK` 객체를 정의하는 곳 앞에 `const h = { clay, put, P, clothShell }` 로 묶어 새 파일에 넘긴다(순환 import 금지 — `art-bats.js` 는 art.js 를 import 하지 않는다). `BACK` 에 `bat_wing: (g, k) => buildBatWing(THREE, g, k, h), bat_cape: (g, k) => buildBatCape(THREE, g, k, h),` 추가.
2. 새 팔레트 색은 `art-bats.js` 안 상수(시안 `CAPE_C`)로 둔다 — `PALETTE` 변경 금지.
3. **망토 안감색이 겉으로 보이는 기존 `clothShell` 특성**은 기존 망토와 같이 둔다(시안이 `face`→`inn` 으로 맞춘 보정을 이식). 의도와 다르면 이 Task 에서 고치지 말고 사용자에게 보고.
4. 날개 A 는 꼬리 있는 동물에서 두 날개 사이로 꼬리가 지나가야 한다. 휘두를 때 팔과 안 닿게 시안의 간격(팔 굵기의 109~184%)을 유지한다.
5. 드로우콜: A ≈2 · C ≈3(시안 수치). 마지막 병합은 `buildCosmetic` 이 호출하는 `mergeStatics(g)` 에 맡긴다.

- [ ] **Step 1: Write the failing test**

```js
// tests/halloween-capes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🦇 망토 2종 — art-bats.js export · art.js BACK 표에 등록', () => {
  const b = read('../js/cosmetics/art-bats.js');
  assert.match(b, /export function buildBatWing\(THREE, g, k, h\)/);
  assert.match(b, /export function buildBatCape\(THREE, g, k, h\)/);
  assert.doesNotMatch(b, /from '\.\/art\.js'/, '순환 import 금지');
  const a = read('../js/cosmetics/art.js');
  assert.match(a, /bat_wing:\s*\(g, k\)\s*=>\s*buildBatWing\(THREE, g, k, h\)/);
  assert.match(a, /bat_cape:\s*\(g, k\)\s*=>\s*buildBatCape\(THREE, g, k, h\)/);
});

test('🦇 탈락안(B 뾰족 짧은 망토)은 이식하지 않는다', () => {
  assert.doesNotMatch(read('../js/cosmetics/art-bats.js'), /톱니|jagged|serrated/i);
});
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/halloween-capes.test.mjs` → FAIL.
- [ ] **Step 3: Implement** — 위 규칙대로.
- [ ] **Step 4: Run to verify pass** — `node --test tests/halloween-capes.test.mjs tests/cosmetics-catalog.test.mjs tests/tool-skins.test.mjs` → PASS(`tool-skins.test.mjs` 에 망토·팔 간격 단언이 있으면 그대로 통과해야 한다).
- [ ] **Step 5: Commit**

```bash
git add js/cosmetics/art-bats.js js/cosmetics/art.js tests/halloween-capes.test.mjs
git commit -m "feat: 🦇 bat wing and bat cape back items" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 실제 모듈 확인 페이지 + 게임 안 스모크

**Files:**
- Create: `sims/halloween-verify.html`
- Create: `dev/active/halloween-premium/look/verify-*.png`(캡처)

- [ ] **Step 1: 확인 페이지** — `sims/halloween-tools-sim.html` 의 장면 틀(three importmap·낮밤·4동물)을 복사해, **시안의 인라인 조형 대신 실제 모듈**을 import 한다:
  - 자국: `buildTrailMark(THREE, 'pumpkin_glow'|'bat_swirl', 1, animalId)` + `createTrailFx(THREE)` 로 `onStamp` 를 일정 간격으로 호출(고정 스텝 시계, 시안 `?t=` 방식).
  - 도구: `buildToolSkin(THREE, 'batnight'|'harvest', toolId)` 9종 + `buildUmbrella(THREE, theme)`.
  - 망토: `buildCosmetic(THREE, 'bat_wing'|'bat_cape', k)` (k 는 `sims/cosmetic-sim.html` 의 `anchorsOf` 와 같은 모양).
  - 콘솔 에러 0, 쿼리 `?mode=day|night&t=3.1`.
- [ ] **Step 2: 서버·캡처** — `python3 scripts/serve.py 8110` (백그라운드). 헤드리스 Chrome/Playwright 로 PC 1280×800·모바일 390×844, 낮·밤 캡처 → `dev/active/halloween-premium/look/verify-{trail,tools,cape}-{pc,mo}-{day,night}.png`. **시안 캡처와 나란히 열어** 같은 모양인지 확인(자국 확정 2·도구 2·망토 2). 다르면 이식 오류 — 해당 Task 로 돌아가 고친다.
- [ ] **Step 3: 게임 안 스모크(스킨 포함)** — `preview_start` 로 게임을 띄우고 `?dbg`. 브라우저 콘솔에서 `const s = __state(); s.cosmetics.owned.push('witch_classic','witch_starry','ghost_nightcap','ghost_cloud','bat_wing','bat_cape','pumpkin_glow','bat_swirl','tools_batnight','tools_harvest');` (`__state()` 가 살아 있는 참조인지 먼저 확인: ☰→🧥 옷장에 새 항목이 보이는지). 옷장에서 하나씩 장착해 캐릭터·자국·도구·망토를 눈으로 본다. 확인 항목:
  - 7종 동물에서 스킨 관통·부유 없음(토끼+마녀 모자 보정 포함)
  - 머리 꾸미기를 입으면 마녀 모자·후드 끝이 숨고, 가방·망토를 입으면 별밤 망토·빗자루가 숨는다
  - 도구 9종을 쥐고 휘두를 때 모션 불변·팔 관통 없음, 비 오는 날 우산 2종
  - 구매 연출(Task 5): `boxburst` 로 망토가 입혀진 캐릭터가 나온다 — 개발 세션 현금 구매 흐름(`cashAvailable` = 상점 열림 또는 개발 세션)으로 재생. 안 되면 콘솔에서 `playPurchaseReveal({ itemId: 'bat_wing', mode: 'boxburst', card: revealCardOf(findItem('bat_wing')), buildShowcase })` 를 직접 호출.
  - 상점 시즌 태그: 시계를 판매 창 안으로 두고(콘솔에서 `Date.now` 오버라이드 — **코드 수정·커밋 금지**) 새 상품 행·태그(모바일 390 폭 줄바꿈 포함)가 뜨는지, 창 밖에서 숨는지.
- [ ] **Step 4: 사용자에게 보고할 항목** — 우산 2종 스크린샷(시안이 없었음)을 보여 승인받는다. 승인 전 병합 금지.
- [ ] **Step 5: Commit**

```bash
git add sims/halloween-verify.html dev/active/halloween-premium/look
git commit -m "chore: 🎃 verify page rendering the real halloween modules" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 성능 실측 · 전체 검증 · 리뷰

**Files:** (측정·검증 — 필요 시 Task 7·11 수정)

- [ ] **Step 1: 드로우콜 실측** — 메모리 `draw-call-optimization.md` 의 측정법을 따른다. 항목: 호박불 자국(걸으며 12개 자국 + 입자), 박쥐 회오리, 달밤 보라 도구(9종 순서대로 쥘 때 최대), 마녀 별밤(스킨), 망토 C. **상한:** 모바일 기준 기존 프리미엄과 같은 수준(기존 반딧불 자국·플러시 스킨 대비 +3콜 이내 목표). 넘으면: 호박불은 입자·메시를 합쳐 줄이고, 달밤 보라 도구는 재질 버킷을 합친다. 수치를 `dev/active/halloween-premium/halloween-premium-context.md` 에 기록.
- [ ] **Step 2: 전체 테스트**

Run: `npm test 2>&1 | tail -15`
Expected: `# fail 0`, 통과 수 ≥ Task 0 기준선 + 신규 테스트.

- [ ] **Step 3: Paddle 등록 드라이런**

Run: `node scripts/paddle-seed.mjs --dry-run`
Expected: 표에 17개(기존 7 + 신규 10), 금액 `4000/4900/4500` 이 위 표와 일치. **실제 등록(키 필요)은 하지 않는다.**

- [ ] **Step 4: 접점 누락 점검** — `grep -n "firefly" sql/analytics/admin_analytics.sql` 로 상품 id 를 나열한 SQL 이 있는지 본다(현재는 `firefly_swing` 이벤트명 한 줄뿐이라 상품 id 목록이 아님). 있으면 후속 작업으로 기록만 한다. `item_ids` 컬럼은 자유 텍스트(`sql/migrations/migrate_checkout_events.sql:18`)라 SQL 변경 불필요.
- [ ] **Step 5: 코드 리뷰** — `code-reviewer` 서브에이전트로 `git diff main...HEAD` 리뷰, CRITICAL·HIGH 수정. 보안: `security-reviewer` — premium-row 가 결제 노출을 결정하므로 한정 상품이 기간 밖·웹 밖에서 결제 버튼을 못 그리는지 확인.
- [ ] **Step 6: 비밀 스캔** — 공개 저장소이므로 푸시 전에 실행:

Run: `git grep -nE "AIza|GOCSPX-|pdl_ntfset_|sk_live" -- . ':!node_modules'`
Expected: 결과 없음.

- [ ] **Step 7: 사용자에게 최종 보고** — 변경 요약, 실측 수치, 우산 스크린샷, 알려진 한계(웹 전용·승인 대기·구름 유령 얼굴 무늬·머리/등 꾸미기 시 스킨 부위 숨김), 병합 승인 요청. **병합·푸시·배포는 사용자 승인 후에만.**

---

## Release Runbook (사용자 승인 후 — 이 계획의 Task 가 아님)

1. **병합·배포 4곳 동시**(웹·토스·Play·itch — 메모리 `deploy-checklist.md`): 웹에서 산 상품을 앱에서도 입어야 하므로 옛 클라이언트가 새 id 를 모르는 일이 없게 **판매 시작 전에** 4곳을 배포한다. 푸시는 main + feat/capacitor-app 둘 다. 이 시점엔 기간 전이라 아무도 못 산다.
2. **Paddle 승인 후**: ① `PADDLE_ENV=production PADDLE_API_KEY=… node scripts/paddle-seed.mjs` (키체인 `calmforest-paddle-live`) → `price-ids.js` 자동 기입 ② 대시보드에서 상품·가격 확인 ③ `SALE_WINDOWS.halloween.from` 을 오픈일로 확정 → 웹 배포.
3. **판매 중**: 다음 날 BigQuery 로 `premium_row_view`(`sale='halloween'`)·`cosmetic_tryon`·`cash_checkout_*`·웹훅 `checkout_events` 재검증(메모리 `feature-tracking-checklist.md`).
4. **종료일**: Paddle 대시보드에서 10개 상품의 Price 를 **보관(Archive)**.
5. 소식함 공지(`notices_admin.html`) — 토스 출시 후.
6. 환불·약관 문구가 한정 상품에 맞는지(`refund.html` "미사용 14일" 조건 손질) 확인.

---

### Task 15 (추가 — 사용자 지시 2026-10-06 "다 되면 paddle에도 가격 등록해라"): Paddle 라이브 가격 등록

**Files:** Modify `js/shop/price-ids.js`(스크립트가 자동 기입), `tests/halloween-catalog.test.mjs`.
- [ ] Step 1: `node scripts/paddle-seed.mjs --dry-run` 로 17개 중 신규 10개만 만들어질 목록 확인(키 불필요).
- [ ] Step 2: 키체인 `calmforest-paddle-live` 에서 키를 읽어(출력·로그 금지) `PADDLE_ENV=production node scripts/paddle-seed.mjs` — 기존 7개는 `custom_data.item_id` 로 재사용(수정·삭제 금지), 신규 10개만 생성. 금액이 다르면 경고만(바꾸지 않음).
- [ ] Step 3: `price-ids.js` 의 신규 10칸이 `pri_…` 로 채워졌는지, 기존 7칸 값이 그대로인지 diff 로 확인.
- [ ] Step 4: `tests/halloween-catalog.test.mjs` 의 "priceId 승인 전 null" 단언을 "pri_ 형식 문자열 · 서로 유일" 로 교체. 전체 `npm test` 0 fail.
- [ ] Step 5: 커밋(`price-ids.js` 와 테스트만; 키·응답 원문은 어떤 파일에도 남기지 않는다).
