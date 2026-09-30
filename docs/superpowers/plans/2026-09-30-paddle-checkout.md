# 💳 Paddle 현금 결제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 꾸미기 18종·펫 4종의 비어 있던 현금 칸을 Paddle 결제로 열고, 구매 이력을 클라이언트가 못 쓰는 서버 원장에 남긴다.

**Architecture:** 클라이언트(웹·로그인 유저만)가 Paddle.js 오버레이로 결제하면 Paddle 이 Worker 의 `/api/paddle-webhook` 으로 서명된 이벤트를 보내고, Worker 가 `purchases` 원장에 service key 로 기록한다. 게임은 부팅과 결제 직후에 원장을 읽어 `cosmetics.owned`/`pets` 에 합친다. 아이템 판정은 웹훅의 price_id 를 카탈로그에서 역조회한다(가격표 단일 출처).

**Tech Stack:** Paddle Billing(Paddle.js v2, webhooks) · Cloudflare Worker(functions/api, WebCrypto HMAC) · Supabase(PostgREST, RLS) · 순수 ESM 모듈 + `node --test`

**Spec:** [docs/superpowers/specs/2026-09-30-paddle-checkout-design.md](../specs/2026-09-30-paddle-checkout-design.md)

## Global Constraints

- 현금 버튼 조건은 정확히 `PLATFORM === 'web' && state.online && !state.isGuest && item.price.cash` (스펙 §5-1). 다른 플랫폼은 코인 버튼만.
- 가격 라벨은 코인 등급으로 정한다: ≤900🪙→`₩1,500`, 1,200~1,800🪙→`₩2,500`, ≥2,200🪙→`₩3,900`, 펫→`₩4,900` (§2-2). Price 는 항목마다 하나, 공유 금지.
- 웹훅은 `request.text()` 원문으로 서명 검증, ts 허용 오차 300초, 실패 401, 시크릿 미설정 503, DB 실패 500 (§4).
- item 은 `custom_data` 가 아니라 price_id 역조회로만 정한다. user_id 만 custom_data 에서 읽는다 (§4-2).
- 새 코드는 game.js 에 몰지 않는다 — `js/shop/*.js`, `functions/api/*`. game.js 는 호출 줄만 (메모리 split-files-not-gamejs).
- 새 UI 문구는 사용자 선검수 후 반영. 새 문구는 토스트 3건·설정 버튼 2건·입구 링크 줄·페이지 3장이며 Task 9·10 에서 검수받는다. 버튼 라벨 `₩2,500` 은 문구가 아니다.
- Paddle 도메인 심사: 상품 설명·가격·약관·환불·개인정보가 **로그인 없이** 내비게이션으로 닿아야 한다. 별도 마케팅 홈페이지는 필요 없다 — 입구(로그인 화면)에 링크 줄이면 된다 (Task 10).
- 트래킹 파라미터 축은 키값(`item_id: 'straw_hat'`). 금액은 GA4 에 보내지 않는다 (§9).
- 커밋 메시지는 `<type>: <description>` 영어 + 이모지, 본문 끝 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- 작업은 브랜치 `feat/paddle-checkout` 에서 한다. main 은 다른 세션이 쓴다(메모리 worktree-pitfalls).
- 코드 변경 후 반드시 `npm test` 전체 통과. "unrelated" 라며 실패 무시 금지.

---

## File Structure

| 파일 | 역할 | 상태 |
|---|---|---|
| `js/shop/price-ids.js` | 카탈로그 id → Paddle priceId 22칸. **사용자가 대시보드 값을 붙여 넣는 유일한 곳**. null 이면 현금 버튼 없음 | 신규 |
| `js/shop/cash.js` | `cashLabel(coins)` 등급표 · `cashFor(id, coins)` → `{priceId,label}|null` · `PET_CASH_LABEL` (순수) | 신규 |
| `js/cosmetics/catalog.js` | `price.cash` 를 `cashFor` 로 채운다 | 수정 |
| `js/pet/rules.js` | `PET_KINDS[].cash` 추가 | 수정 |
| `sql/migrations/migrate_purchases.sql` | 원장 DDL + RLS | 신규 |
| `functions/api/_paddle.js` | 서명 검증 · price 역조회 인덱스 · 이벤트→원장 행 · 환불 대상 (순수, WebCrypto) | 신규 |
| `functions/api/paddle-webhook.js` | `onRequestPost` — 검증 → PostgREST insert/patch → 상태 코드 | 신규 |
| `worker/index.js` | `/api/paddle-webhook` 라우트 | 수정 |
| `wrangler.jsonc` | `PADDLE_WEBHOOK_SECRET` 시크릿 안내 주석 | 수정 |
| `js/shop/entitlements.js` | `applyPurchases(gameState, rows)` 순수 병합 | 신규 |
| `js/shop/purchases.js` | `syncPurchases()` — fetch → applyPurchases → 게임 반영 훅 · `awaitGrant()` 폴링 | 신규 |
| `js/supabase-client.js` | `fetchPurchases()` | 수정 |
| `js/shop/paddle.js` | Paddle.js 지연 로드 · `openCheckout()` · 이벤트 콜백 | 신규 |
| `js/config.js` | `CONFIG.PADDLE = { token, env }` | 수정 |
| `js/game.js` | `gameState.cashOwned` 기본값 · applySave 복원 · enterGame 부팅 병합 호출 · `purchaseHooks()` | 수정(소폭) |
| `js/spaces/cafe.js` | 가게 줄에 현금 버튼(꾸미기·펫) | 수정 |
| `index.html` | `.sh-buys` CSS · ⚙️ 설정 버튼 2개 · 로그인 화면 링크 줄 | 수정 |
| `js/i18n-en.js` | 새 문구 영어 | 수정 |
| `pages/terms.html` `pages/refund.html` `pages/shop.template.html` | 심사용 페이지 | 신규 |
| `scripts/build-web.mjs` | 페이지 3장 배포 + shop 표 생성 | 수정 |
| `tests/cash.test.mjs` `tests/paddle.test.mjs` `tests/paddle-webhook.test.mjs` `tests/entitlements.test.mjs` `tests/purchases-sync.test.mjs` | 테스트 | 신규 |
| `tests/cosmetics-catalog.test.mjs` `tests/pet-rules.test.mjs` | cash 형태 잠금 | 수정 |
| `dev/active/paddle-checkout/*.md` | dev docs 3종 | 신규 |

---

### Task 0: 브랜치 · dev docs

**Files:**
- Create: `dev/active/paddle-checkout/paddle-checkout-plan.md`, `paddle-checkout-context.md`, `paddle-checkout-tasks.md`

- [ ] **Step 1: 브랜치 만들기**

```bash
git checkout -b feat/paddle-checkout
```

- [ ] **Step 2: dev docs 3종 만들기**

`paddle-checkout-plan.md` 는 이 계획 문서의 링크와 "Task 1~11" 목록만. `paddle-checkout-context.md`:

```markdown
# paddle-checkout · context
Last Updated: 2026-09-30

## 핵심 파일
- 스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md
- 계획: docs/superpowers/plans/2026-09-30-paddle-checkout.md
- 가격표 단일 출처: js/cosmetics/catalog.js + js/pet/rules.js (cash 칸) · priceId 는 js/shop/price-ids.js
- 원장: sql/migrations/migrate_purchases.sql · 웹훅: functions/api/paddle-webhook.js

## 의사결정
- 웹만 · 로그인 유저만 · 서버 원장(A안) — 스펙 §0
- item 은 price_id 역조회, custom_data 는 user_id 만 — §4-2
- cashOwned 세이브 필드로 코인/현금 구분 — §6-1
- 별도 홈페이지 없음 — 입구 화면 링크 줄로 심사 요건 충족

## 외부 의존(사용자)
- Paddle 샌드박스 토큰·웹훅 시크릿·priceId 22개 — 받기 전엔 price-ids.js 전부 null(현금 버튼 안 뜸)
```

`paddle-checkout-tasks.md` 는 Task 1~11 체크박스.

- [ ] **Step 3: Commit**

```bash
git add dev/active/paddle-checkout
git commit -m "docs: 💳 paddle-checkout dev docs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 1: 가격표 — cash 칸 채우기

**Files:**
- Create: `js/shop/price-ids.js`, `js/shop/cash.js`, `tests/cash.test.mjs`
- Modify: `js/cosmetics/catalog.js:17-42`, `js/pet/rules.js:21-26`
- Modify: `tests/cosmetics-catalog.test.mjs:21-26`, `tests/pet-rules.test.mjs`

**Interfaces:**
- Produces: `cashLabel(coins:number) → string`, `cashFor(id:string, coins:number|null) → {priceId,label}|null`, `PET_CASH_LABEL`, `PRICE_IDS` (frozen object, 22 keys), `ITEMS[i].price.cash`, `PET_KINDS[i].cash`

- [ ] **Step 1: 실패하는 테스트 쓰기 — `tests/cash.test.mjs`**

```js
// tests/cash.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashLabel, cashFor, PET_CASH_LABEL } from '../js/shop/cash.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';
import { ITEMS } from '../js/cosmetics/catalog.js';
import { PET_KINDS } from '../js/pet/rules.js';

test('등급표 — 코인 가격으로 현금 라벨이 정해진다(스펙 §2-2)', () => {
  assert.equal(cashLabel(600), '₩1,500');
  assert.equal(cashLabel(900), '₩1,500');
  assert.equal(cashLabel(1200), '₩2,500');
  assert.equal(cashLabel(1800), '₩2,500');
  assert.equal(cashLabel(2200), '₩3,900');
  assert.equal(cashLabel(2600), '₩3,900');
  assert.equal(PET_CASH_LABEL, '₩4,900');
});

test('priceId 가 없으면 cash 는 null — 현금 버튼이 안 그려진다', () => {
  assert.equal(cashFor('nope', 1000), null);
});

test('PRICE_IDS 는 꾸미기 18 + 펫 4 = 22칸, 값은 null 이거나 pri_ 로 시작', () => {
  const keys = Object.keys(PRICE_IDS);
  assert.equal(keys.length, 22);
  for (const it of ITEMS) assert.ok(keys.includes(it.id), it.id);
  for (const k of PET_KINDS) assert.ok(keys.includes(k.id), k.id);
  for (const [k, v] of Object.entries(PRICE_IDS)) assert.ok(v === null || /^pri_[a-z0-9]+$/.test(v), `${k}: ${v}`);
  const ids = Object.values(PRICE_IDS).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, 'priceId 는 항목마다 하나 — 공유하면 역조회가 안 된다');
});

test('카탈로그 cash 칸 — priceId 가 있는 항목만 {priceId,label}, 라벨은 등급표와 일치', () => {
  for (const it of ITEMS) {
    const pid = PRICE_IDS[it.id];
    if (!pid) { assert.equal(it.price.cash, null, it.id); continue; }
    assert.deepEqual(it.price.cash, { priceId: pid, label: cashLabel(it.price.coins) }, it.id);
  }
  for (const k of PET_KINDS) {
    const pid = PRICE_IDS[k.id];
    if (!pid) { assert.equal(k.cash, null, k.id); continue; }
    assert.deepEqual(k.cash, { priceId: pid, label: PET_CASH_LABEL }, k.id);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/cash.test.mjs`
Expected: FAIL — `Cannot find module '../js/shop/cash.js'`

- [ ] **Step 3: `js/shop/price-ids.js` 만들기**

```js
// js/shop/price-ids.js
// =============================================================
//  calm forest · 💳 Paddle priceId 표 — 카탈로그 id → Paddle 대시보드의 Price id
//  ------------------------------------------------------------
//  ▶ **사용자가 대시보드 값을 붙여 넣는 유일한 곳.** null 이면 그 항목은 현금으로 못 산다
//    (가게가 현금 버튼을 안 그린다). 샌드박스와 라이브의 id 가 다르다 — 승인 후 전부 교체.
//  ▶ Price 는 항목마다 하나. 같은 값을 두 항목에 쓰면 웹훅의 price_id 로 아이템을 못 정한다
//    (tests/cash.test.mjs 가 유일성을 잠근다).
//  ▶ 라벨(₩2,500)은 여기 없다 — js/shop/cash.js 가 코인 등급으로 정한다(스펙 §2-2).
// =============================================================
export const PRICE_IDS = Object.freeze({
  // 🎩 머리
  beanie: null, cap: null, mushroom: null, straw_hat: null, flower_crown: null, leaf_band: null, star_pin: null,
  // 🧣 목
  scarf: null, bell: null, bowtie: null,
  // 🎒 등
  pack: null, basket: null, cape: null,
  // 👣 발자국
  paw: null, drop: null, flower: null, star: null, sparkle: null,
  // 🐾 펫
  leaf: null, spirit: null, bird: null, golem: null,
});
```

- [ ] **Step 4: `js/shop/cash.js` 만들기**

```js
// js/shop/cash.js
// =============================================================
//  calm forest · 💳 현금 가격표 규칙 (순수 — THREE/DOM 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §2
//  ▶ 라벨은 코인 등급이 정한다. 대시보드 가격을 바꾸면 여기 표도 같이 고친다 — 라벨은 표시일 뿐
//    실제 청구액은 Paddle 이 정한다(통화·세금 포함).
//  ▶ priceId 는 js/shop/price-ids.js. null 이면 cash 도 null.
// =============================================================
import { PRICE_IDS } from './price-ids.js';

/** [코인 상한, 라벨] — 오름차순. 마지막 칸이 나머지 전부 */
export const CASH_TIERS = Object.freeze([[900, '₩1,500'], [1800, '₩2,500'], [Infinity, '₩3,900']]);
export const PET_CASH_LABEL = '₩4,900';

export function cashLabel(coins) {
  for (const [max, label] of CASH_TIERS) if (coins <= max) return label;
  return CASH_TIERS[CASH_TIERS.length - 1][1];
}

/** id 의 현금 칸. coins 가 null 이면 펫(고정 라벨) */
export function cashFor(id, coins) {
  const priceId = PRICE_IDS[id];
  if (!priceId) return null;
  return { priceId, label: coins == null ? PET_CASH_LABEL : cashLabel(coins) };
}
```

- [ ] **Step 5: 카탈로그에 cash 붙이기 — `js/cosmetics/catalog.js`**

파일 머리 주석의 "price.cash 는 전부 null" 두 줄을 아래로 바꾼다:

```js
//  ▶ price.cash 는 js/shop/cash.js 가 채운다 — priceId(js/shop/price-ids.js)가 있는 항목만 { priceId, label }.
//    null 이면 UI 는 현금 버튼을 안 그린다. 라벨은 코인 등급표(스펙 2026-09-30 §2-2).
```

`const P = coins => ({ coins, cash: null });` 를 지우고 `ITEMS` 선언을 이렇게 바꾼다 (항목 18줄 전부 `price: P(1600)` → `coins: 1600`):

```js
import { cashFor } from '../shop/cash.js';

const RAW = [
  // 🎩 머리 — dome 4 · low 3
  { id: 'beanie',       slot: 'head', ico: '🧶', name: '털모자',        coins: 1600, earSafe: 'dome' },
  { id: 'cap',          slot: 'head', ico: '🧢', name: '캡',            coins: 1500, earSafe: 'dome' },
  { id: 'mushroom',     slot: 'head', ico: '🍄', name: '버섯 모자',     coins: 1800, earSafe: 'dome' },
  { id: 'straw_hat',    slot: 'head', ico: '👒', name: '밀짚모자',      coins: 1200, earSafe: 'dome' },
  { id: 'flower_crown', slot: 'head', ico: '💐', name: '화관',          coins: 1400, earSafe: 'low'  },
  { id: 'leaf_band',    slot: 'head', ico: '🍃', name: '나뭇잎 머리띠', coins: 800,  earSafe: 'low'  },
  { id: 'star_pin',     slot: 'head', ico: '⭐', name: '별 머리핀',     coins: 600,  earSafe: 'low'  },
  // 🧣 목
  { id: 'scarf',  slot: 'neck', ico: '🧣', name: '목도리',      coins: 900 },
  { id: 'bell',   slot: 'neck', ico: '🔔', name: '방울 목걸이', coins: 700 },
  { id: 'bowtie', slot: 'neck', ico: '🎀', name: '나비 넥타이', coins: 850 },
  // 🎒 가방 — 가방류는 옆구리, 망토만 등
  { id: 'pack',   slot: 'back', ico: '🎒', name: '메신저 가방', coins: 1500, anchor: 'side' },
  { id: 'basket', slot: 'back', ico: '🧺', name: '바구니',      coins: 1200, anchor: 'side' },
  { id: 'cape',   slot: 'back', ico: '🦸', name: '망토',        coins: 1800, anchor: 'back' },
  // 👣 발자국 — 값이 오를수록 바닥에 있던 게 공중으로 올라온다
  { id: 'paw',     slot: 'trail', ico: '🐾', name: '발바닥', coins: 700,  tier: '기본' },
  { id: 'drop',    slot: 'trail', ico: '💧', name: '물방울', coins: 900,  tier: '기본' },
  { id: 'flower',  slot: 'trail', ico: '🌸', name: '꽃',     coins: 1500, tier: '고급' },
  { id: 'star',    slot: 'trail', ico: '⭐', name: '별',     coins: 2200, tier: '특별' },
  { id: 'sparkle', slot: 'trail', ico: '✨', name: '반짝이', coins: 2600, tier: '특별' },
];

export const ITEMS = Object.freeze(RAW.map(({ coins, ...it }) => Object.freeze({ ...it, price: { coins, cash: cashFor(it.id, coins) } })));
```

⚠️ 기존 항목 줄의 `price: P(…)` 가 하나라도 남으면 `it.price.coins` 가 undefined 가 된다 — `grep -c "P(" js/cosmetics/catalog.js` 가 0 인지 확인.

- [ ] **Step 6: 펫에 cash 붙이기 — `js/pet/rules.js`**

```js
import { cashFor } from '../shop/cash.js';

export const PET_KINDS = Object.freeze([
  { id: 'leaf',   ico: '🍃', name: '씨앗이', blurb: '바람이 데려온 씨앗' },
  { id: 'spirit', ico: '✨', name: '빛정령', blurb: '빛나라에서 온 조각' },
  { id: 'bird',   ico: '🐦', name: '피앙새', blurb: '노래를 잃고 온 새' },
  { id: 'golem',  ico: '🫘', name: '꼬마돌', blurb: '개울에서 굴러온 돌' },
].map(k => Object.freeze({ ...k, cash: cashFor(k.id, null) })));   // 💳 현금 칸 — priceId 없으면 null(스펙 2026-09-30 §2-1)
```

- [ ] **Step 7: 기존 테스트 갱신 — `tests/cosmetics-catalog.test.mjs` 의 "현금 칸은 전부 null" 테스트를 교체**

```js
test('현금 칸 — null 이거나 {priceId,label} 둘 다 있는 객체(스펙 2026-09-30 §2-1)', () => {
  for (const it of ITEMS) {
    const c = it.price.cash;
    assert.ok(c === null || (typeof c.priceId === 'string' && typeof c.label === 'string'), `${it.id} 의 cash 형태`);
    assert.ok(Number.isInteger(it.price.coins) && it.price.coins > 0, `${it.id} 코인 가격`);
  }
});
```

`tests/pet-rules.test.mjs` 끝에 추가:

```js
test('펫 cash 칸 — null 이거나 {priceId,label}(스펙 2026-09-30 §2-1)', () => {
  for (const k of PET_KINDS) {
    assert.ok('cash' in k, k.id);
    assert.ok(k.cash === null || (typeof k.cash.priceId === 'string' && typeof k.cash.label === 'string'), k.id);
  }
});
```

- [ ] **Step 8: 전체 테스트 통과 확인**

Run: `npm test`
Expected: 전부 PASS (cash 4건 포함). `grep -c "P(" js/cosmetics/catalog.js` → 0.

- [ ] **Step 9: Commit**

```bash
git add js/shop/price-ids.js js/shop/cash.js js/cosmetics/catalog.js js/pet/rules.js tests/cash.test.mjs tests/cosmetics-catalog.test.mjs tests/pet-rules.test.mjs
git commit -m "feat: 💳 cash price slots — coin-tier labels, priceId table (all null until Paddle products exist)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 원장 테이블 SQL

**Files:**
- Create: `sql/migrations/migrate_purchases.sql`

- [ ] **Step 1: 마이그레이션 파일 쓰기**

```sql
-- =============================================================
--  calm forest · 💳 현금 구매 원장 (purchases)
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회). 멱등.
--  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §3
--
--  ▶ Paddle 웹훅(functions/api/paddle-webhook.js)만 쓴다 — service key. 클라이언트는 본인 행 select 만.
--  ▶ 환불·차지백은 행을 지우지 않고 revoked_at 만 찍는다(분쟁 기록).
--  ▶ event_id 가 멱등 키 — Paddle 은 같은 알림을 여러 번 보낼 수 있다(라이브 3일간 60회 재시도).
-- =============================================================

create table if not exists public.purchases (
  id              bigint generated always as identity primary key,
  event_id        text not null unique,        -- '<notification_id>:<price_id>' — 항목당 1행
  transaction_id  text not null,               -- txn_… — 환불이 이 값으로 찾아온다
  user_id         uuid not null references auth.users(id) on delete cascade,
  item_id         text not null,               -- 카탈로그/펫 id ('straw_hat', 'leaf')
  kind            text not null check (kind in ('cosmetic', 'pet')),
  price_id        text not null,               -- pri_…
  amount          integer,                     -- 결제 총액(통화 최소 단위, Paddle details.totals.total)
  currency        text,                        -- 'KRW' | 'USD' …
  occurred_at     timestamptz not null,        -- Paddle occurred_at
  revoked_at      timestamptz,                 -- 환불·차지백 승인 시각. null = 유효
  raw             jsonb,                       -- 웹훅 data 원문
  created_at      timestamptz not null default now()
);

create index if not exists idx_purchases_user on public.purchases (user_id);
create index if not exists idx_purchases_txn  on public.purchases (transaction_id);

alter table public.purchases enable row level security;

drop policy if exists "own purchases select" on public.purchases;
create policy "own purchases select" on public.purchases
  for select using ((select auth.uid()) = user_id);
-- insert/update 정책은 두지 않는다 → anon/authenticated 는 쓸 수 없다. Worker 의 service key 만 쓴다.
```

- [ ] **Step 2: 정책 수 확인**

Run: `grep -c "create policy" sql/migrations/migrate_purchases.sql`
Expected: `1` (select 정책 하나뿐 — insert 정책이 있으면 클라이언트가 쓸 수 있게 된다)

- [ ] **Step 3: Commit**

```bash
git add sql/migrations/migrate_purchases.sql
git commit -m "feat: 💳 purchases ledger table — service-key writes only, own-row select

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(실제 적용은 Task 11 에서 사용자가 SQL Editor 로 1회 실행.)

---

### Task 3: 웹훅 순수 로직 — 서명 검증 · 이벤트 매핑

**Files:**
- Create: `functions/api/_paddle.js`, `tests/paddle.test.mjs`

**Interfaces:**
- Consumes: `ITEMS` (`js/cosmetics/catalog.js`), `PET_KINDS` (`js/pet/rules.js`) — Task 1 의 `cash.priceId`
- Produces:
  - `parseSignature(header:string) → {ts:number, h1:string[]}|null`
  - `hmacHex(secret:string, msg:string) → Promise<string>`
  - `verifySignature({header, rawBody, secret, now?:number(초), toleranceSec?}) → Promise<{ok:boolean, reason?:'bad_header'|'stale'|'bad_sig'}>`
  - `priceIndex() → Map<priceId, {itemId, kind:'cosmetic'|'pet'}>`
  - `ledgerRows(evt, index?) → {rows: Row[], skipped: string[]}`; Row = `{event_id, transaction_id, user_id, item_id, kind, price_id, amount, currency, occurred_at, raw}`
  - `revokeTarget(evt) → {transaction_id, revoked_at}|null`
  - `TOLERANCE_SEC = 300`

- [ ] **Step 1: 실패하는 테스트 — `tests/paddle.test.mjs`**

```js
// tests/paddle.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSignature, hmacHex, verifySignature, priceIndex, ledgerRows, revokeTarget, TOLERANCE_SEC } from '../functions/api/_paddle.js';

const SECRET = 'pdl_ntfset_test_secret';
const NOW = 1_800_000_000;   // 초
async function sign(body, ts = NOW) { return `ts=${ts};h1=${await hmacHex(SECRET, `${ts}:${body}`)}`; }

test('parseSignature — ts 와 h1(여러 개 가능)을 읽는다, 형식이 틀리면 null', () => {
  assert.deepEqual(parseSignature('ts=123;h1=' + 'a'.repeat(64)), { ts: 123, h1: ['a'.repeat(64)] });
  assert.equal(parseSignature('ts=123;h1=' + 'a'.repeat(64) + ';h1=' + 'b'.repeat(64)).h1.length, 2);
  assert.equal(parseSignature('garbage'), null);
  assert.equal(parseSignature(null), null);
  assert.equal(parseSignature('ts=abc;h1=' + 'a'.repeat(64)), null);
});

test('verifySignature — 올바른 서명 통과', async () => {
  const body = '{"event_type":"transaction.completed"}';
  assert.deepEqual(await verifySignature({ header: await sign(body), rawBody: body, secret: SECRET, now: NOW }), { ok: true });
});

test('verifySignature — 바디가 한 글자라도 다르면 거부(원문으로 검증해야 하는 이유)', async () => {
  const body = '{"a":1}';
  const r = await verifySignature({ header: await sign(body), rawBody: '{"a": 1}', secret: SECRET, now: NOW });
  assert.deepEqual(r, { ok: false, reason: 'bad_sig' });
});

test('verifySignature — ts 가 5분 넘게 오래되면 거부, 5분 안이면 통과', async () => {
  const body = '{}';
  assert.equal(TOLERANCE_SEC, 300);
  assert.equal((await verifySignature({ header: await sign(body, NOW - 301), rawBody: body, secret: SECRET, now: NOW })).reason, 'stale');
  assert.equal((await verifySignature({ header: await sign(body, NOW - 299), rawBody: body, secret: SECRET, now: NOW })).ok, true);
});

test('verifySignature — 헤더 없음/깨짐은 bad_header', async () => {
  assert.equal((await verifySignature({ header: null, rawBody: '{}', secret: SECRET, now: NOW })).reason, 'bad_header');
});

test('priceIndex — cash 가 있는 항목만 priceId → {itemId, kind}', () => {
  const idx = priceIndex();
  for (const [pid, v] of idx) { assert.match(pid, /^pri_/); assert.ok(['cosmetic', 'pet'].includes(v.kind)); assert.equal(typeof v.itemId, 'string'); }
});

const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const idx = new Map([['pri_hat', { itemId: 'straw_hat', kind: 'cosmetic' }], ['pri_leaf', { itemId: 'leaf', kind: 'pet' }]]);
const txnEvt = (over = {}) => ({
  event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T01:02:03.000Z',
  data: { id: 'txn_1', currency_code: 'KRW', custom_data: { user_id: UID, item_id: 'straw_hat' },
          details: { totals: { total: '2500' } }, items: [{ price: { id: 'pri_hat' }, quantity: 1 }], ...over },
});

test('ledgerRows — transaction.completed → 항목당 1행, event_id = ntf:price', () => {
  const { rows, skipped } = ledgerRows(txnEvt(), idx);
  assert.deepEqual(skipped, []);
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.event_id, 'ntf_1:pri_hat');
  assert.equal(r.transaction_id, 'txn_1');
  assert.equal(r.user_id, UID);
  assert.equal(r.item_id, 'straw_hat');
  assert.equal(r.kind, 'cosmetic');
  assert.equal(r.price_id, 'pri_hat');
  assert.equal(r.amount, 2500);
  assert.equal(r.currency, 'KRW');
  assert.equal(r.occurred_at, '2026-09-30T01:02:03.000Z');
  assert.equal(r.raw.id, 'txn_1');
});

test('ledgerRows — item 은 custom_data 가 아니라 price_id 로 정한다', () => {
  const { rows } = ledgerRows(txnEvt({ custom_data: { user_id: UID, item_id: 'sparkle' } }), idx);
  assert.equal(rows[0].item_id, 'straw_hat');
});

test('ledgerRows — 모르는 price_id 는 skipped 로, 나머지는 기록', () => {
  const { rows, skipped } = ledgerRows(txnEvt({ items: [{ price: { id: 'pri_zzz' } }, { price: { id: 'pri_leaf' } }] }), idx);
  assert.deepEqual(skipped, ['pri_zzz']);
  assert.deepEqual(rows.map(r => [r.item_id, r.kind]), [['leaf', 'pet']]);
});

test('ledgerRows — user_id 가 없거나 uuid 가 아니면 행 없음(no_user)', () => {
  assert.deepEqual(ledgerRows(txnEvt({ custom_data: {} }), idx), { rows: [], skipped: ['no_user'] });
  assert.deepEqual(ledgerRows(txnEvt({ custom_data: { user_id: 'not-a-uuid' } }), idx), { rows: [], skipped: ['no_user'] });
});

test('ledgerRows — 다른 이벤트는 빈 결과', () => {
  assert.deepEqual(ledgerRows({ event_type: 'transaction.paid', data: {} }, idx), { rows: [], skipped: [] });
});

test('revokeTarget — refund/chargeback 이 approved 일 때만', () => {
  const adj = (action, status, type = 'adjustment.updated') => ({ event_type: type, occurred_at: '2026-10-01T00:00:00.000Z', data: { action, status, transaction_id: 'txn_1' } });
  assert.deepEqual(revokeTarget(adj('refund', 'approved')), { transaction_id: 'txn_1', revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.deepEqual(revokeTarget(adj('chargeback', 'approved', 'adjustment.created')), { transaction_id: 'txn_1', revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.equal(revokeTarget(adj('refund', 'pending_approval')), null);
  assert.equal(revokeTarget(adj('credit', 'approved')), null);
  assert.equal(revokeTarget({ event_type: 'transaction.completed', data: {} }), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/paddle.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: `functions/api/_paddle.js` 구현**

```js
// functions/api/_paddle.js
// =============================================================
//  calm forest · 💳 Paddle 웹훅 순수 로직 — 서명 검증 · 이벤트 → 원장 행
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §4
//  ▶ 네트워크·env 를 만지지 않는다 — tests/paddle.test.mjs 가 잠근다. 핸들러는 paddle-webhook.js.
//  ▶ 서명: 헤더 `Paddle-Signature: ts=<unix초>;h1=<hex>` (키 교체 중엔 h1 이 둘). 서명 대상은
//    `${ts}:${원문 바디}` 의 HMAC-SHA256. 바디를 파싱 후 재직렬화하면 어긋난다 — 원문 그대로.
//  ▶ item 은 price_id 를 카탈로그에서 역조회해 정한다. custom_data 는 user_id 만 믿는다.
// =============================================================
import { ITEMS } from '../../js/cosmetics/catalog.js';
import { PET_KINDS } from '../../js/pet/rules.js';

export const TOLERANCE_SEC = 300;   // Paddle SDK 기본 5초는 시계 오차에 너무 빡빡하다
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX64 = /^[0-9a-f]{64}$/i;
const enc = new TextEncoder();

export function parseSignature(header) {
  if (typeof header !== 'string') return null;
  let ts = null; const h1 = [];
  for (const part of header.split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 'ts') ts = Number(v);
    else if (k === 'h1' && HEX64.test(v)) h1.push(v.toLowerCase());
  }
  if (!Number.isFinite(ts) || h1.length === 0) return null;
  return { ts, h1 };
}

export async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function equalHex(a, b) {   // 상수 시간 비교 — 둘 다 64자일 때만 의미 있다
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function verifySignature({ header, rawBody, secret, now = Date.now() / 1000, toleranceSec = TOLERANCE_SEC }) {
  const p = parseSignature(header);
  if (!p) return { ok: false, reason: 'bad_header' };
  if (Math.abs(now - p.ts) > toleranceSec) return { ok: false, reason: 'stale' };
  const expect = await hmacHex(secret, `${p.ts}:${rawBody}`);
  return p.h1.some(h => equalHex(expect, h)) ? { ok: true } : { ok: false, reason: 'bad_sig' };
}

/** priceId → { itemId, kind } — cash 가 있는 항목만. 가격표 단일 출처(카탈로그) */
export function priceIndex() {
  const m = new Map();
  for (const it of ITEMS) if (it.price.cash) m.set(it.price.cash.priceId, { itemId: it.id, kind: 'cosmetic' });
  for (const k of PET_KINDS) if (k.cash) m.set(k.cash.priceId, { itemId: k.id, kind: 'pet' });
  return m;
}

/** transaction.completed → 원장 행(항목당 1). 모르는 price_id 는 skipped 에 담고 계속 */
export function ledgerRows(evt, index = priceIndex()) {
  if (evt?.event_type !== 'transaction.completed') return { rows: [], skipped: [] };
  const d = evt.data || {};
  const uid = d.custom_data?.user_id;
  if (typeof uid !== 'string' || !UUID_RE.test(uid)) return { rows: [], skipped: ['no_user'] };
  const total = Number(d.details?.totals?.total);
  const rows = [], skipped = [];
  for (const it of Array.isArray(d.items) ? d.items : []) {
    const pid = it?.price?.id;
    const hit = pid && index.get(pid);
    if (!hit) { skipped.push(String(pid)); continue; }
    rows.push({
      event_id: `${evt.notification_id}:${pid}`,
      transaction_id: d.id,
      user_id: uid,
      item_id: hit.itemId,
      kind: hit.kind,
      price_id: pid,
      amount: Number.isFinite(total) ? total : null,
      currency: d.currency_code || null,
      occurred_at: evt.occurred_at,
      raw: d,
    });
  }
  return { rows, skipped };
}

/** adjustment.created/updated 중 승인된 환불·차지백만 → 취소 대상 */
export function revokeTarget(evt) {
  if (!/^adjustment\.(created|updated)$/.test(evt?.event_type || '')) return null;
  const d = evt.data || {};
  if (!['refund', 'chargeback'].includes(d.action) || d.status !== 'approved') return null;
  if (typeof d.transaction_id !== 'string') return null;
  return { transaction_id: d.transaction_id, revoked_at: evt.occurred_at };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/paddle.test.mjs`
Expected: 12 PASS. (`priceIndex` 테스트는 PRICE_IDS 가 전부 null 이면 빈 Map 이라도 통과 — 형태만 잠근다.)

- [ ] **Step 5: Commit**

```bash
git add functions/api/_paddle.js tests/paddle.test.mjs
git commit -m "feat: 💳 paddle webhook core — HMAC signature check, price_id → item mapping, refund target

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: 웹훅 핸들러 · 라우트 · 시크릿

**Files:**
- Create: `functions/api/paddle-webhook.js`, `tests/paddle-webhook.test.mjs`
- Modify: `worker/index.js:136` 근처(라우트), 상단 import · `wrangler.jsonc:31-35`(주석)

**Interfaces:**
- Consumes: Task 3 전부
- Produces: `onRequestPost({ request, env, fetchImpl = fetch, now? }) → Promise<Response>` — env: `PADDLE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, (테스트 전용) `__PRICE_INDEX`

- [ ] **Step 1: 실패하는 테스트 — `tests/paddle-webhook.test.mjs`**

```js
// tests/paddle-webhook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/paddle-webhook.js';
import { hmacHex } from '../functions/api/_paddle.js';

const SECRET = 's3cret';
const NOW = 1_800_000_000;
const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const env = { PADDLE_WEBHOOK_SECRET: SECRET, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'svc' };

async function req(body, { ts = NOW, badSig = false } = {}) {
  const h1 = badSig ? 'f'.repeat(64) : await hmacHex(SECRET, `${ts}:${body}`);
  return new Request('https://calm.test/api/paddle-webhook', { method: 'POST', headers: { 'paddle-signature': `ts=${ts};h1=${h1}` }, body });
}
function fakeFetch(status = 201) {
  const calls = [];
  const f = async (url, init) => { calls.push({ url: String(url), init }); return new Response('', { status }); };
  f.calls = calls; return f;
}
const txn = JSON.stringify({ event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T00:00:00.000Z',
  data: { id: 'txn_1', currency_code: 'KRW', custom_data: { user_id: UID }, details: { totals: { total: '2500' } }, items: [{ price: { id: 'pri_unknown' } }] } });
const refund = JSON.stringify({ event_type: 'adjustment.updated', occurred_at: '2026-10-01T00:00:00.000Z', data: { action: 'refund', status: 'approved', transaction_id: 'txn_1' } });

test('시크릿이 없으면 503 — 배포 실수를 조용히 삼키지 않는다', async () => {
  const r = await onRequestPost({ request: await req(txn), env: { ...env, PADDLE_WEBHOOK_SECRET: '' }, fetchImpl: fakeFetch(), now: NOW });
  assert.equal(r.status, 503);
});

test('서명이 틀리면 401, DB 는 부르지 않는다', async () => {
  const f = fakeFetch();
  const r = await onRequestPost({ request: await req(txn, { badSig: true }), env, fetchImpl: f, now: NOW });
  assert.equal(r.status, 401);
  assert.equal(f.calls.length, 0);
});

test('JSON 이 아니면 400', async () => {
  const r = await onRequestPost({ request: await req('not json'), env, fetchImpl: fakeFetch(), now: NOW });
  assert.equal(r.status, 400);
});

test('모르는 price_id 만 있으면 200 + skipped, DB 는 부르지 않는다', async () => {
  const f = fakeFetch();
  const r = await onRequestPost({ request: await req(txn), env, fetchImpl: f, now: NOW });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).skipped, ['pri_unknown']);
  assert.equal(f.calls.length, 0);
});

test('알려진 price_id → purchases POST(ignore-duplicates), 200 + inserted:1', async () => {
  const f = fakeFetch(201);
  const idx = new Map([['pri_unknown', { itemId: 'straw_hat', kind: 'cosmetic' }]]);
  const r = await onRequestPost({ request: await req(txn), env: { ...env, __PRICE_INDEX: idx }, fetchImpl: f, now: NOW });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).inserted, 1);
  assert.equal(f.calls[0].url, 'https://x.supabase.co/rest/v1/purchases?on_conflict=event_id');
  assert.equal(f.calls[0].init.method, 'POST');
  assert.equal(f.calls[0].init.headers.Prefer, 'resolution=ignore-duplicates,return=minimal');
  const rows = JSON.parse(f.calls[0].init.body);
  assert.equal(rows[0].event_id, 'ntf_1:pri_unknown');
  assert.equal(rows[0].item_id, 'straw_hat');
});

test('환불 승인 → purchases PATCH(revoked_at), 200', async () => {
  const f = fakeFetch(204);
  const r = await onRequestPost({ request: await req(refund), env, fetchImpl: f, now: NOW });
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://x.supabase.co/rest/v1/purchases?transaction_id=eq.txn_1&revoked_at=is.null');
  assert.equal(f.calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.equal(f.calls[0].init.headers.apikey, 'svc');
});

test('DB 가 실패하면 500 — Paddle 재시도에 맡긴다', async () => {
  const r = await onRequestPost({ request: await req(refund), env, fetchImpl: fakeFetch(500), now: NOW });
  assert.equal(r.status, 500);
});

test('POST 가 아니면 405', async () => {
  const r = await onRequestPost({ request: new Request('https://calm.test/api/paddle-webhook', { method: 'GET' }), env, fetchImpl: fakeFetch(), now: NOW });
  assert.equal(r.status, 405);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/paddle-webhook.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: `functions/api/paddle-webhook.js` 구현**

```js
// functions/api/paddle-webhook.js
// =============================================================
//  calm forest · 💳 POST /api/paddle-webhook — Paddle 알림 → purchases 원장
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §4
//  ▶ 상태 코드가 곧 프로토콜이다:
//     401 서명 불일치 · 503 시크릿 미설정 · 400 JSON 아님 · 500 DB 실패(→ Paddle 이 재시도, 라이브 3일 60회)
//     200 은 "다시 보내도 소용없다" — 모르는 price_id·user_id 없음도 200 (재시도로 고쳐지지 않는다).
//  ▶ 원문 바디로 검증한다(request.text()). waitUntil 로 미루지 않는다 — 미루면 실패를 200 으로 덮는다.
//  ▶ 시크릿: `npx wrangler secret put PADDLE_WEBHOOK_SECRET`. 로컬 미러(scripts/serve.py)는 없다 —
//    Paddle 이 공개 URL 로만 보내므로 검증은 단위 테스트 + 샌드박스 실배달.
// =============================================================
import { verifySignature, ledgerRows, revokeTarget, priceIndex } from './_paddle.js';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
const log = (o) => console.log(JSON.stringify({ evt: 'paddle_webhook', ...o }));

export async function onRequestPost({ request, env, fetchImpl = fetch, now }) {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  if (!env.PADDLE_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_KEY || !env.SUPABASE_URL) {
    log({ status: 'not_configured' });
    return json({ error: 'not configured' }, 503);
  }
  const raw = await request.text();
  const v = await verifySignature({ header: request.headers.get('paddle-signature'), rawBody: raw, secret: env.PADDLE_WEBHOOK_SECRET, now });
  if (!v.ok) { log({ status: v.reason }); return json({ error: 'bad signature' }, 401); }

  let evt;
  try { evt = JSON.parse(raw); } catch { log({ status: 'bad_json' }); return json({ error: 'bad json' }, 400); }

  const H = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'content-type': 'application/json',
  };
  const base = `${env.SUPABASE_URL}/rest/v1/purchases`;

  const { rows, skipped } = ledgerRows(evt, env.__PRICE_INDEX || priceIndex());   // __PRICE_INDEX 는 테스트 전용 주입
  if (rows.length) {
    const r = await fetchImpl(`${base}?on_conflict=event_id`, {
      method: 'POST', headers: { ...H, Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(rows),
    });
    if (!r.ok) { log({ type: evt.event_type, txn: rows[0].transaction_id, status: 'db_insert_fail', code: r.status }); return json({ error: 'db' }, 500); }
  }

  const rv = revokeTarget(evt);
  if (rv) {
    const r = await fetchImpl(`${base}?transaction_id=eq.${encodeURIComponent(rv.transaction_id)}&revoked_at=is.null`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ revoked_at: rv.revoked_at }),
    });
    if (!r.ok) { log({ type: evt.event_type, txn: rv.transaction_id, status: 'db_revoke_fail', code: r.status }); return json({ error: 'db' }, 500); }
  }

  log({ type: evt.event_type, txn: evt.data?.id || rv?.transaction_id || null, user: rows[0]?.user_id || null,
        items: rows.map(r => r.item_id), skipped, revoked: !!rv, status: 'ok' });
  return json({ ok: true, inserted: rows.length, revoked: !!rv, skipped });
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/paddle-webhook.test.mjs`
Expected: 8 PASS

- [ ] **Step 5: Worker 라우트 — `worker/index.js`** (`/api/dex-notes` 블록 위에, import 는 다른 API import 옆에)

```js
import { onRequestPost as paddleWebhook } from '../functions/api/paddle-webhook.js';
```
```js
  // 💳 Paddle 웹훅 — 서명 검증 후 purchases 원장 기록. GET 은 없다(Paddle 만 부른다).
  if (pathname === '/api/paddle-webhook') {
    return await paddleWebhook({ request, env });
  }
```

- [ ] **Step 6: `wrangler.jsonc` 주석 추가** (CARDNEWS 주석 블록 바로 아래)

```jsonc
  // 💳 Paddle 웹훅(functions/api/paddle-webhook.js): PADDLE_WEBHOOK_SECRET 을 Secret 으로 등록합니다.
  //    없으면 엔드포인트가 503 을 돌려주고 Paddle 이 재시도합니다(조용히 200 으로 삼키지 않음).
  //    샌드박스와 라이브의 시크릿이 다릅니다 — 승인 후 교체.
```

- [ ] **Step 7: 라우트 등록 확인 + 전체 테스트**

Run: `grep -n "paddle-webhook" worker/index.js && npm test`
Expected: import 1줄 + 라우트 1줄, 테스트 전부 PASS

- [ ] **Step 8: Commit**

```bash
git add functions/api/paddle-webhook.js tests/paddle-webhook.test.mjs worker/index.js wrangler.jsonc
git commit -m "feat: 💳 /api/paddle-webhook — verified events into purchases ledger, refunds revoke

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 소유 병합 순수 함수

**Files:**
- Create: `js/shop/entitlements.js`, `tests/entitlements.test.mjs`

**Interfaces:**
- Consumes: `findItem`, `SLOTS` (`js/cosmetics/catalog.js`) · `petKindOf`, `emptyPet` (`js/pet/rules.js`)
- Produces: `applyPurchases(gameState, rows) → { patch: {cosmetics, pets, pet, cashOwned} | null, granted: {item_id,kind}[], revoked: {item_id,kind}[] }` — `rows`: `{item_id, kind, revoked_at}[] | null`. 입력 불변.

- [ ] **Step 1: 실패하는 테스트 — `tests/entitlements.test.mjs`**

```js
// tests/entitlements.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPurchases } from '../js/shop/entitlements.js';

const gs = (o = {}) => ({
  cosmetics: { owned: ['scarf'], equipped: { head: null, neck: 'scarf', back: null, trail: null } },
  pets: {}, pet: null, cashOwned: [], ...o,
});
const row = (item_id, revoked_at = null) => ({ item_id, kind: 'x', revoked_at });

test('새 결제 — owned 에 추가, granted 에 실린다, cashOwned 갱신', () => {
  const r = applyPurchases(gs(), [row('straw_hat')]);
  assert.deepEqual(r.granted, [{ item_id: 'straw_hat', kind: 'cosmetic' }]);
  assert.deepEqual(r.revoked, []);
  assert.deepEqual(r.patch.cosmetics.owned, ['scarf', 'straw_hat']);
  assert.deepEqual(r.patch.cashOwned, ['straw_hat']);
  assert.equal(r.patch.cosmetics.equipped.neck, 'scarf', '기존 장착은 건드리지 않는다');
});

test('이미 본 결제는 다시 granted 로 잡지 않는다', () => {
  const r = applyPurchases(gs({ cosmetics: { owned: ['straw_hat'], equipped: { head: 'straw_hat', neck: null, back: null, trail: null } }, cashOwned: ['straw_hat'] }), [row('straw_hat')]);
  assert.deepEqual(r.granted, []);
  assert.deepEqual(r.patch.cosmetics.owned, ['straw_hat']);
});

test('환불 — owned 에서 빼고 장착도 푼다', () => {
  const r = applyPurchases(gs({ cosmetics: { owned: ['scarf', 'straw_hat'], equipped: { head: 'straw_hat', neck: 'scarf', back: null, trail: null } }, cashOwned: ['straw_hat'] }), [row('straw_hat', '2026-10-01T00:00:00Z')]);
  assert.deepEqual(r.revoked, [{ item_id: 'straw_hat', kind: 'cosmetic' }]);
  assert.deepEqual(r.patch.cosmetics.owned, ['scarf']);
  assert.equal(r.patch.cosmetics.equipped.head, null);
  assert.deepEqual(r.patch.cashOwned, []);
});

test('원장에서 사라진 것도 환불로 본다', () => {
  const r = applyPurchases(gs({ cosmetics: { owned: ['straw_hat'], equipped: { head: null, neck: null, back: null, trail: null } }, cashOwned: ['straw_hat'] }), []);
  assert.deepEqual(r.revoked.map(x => x.item_id), ['straw_hat']);
});

test('펫 — 결제로 추가(emptyPet), 환불로 제거 + 데리고 있던 펫이면 pet=null', () => {
  const a = applyPurchases(gs(), [row('leaf')]);
  assert.deepEqual(a.granted, [{ item_id: 'leaf', kind: 'pet' }]);
  assert.deepEqual(a.patch.pets.leaf, { kind: 'leaf', name: '', works: 0, restUntil: 0 });
  const leaf = { kind: 'leaf', name: '', works: 3, restUntil: 0 };
  const b = applyPurchases(gs({ pets: { leaf }, pet: leaf, cashOwned: ['leaf'] }), [row('leaf', '2026-10-01T00:00:00Z')]);
  assert.deepEqual(b.revoked, [{ item_id: 'leaf', kind: 'pet' }]);
  assert.equal(b.patch.pets.leaf, undefined);
  assert.equal(b.patch.pet, null);
});

test('이미 산 펫이 원장에 있으면 works 를 지우지 않는다', () => {
  const leaf = { kind: 'leaf', name: '콩', works: 50, restUntil: 0 };
  const r = applyPurchases(gs({ pets: { leaf }, pet: leaf }), [row('leaf')]);
  assert.equal(r.patch.pets.leaf.works, 50);
  assert.equal(r.patch.pet, leaf, 'pet 은 pets[kind] 와 같은 객체를 가리켜야 한다');
});

test('모르는 id 는 무시하되 cashOwned 에도 넣지 않는다', () => {
  const r = applyPurchases(gs(), [row('zzz')]);
  assert.deepEqual(r.granted, []);
  assert.deepEqual(r.patch.cashOwned, []);
});

test('rows 가 null(못 읽음)이면 patch 도 null', () => {
  const g = gs({ cashOwned: ['straw_hat'], cosmetics: { owned: ['straw_hat'], equipped: { head: null, neck: null, back: null, trail: null } } });
  const r = applyPurchases(g, null);
  assert.equal(r.patch, null);
  assert.deepEqual(r.granted, []); assert.deepEqual(r.revoked, []);
});

test('입력을 바꾸지 않는다', () => {
  const g = gs();
  const snap = JSON.stringify(g);
  applyPurchases(g, [row('straw_hat'), row('leaf')]);
  assert.equal(JSON.stringify(g), snap);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/entitlements.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: `js/shop/entitlements.js` 구현**

```js
// js/shop/entitlements.js
// =============================================================
//  calm forest · 💳 원장 → 소유 병합 (순수 — THREE/DOM/네트워크 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §6
//  ▶ 원장(purchases)이 진실, 세이브의 cashOwned 는 "마지막으로 본 유효 항목" 사본이다.
//    원장에 새로 생긴 것 → 지급, 사본에는 있는데 원장에서 사라진 것 → 환불로 보고 회수.
//  ▶ 코인 구매와 현금 구매의 구분은 cashOwned 뿐이다. 같은 항목을 둘 다로 사는 경로는 UI 가 막는다('구매 완료').
//  ▶ rows 가 null(못 읽음)이면 patch 도 null — 세이브대로 간다(다음 부팅에 다시 맞춘다).
//  ▶ 테스트: tests/entitlements.test.mjs
// =============================================================
import { findItem, SLOTS } from '../cosmetics/catalog.js';
import { petKindOf, emptyPet } from '../pet/rules.js';

const kindOf = (id) => (findItem(id) ? 'cosmetic' : petKindOf(id) ? 'pet' : null);

export function applyPurchases(gs, rows) {
  if (!Array.isArray(rows)) return { patch: null, granted: [], revoked: [] };
  const live = [...new Set(rows.filter(r => r && !r.revoked_at && typeof r.item_id === 'string').map(r => r.item_id))].filter(kindOf);
  const prev = Array.isArray(gs.cashOwned) ? gs.cashOwned : [];
  const fresh = live.filter(id => !prev.includes(id));
  const gone = prev.filter(id => !live.includes(id));

  const cosmetics = { owned: [...gs.cosmetics.owned], equipped: { ...gs.cosmetics.equipped } };
  const pets = { ...gs.pets };
  let pet = gs.pet;
  const granted = [], revoked = [];

  for (const id of fresh) {
    const kind = kindOf(id);
    if (kind === 'cosmetic') { if (!cosmetics.owned.includes(id)) cosmetics.owned.push(id); }
    else if (!pets[id]) pets[id] = emptyPet(id);          // 이미 있으면 works 를 지우지 않는다
    granted.push({ item_id: id, kind });
  }
  for (const id of gone) {
    const kind = kindOf(id);
    if (!kind) continue;
    if (kind === 'cosmetic') {
      cosmetics.owned = cosmetics.owned.filter(x => x !== id);
      for (const s of SLOTS) if (cosmetics.equipped[s] === id) cosmetics.equipped[s] = null;
    } else {
      delete pets[id];
      if (pet?.kind === id) pet = null;
    }
    revoked.push({ item_id: id, kind });
  }
  return { patch: { cosmetics, pets, pet, cashOwned: live }, granted, revoked };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/entitlements.test.mjs`
Expected: 9 PASS

- [ ] **Step 5: Commit**

```bash
git add js/shop/entitlements.js tests/entitlements.test.mjs
git commit -m "feat: 💳 applyPurchases — ledger rows merged into owned cosmetics/pets, refunds revoke

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 클라이언트 원장 읽기 · 동기화 글루 · 세이브 필드

**Files:**
- Create: `js/shop/purchases.js`, `tests/purchases-sync.test.mjs`
- Modify: `js/supabase-client.js` (`fetchNotices` 아래) · `js/game.js:26`(import) · `:961` 근처(기본값) · `:2351` 근처(applySave) · `:2048` 근처(enterGame) · `:6442` 근처(`purchaseHooks`)

**Interfaces:**
- Consumes: `applyPurchases` (Task 5)
- Produces:
  - `fetchPurchases() → Promise<{item_id,kind,revoked_at}[] | null>` (supabase-client; null = 못 읽음/게스트/오프라인)
  - `syncPurchases({ gameState, fetchPurchases, hooks, via }) → Promise<{granted,revoked}|null>` — hooks: `{ applyCosmetics(cos), refreshPet(), toast(msg), track(name, params), requestSave() }`
  - `awaitGrant({ itemId, gameState, fetchPurchases, hooks, tries=10, delayMs=1000, sleep }) → Promise<boolean>`
  - `GRANT_MSG`, `LATER_MSG` (문구 상수)
  - game.js: `export function purchaseHooks()`

- [ ] **Step 1: 실패하는 테스트 — `tests/purchases-sync.test.mjs`**

```js
// tests/purchases-sync.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncPurchases, awaitGrant } from '../js/shop/purchases.js';

function world() {
  const gameState = { cosmetics: { owned: [], equipped: { head: null, neck: null, back: null, trail: null } }, pets: {}, pet: null, cashOwned: [] };
  const calls = { cos: 0, pet: 0, toasts: [], events: [], saves: 0 };
  const hooks = {
    applyCosmetics: () => calls.cos++, refreshPet: () => calls.pet++, toast: (m) => calls.toasts.push(m),
    track: (n, p) => calls.events.push([n, p]), requestSave: () => calls.saves++,
  };
  return { gameState, calls, hooks };
}

test('부팅 병합 — 새 결제가 있으면 gameState 에 반영·꾸미기 적용·저장·cash_grant(via boot)', async () => {
  const { gameState, calls, hooks } = world();
  const r = await syncPurchases({ gameState, fetchPurchases: async () => [{ item_id: 'straw_hat', kind: 'cosmetic', revoked_at: null }], hooks, via: 'boot' });
  assert.deepEqual(r.granted.map(g => g.item_id), ['straw_hat']);
  assert.deepEqual(gameState.cosmetics.owned, ['straw_hat']);
  assert.deepEqual(gameState.cashOwned, ['straw_hat']);
  assert.equal(calls.cos, 1); assert.equal(calls.pet, 0); assert.equal(calls.saves, 1);
  assert.deepEqual(calls.events, [['cash_grant', { item_id: 'straw_hat', kind: 'cosmetic', via: 'boot' }]]);
  assert.equal(calls.toasts.length, 1);
});

test('펫 결제는 refreshPet 을 부른다 · 환불은 cash_revoke', async () => {
  const { gameState, calls, hooks } = world();
  await syncPurchases({ gameState, fetchPurchases: async () => [{ item_id: 'leaf', kind: 'pet', revoked_at: null }], hooks, via: 'boot' });
  assert.equal(calls.pet, 1);
  assert.ok(gameState.pets.leaf);
  await syncPurchases({ gameState, fetchPurchases: async () => [{ item_id: 'leaf', kind: 'pet', revoked_at: '2026-10-01T00:00:00Z' }], hooks, via: 'boot' });
  assert.equal(gameState.pets.leaf, undefined);
  assert.deepEqual(calls.events.at(-1), ['cash_revoke', { item_id: 'leaf', kind: 'pet' }]);
});

test('변화가 없으면 아무 훅도 안 부른다', async () => {
  const { gameState, calls, hooks } = world();
  await syncPurchases({ gameState, fetchPurchases: async () => [], hooks, via: 'boot' });
  assert.equal(calls.cos + calls.pet + calls.saves + calls.toasts.length + calls.events.length, 0);
});

test('못 읽으면(null) null 을 돌려주고 gameState 는 그대로', async () => {
  const { gameState, calls, hooks } = world();
  gameState.cashOwned = ['straw_hat']; gameState.cosmetics.owned = ['straw_hat'];
  const r = await syncPurchases({ gameState, fetchPurchases: async () => null, hooks, via: 'boot' });
  assert.equal(r, null);
  assert.deepEqual(gameState.cosmetics.owned, ['straw_hat']);
  assert.equal(calls.saves, 0);
});

test('awaitGrant — 원장에 보일 때까지 폴링, 보이면 true 를 돌려주고 via=instant', async () => {
  const { gameState, calls, hooks } = world();
  let n = 0;
  const fetchPurchases = async () => (++n < 3 ? [] : [{ item_id: 'straw_hat', kind: 'cosmetic', revoked_at: null }]);
  const ok = await awaitGrant({ itemId: 'straw_hat', gameState, fetchPurchases, hooks, tries: 5, sleep: async () => {} });
  assert.equal(ok, true);
  assert.equal(n, 3);
  assert.deepEqual(calls.events, [['cash_grant', { item_id: 'straw_hat', kind: 'cosmetic', via: 'instant' }]]);
});

test('awaitGrant — 끝까지 안 오면 false, 토스트 없음(호출부가 안내)', async () => {
  const { gameState, calls, hooks } = world();
  const ok = await awaitGrant({ itemId: 'straw_hat', gameState, fetchPurchases: async () => [], hooks, tries: 3, sleep: async () => {} });
  assert.equal(ok, false);
  assert.equal(calls.toasts.length, 0);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/purchases-sync.test.mjs`
Expected: FAIL — module not found

- [ ] **Step 3: `js/shop/purchases.js` 구현**

```js
// js/shop/purchases.js
// =============================================================
//  calm forest · 💳 원장 동기화 글루 — fetch → applyPurchases → 게임 반영
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §6-3
//  ▶ game.js 를 import 하지 않는다. 화면 반영은 hooks 로 받는다(테스트 가능 · 순환 import 없음).
//  ▶ 호출 시점: ① 부팅(enterGame, applySave 뒤) via:'boot' ② 결제 직후 awaitGrant via:'instant'.
//  ▶ 문구 2건(GRANT_MSG·LATER_MSG)은 사용자 검수를 거친 값이다(Task 9) — 바꾸려면 다시 검수.
// =============================================================
import { applyPurchases } from './entitlements.js';

export const GRANT_MSG = '🎁 산 아이템이 도착했어요';
export const LATER_MSG = '잠시 후 다시 들어오면 도착해 있어요';

export async function syncPurchases({ gameState, fetchPurchases, hooks, via }) {
  const rows = await fetchPurchases();
  const { patch, granted, revoked } = applyPurchases(gameState, rows);
  if (!patch) return null;
  if (!granted.length && !revoked.length) return { granted, revoked };
  Object.assign(gameState, patch);                        // gameState 는 game.js 의 단일 객체 — 참조를 바꾸지 않고 필드만
  if (granted.some(g => g.kind === 'cosmetic') || revoked.some(g => g.kind === 'cosmetic')) hooks.applyCosmetics(gameState.cosmetics);
  if (granted.some(g => g.kind === 'pet') || revoked.some(g => g.kind === 'pet')) hooks.refreshPet();
  for (const g of granted) hooks.track('cash_grant', { item_id: g.item_id, kind: g.kind, via });
  for (const g of revoked) hooks.track('cash_revoke', { item_id: g.item_id, kind: g.kind });
  if (granted.length) hooks.toast(GRANT_MSG);
  hooks.requestSave();
  return { granted, revoked };
}

/** 결제 직후 — 원장에 itemId 가 보일 때까지 폴링. 보이면 true. 안 오면 false(호출부가 LATER_MSG 안내) */
export async function awaitGrant({ itemId, tries = 10, delayMs = 1000, sleep = (ms) => new Promise(r => setTimeout(r, ms)), ...args }) {
  for (let i = 0; i < tries; i++) {
    const r = await syncPurchases({ ...args, via: 'instant' });
    if (r?.granted.some(g => g.item_id === itemId)) return true;
    if (args.gameState.cashOwned?.includes(itemId)) return true;   // 이전 폴링에서 이미 들어온 경우
    await sleep(delayMs);
  }
  return false;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/purchases-sync.test.mjs`
Expected: 6 PASS

- [ ] **Step 5: `fetchPurchases` — `js/supabase-client.js` 의 `fetchNotices` 바로 아래**

```js
// ── 💳 현금 구매 원장 읽기 — RLS 로 본인 행만. null = 못 읽음(게스트·오프라인·실패) → 호출부는 세이브대로 간다 ──
export async function fetchPurchases() {
  if (!state.online || !supabase || state.isGuest) return null;
  try {
    const { data, error } = await supabase.from('purchases').select('item_id, kind, revoked_at');
    if (error) throw error;
    return data || [];
  } catch (err) { console.warn('[Supabase 폴백] 구매 원장 조회 실패(세이브대로 진행):', err?.message || err); return null; }
}
```

- [ ] **Step 6: `js/game.js` — 세이브 필드·복원·부팅 병합·훅**

(a) `gameState` 기본값, `pet: null,` 다음 줄:
```js
  cashOwned: [],                            // 💳 현금으로 산 항목 id — 원장(purchases)의 마지막 사본. 규칙은 js/shop/entitlements.js
```

(b) `applySave` 안, `if (saved.cosmetics) gameState.cosmetics = sanitizeCosmetics(saved.cosmetics);` 다음 줄:
```js
  gameState.cashOwned = Array.isArray(saved.cashOwned) ? saved.cashOwned.filter(s => typeof s === 'string') : [];   // 💳 없으면 빈 배열(옛 세이브)
```

(c) import — 기존 supabase-client import 에 `fetchPurchases` 추가, 새 import 1줄:
```js
import { saveGame, loadGame, sendBoatRun, sendSeaRecord, fetchNotices, fetchPurchases, upsertRetentionGuidanceScore, state as authState } from './supabase-client.js';
import { syncPurchases } from './shop/purchases.js';   // 💳 원장 → 소유 병합(부팅)
```

(d) `enterGame` 안, `if (load.state) applySave(load.state);` 다음 줄:
```js
  // 💳 현금 구매 원장과 맞춘다 — 웹에서 산 걸 앱·토스에서도 보이게 하는 경로. 못 읽으면 세이브대로.
  await syncPurchases({ gameState, fetchPurchases, via: 'boot', hooks: purchaseHooks() });
```

(e) `usePet`(6442행 부근) 아래에 훅 묶음(export — Task 8 의 cafe.js 가 쓴다):
```js
// 💳 원장 동기화가 화면에 손대는 통로 — js/shop/purchases.js 는 game.js 를 import 하지 않는다
export function purchaseHooks() {
  return {
    applyCosmetics: (cos) => applyCosmetics(cos),
    refreshPet: () => { usePet(gameState.pet?.kind || null); respawnPet(); },
    toast: (m) => ui.toast?.(m, 2500),
    track: trackEvent,
    requestSave,
  };
}
```

- [ ] **Step 7: 전체 테스트 + 게임 부팅 확인**

Run: `npm test`
Expected: 전부 PASS

브라우저: `preview_start`(웹 서버) → 게스트 입장 → 콘솔 오류 없음 → 게스트는 `fetchPurchases` 가 null 이라 병합이 조용히 건너뛰는지(`[Supabase 폴백]` 경고 없음) 확인.

- [ ] **Step 8: Commit**

```bash
git add js/shop/purchases.js tests/purchases-sync.test.mjs js/supabase-client.js js/game.js
git commit -m "feat: 💳 boot-time ledger sync — cashOwned save field, fetchPurchases, grant/revoke hooks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Paddle.js 로더 · 체크아웃 · CONFIG

**Files:**
- Create: `js/shop/paddle.js`
- Modify: `js/config.js` (GA4 블록 위)

**Interfaces:**
- Consumes: `CONFIG.PADDLE = { token:string, env:'sandbox'|'production' }`, `PLATFORM` (`js/platform.js`), `getLang` (`js/i18n.js`)
- Produces:
  - `cashAvailable(authState) → boolean` — `PLATFORM === 'web' && !!state.online && !state.isGuest`
  - `openCheckout({ priceId, itemId, kind, userId, email }) → Promise<void>` (Paddle.js 로드 포함; 실패 시 throw)
  - `setCheckoutHandlers({ onCompleted(ctx), onClosed(ctx) })` — ctx = `{ priceId, itemId, kind }`

- [ ] **Step 1: `js/config.js` 에 추가** (`// ── GA4 / GTM` 블록 바로 위)

```js
  // ── 💳 Paddle(현금 결제, 웹 전용) — 클라이언트 토큰은 공개값. 서버 시크릿은 wrangler secret ──
  //    env 'sandbox' 면 Paddle.Environment.set('sandbox'). 승인 후 라이브 토큰 + 'production' 으로 교체.
  //    token 이 비어 있으면 현금 버튼을 눌러도 결제창이 안 열리고 토스트만(js/spaces/cafe.js).
  PADDLE: { token: '', env: 'sandbox' },
```

- [ ] **Step 2: `js/shop/paddle.js` 구현**

```js
// js/shop/paddle.js
// =============================================================
//  calm forest · 💳 Paddle.js 지연 로더 + 오버레이 체크아웃 (웹 전용)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-30-paddle-checkout-design.md §5
//  ▶ 부팅 비용 0 — 현금 버튼을 처음 누를 때 cdn.paddle.com 스크립트를 넣는다.
//  ▶ customData 의 user_id 만 서버가 믿는다. item_id·kind 는 대시보드에서 보기 좋으라고 같이 싣는다.
//  ▶ 지급은 여기서 하지 않는다 — checkout.completed 는 "원장을 폴링하라" 신호일 뿐(js/shop/purchases.js awaitGrant).
// =============================================================
import { CONFIG } from '../config.js';
import { PLATFORM } from '../platform.js';
import { getLang } from '../i18n.js';

const PADDLE_JS = 'https://cdn.paddle.com/paddle/v2/paddle.js';
let ready = null;          // Promise<Paddle>
let current = null;        // 지금 열린 결제 { priceId, itemId, kind }
let handlers = { onCompleted: () => {}, onClosed: () => {} };

export function cashAvailable(state) {
  return PLATFORM === 'web' && !!state?.online && !state?.isGuest;
}

export function setCheckoutHandlers(h) { handlers = { ...handlers, ...h }; }

function onPaddleEvent(ev) {
  if (!current) return;
  if (ev?.name === 'checkout.completed') { const c = current; current = null; handlers.onCompleted(c); }
  else if (ev?.name === 'checkout.closed') { const c = current; current = null; handlers.onClosed(c); }
}

function loadPaddle() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    if (window.Paddle) return resolve(window.Paddle);
    const s = document.createElement('script');
    s.src = PADDLE_JS; s.async = true;
    s.onload = () => {
      try {
        if (CONFIG.PADDLE.env === 'sandbox') window.Paddle.Environment.set('sandbox');
        window.Paddle.Initialize({ token: CONFIG.PADDLE.token, eventCallback: onPaddleEvent });
        resolve(window.Paddle);
      } catch (e) { ready = null; reject(e); }
    };
    s.onerror = () => { ready = null; reject(new Error('paddle.js load failed')); };
    document.head.appendChild(s);
  });
  return ready;
}

export async function openCheckout({ priceId, itemId, kind, userId, email }) {
  if (!CONFIG.PADDLE.token) throw new Error('paddle token missing');
  const Paddle = await loadPaddle();
  current = { priceId, itemId, kind };
  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData: { user_id: userId, item_id: itemId, kind },
    customer: email ? { email } : undefined,
    settings: { displayMode: 'overlay', locale: getLang() === 'en' ? 'en' : 'ko' },
  });
}
```

- [ ] **Step 3: 문법 확인** (i18n·platform 이 `location` 을 만져 Node 에서 import 는 안 된다 — 문법만)

Run: `node --check js/shop/paddle.js && node --check js/config.js`
Expected: 출력 없음(성공)

- [ ] **Step 4: Commit**

```bash
git add js/shop/paddle.js js/config.js
git commit -m "feat: 💳 Paddle.js lazy loader + overlay checkout (web only, token in CONFIG)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: 가게 현금 버튼 (꾸미기 · 펫)

**Files:**
- Modify: `js/spaces/cafe.js` (import · `drawPetTab` 877-890행 · `drawCosMenu` 928-950행)
- Modify: `index.html:1312` 아래 CSS

**Interfaces:**
- Consumes: `cashAvailable`, `openCheckout`, `setCheckoutHandlers` (Task 7) · `awaitGrant`, `LATER_MSG` (Task 6) · `purchaseHooks` (game.js, Task 6) · `state as authState`, `fetchPurchases` (supabase-client) · `findItem` (catalog)

- [ ] **Step 1: import 추가 — `js/spaces/cafe.js` 상단**

```js
import { state as authState, fetchPurchases } from '../supabase-client.js';
import { cashAvailable, openCheckout, setCheckoutHandlers } from '../shop/paddle.js';
import { awaitGrant, LATER_MSG } from '../shop/purchases.js';
```
기존 `import { itemsOf } from '../cosmetics/catalog.js';` → `import { itemsOf, findItem } from '../cosmetics/catalog.js';`
game.js import 목록에 `purchaseHooks` 추가(알파벳 자리: `player, purchaseHooks, refreshCollectQuests, …`).

- [ ] **Step 2: 현금 버튼 + 결제 이벤트 핸들러 — `drawCosMenu` 바로 위에**

```js
// 💳 현금 결제 — 결제창이 닫히면 버튼을 되살리고, 완료면 원장을 폴링해 지급한다(지급은 원장이 결정).
const CASH_FAIL_MSG = '결제를 지금은 열 수 없어요';   // Task 9 검수 문구
let cashBusy = null;   // 결제창이 열린 항목 id — 그 버튼만 비활성
function cashButton(cash, itemId, kind, mine) {
  const btn = document.createElement('button');
  btn.className = 'sh-cash';
  btn.textContent = mine ? '구매 완료' : cash.label;
  btn.disabled = !!mine || cashBusy === itemId;
  btn.onclick = async (ev) => {
    ev.stopPropagation();
    if (btn.disabled) return;
    trackEvent('cash_checkout_open', { item_id: itemId, kind, price_id: cash.priceId });
    cashBusy = itemId; drawCosMenu();
    try {
      await openCheckout({ priceId: cash.priceId, itemId, kind, userId: authState.userId, email: authState.email });
    } catch (e) {
      console.warn('[paddle] 결제창 열기 실패:', e?.message || e);
      cashBusy = null; drawCosMenu();
      ui.toast?.(CASH_FAIL_MSG, 2500);
    }
  };
  return btn;
}
setCheckoutHandlers({
  onClosed: (c) => { trackEvent('cash_checkout_close', { item_id: c.itemId, kind: c.kind }); cashBusy = null; drawCosMenu(); },
  onCompleted: async (c) => {
    trackEvent('cash_checkout_done', { item_id: c.itemId, kind: c.kind, price_id: c.priceId });
    const t0 = Date.now();
    const ok = await awaitGrant({ itemId: c.itemId, gameState, fetchPurchases, hooks: purchaseHooks() });
    cashBusy = null;
    if (ok) {
      // 사면 바로 입힌다 / 데려간다 — 코인 구매와 같은 결
      if (c.kind === 'cosmetic') {
        gameState.cosmetics = equipCos(gameState.cosmetics, c.itemId);
        applyCosmetics(gameState.cosmetics);
        cosTryOn = null; cosPreview?.refresh(null);
        trackEvent('cosmetic_equip', { item_id: c.itemId, slot: findItem(c.itemId)?.slot, action: 'on', via: 'cash' });
      } else { switchPet(c.itemId); petView = c.itemId; }
      trackEvent('cash_grant_wait', { item_id: c.itemId, wait_ms: Date.now() - t0 });
      requestSave();
    } else ui.toast?.(LATER_MSG, 3000);
    drawCosMenu();
  },
});
```

- [ ] **Step 3: 꾸미기 줄 — `drawCosMenu` 안 `row.appendChild(btn);` 를 이렇게**

```js
    const buys = document.createElement('div');
    buys.className = 'sh-buys';
    buys.appendChild(btn);
    if (cashAvailable(authState) && it.price.cash) buys.appendChild(cashButton(it.price.cash, it.id, 'cosmetic', gameState.cosmetics.owned.includes(it.id)));
    row.appendChild(buys);
```

- [ ] **Step 4: 펫 줄 — `drawPetTab` 안 `row.appendChild(btn);` 를 이렇게**

```js
    const buys = document.createElement('div');
    buys.className = 'sh-buys';
    buys.appendChild(btn);
    if (cashAvailable(authState) && k.cash) buys.appendChild(cashButton(k.cash, k.id, 'pet', !!mine));
    row.appendChild(buys);
```

- [ ] **Step 5: CSS — `index.html` `.sh-row .sh-sub` 줄 아래**

```css
  .sh-row .sh-buys { display: flex; gap: 6px; flex: 0 0 auto; }
  .sh-row .sh-cash { background: #fff3d6; border-color: #e8c98a; }   /* 💳 현금 — 코인 버튼과 색으로 구분 */
```

- [ ] **Step 6: 브라우저 검증 — 조건 4개**

`preview_start` 웹 서버 → 카페 🎀 가게 열기.
1. 게스트: 현금 버튼 없음 — `document.querySelectorAll('.sh-cash').length === 0`.
2. 구글 로그인 + `PRICE_IDS` 에 **임시로** `straw_hat: 'pri_test'`: 밀짚모자 줄에 `₩2,500` 버튼. 누르면 token 이 비어 있어 CASH_FAIL_MSG 토스트, 버튼 복구. 검증 후 `git checkout js/shop/price-ids.js`.
3. `?platform=toss`: 현금 버튼 없음.
4. `resize_window` mobile(375px): 꾸미기 줄에서 이름·버튼 2개가 한 줄에 들어가는지 스크린샷. 넘치면 `.sh-buys { flex-wrap: wrap; justify-content: flex-end; }` 로 줄바꿈시키고 다시 캡처.

- [ ] **Step 7: 전체 테스트**

Run: `npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add js/spaces/cafe.js index.html
git commit -m "feat: 💳 cash buttons in the cosmetics/pet shop — web + logged-in only, grant via ledger polling

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: 문구 검수 · i18n

**Files:**
- Modify(검수 결과에 따라): `js/shop/purchases.js` GRANT_MSG·LATER_MSG, `js/spaces/cafe.js` CASH_FAIL_MSG, `js/i18n-en.js`

- [ ] **Step 1: 사용자에게 문구 후보 제시(ui-copy-review-first)**

| 자리 | 후보 A | 후보 B |
|---|---|---|
| 부팅 지급 토스트 | 🎁 산 아이템이 도착했어요 | 🎁 결제한 아이템을 받았어요 |
| 10초 안에 안 올 때 | 잠시 후 다시 들어오면 도착해 있어요 | 곧 도착해요 · 다시 들어오면 받을 수 있어요 |
| 결제창 못 열 때 | 결제를 지금은 열 수 없어요 | 지금은 결제할 수 없어요 · 잠시 후 다시 |
| ⚙️ 설정 버튼 | 📜 이용약관 · ↩️ 환불 정책 | 📜 이용약관 · 💳 환불 안내 |
| 입구 링크 줄 | 가격 안내 · 이용약관 · 환불 정책 · 개인정보처리방침 | 요금 · 약관 · 환불 · 개인정보 |

- [ ] **Step 2: 확정 문구를 코드에 반영하고 `js/i18n-en.js` 에 영어 추가**

```js
  '🎁 산 아이템이 도착했어요': '🎁 Your purchase has arrived',
  '잠시 후 다시 들어오면 도착해 있어요': 'It will be there next time you come in',
  '결제를 지금은 열 수 없어요': 'Checkout is unavailable right now',
  '이용약관': 'Terms of Service',
  '환불 정책': 'Refund Policy',
  '가격 안내': 'Pricing',
```
(확정 문구가 다르면 키를 그에 맞춘다. 토스트가 i18n 옵저버를 안 타면 호출부에서 `t()` 로 감싼다 — `js/i18n.js` 의 `t` 는 이미 export.)

- [ ] **Step 3: Commit**

```bash
git add js/shop/purchases.js js/spaces/cafe.js js/i18n-en.js
git commit -m "feat: 💳 reviewed copy for purchase toasts + i18n

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: 심사용 페이지 — 약관 · 환불 · 가격 안내 · 설정 메뉴 · 입구 링크

**Files:**
- Create: `pages/terms.html`, `pages/refund.html`, `pages/shop.template.html`
- Modify: `scripts/build-web.mjs:57-58` 근처 · `index.html:2302`(설정 버튼) · `index.html:2145-2147`(로그인 카드 링크 줄) · `index.html:4009-4015`(핸들러)

- [ ] **Step 1: `pages/terms.html`** — privacy.html 의 `<head>`·`<style>` 을 그대로 복사(제목만 바꾼다), 본문:

```html
<main>
  <h1>🌿 고요한 숲 이용약관</h1>
  <p class="sub">시행일: 2026년 10월 __일</p>

  <h2>1. 서비스와 운영자</h2>
  <p>‘고요한 숲’(calm forest, 이하 ‘서비스’)은 개인 개발자 <strong>[법적 이름]</strong>(이하 ‘운영자’)이 운영하는 웹 게임입니다.
     문의: <a href="mailto:cheorish.hw@gmail.com">cheorish.hw@gmail.com</a></p>

  <h2>2. 계정</h2>
  <ul>
    <li>게스트로 바로 플레이할 수 있고, 구글 계정으로 로그인하면 진행 상황이 계정에 저장됩니다.</li>
    <li>유료 아이템은 로그인한 계정에 귀속되며 다른 계정으로 옮길 수 없습니다.</li>
  </ul>

  <h2>3. 유료 아이템</h2>
  <ul>
    <li>판매하는 것은 캐릭터 꾸미기 아이템과 펫 등 <strong>게임 안에서만 쓰는 디지털 콘텐츠</strong>입니다. 실물이나 환금 가치가 없습니다.</li>
    <li>결제·세금 계산·영수증·환불 처리는 판매 대행사 <strong>Paddle.com</strong>(Merchant of Record)이 담당합니다. 카드 명세서에는 Paddle 로 표시됩니다.</li>
    <li>가격은 <a href="/shop">가격 안내</a>에 표시되며, 모든 유료 아이템은 게임 내 코인으로도 얻을 수 있습니다.</li>
    <li>환불은 <a href="/refund">환불 정책</a>을 따릅니다.</li>
  </ul>

  <h2>4. 금지 사항</h2>
  <ul>
    <li>결제·저장 데이터를 조작하거나 자동화 프로그램으로 플레이하는 행위</li>
    <li>서비스나 다른 이용자에게 피해를 주는 행위</li>
  </ul>
  <p>위반 시 계정 이용이 제한될 수 있으며, 이 경우 유료 아이템은 환불되지 않습니다.</p>

  <h2>5. 서비스 변경·종료</h2>
  <p>운영자는 콘텐츠를 추가·변경할 수 있습니다. 서비스를 종료할 때는 최소 30일 전에 게임 내 소식함으로 알립니다.</p>

  <h2>6. 개인정보</h2>
  <p><a href="/privacy">개인정보처리방침</a>을 따릅니다.</p>

  <h2>7. 준거법</h2>
  <p>이 약관은 대한민국 법을 따릅니다.</p>

  <h2>Terms of Service (English summary)</h2>
  <p>calm forest is a web game operated by an individual developer, <strong>[legal name]</strong>. Paid items are in-game digital cosmetics and pets bound to your signed-in account; they have no cash value. Payments, taxes and refunds are handled by Paddle.com as Merchant of Record. Every paid item can also be earned with in-game coins. See the <a href="/refund">Refund Policy</a> and <a href="/privacy">Privacy Policy</a>. Contact: cheorish.hw@gmail.com.</p>
</main>
<footer>고요한 숲 · calm forest — <a href="/">게임으로 돌아가기</a> · <a href="/shop">가격 안내</a> · <a href="/refund">환불 정책</a> · <a href="/privacy">개인정보처리방침</a></footer>
```

- [ ] **Step 2: `pages/refund.html`** — 같은 틀, 본문:

```html
<main>
  <h1>🌿 고요한 숲 환불 정책</h1>
  <p class="sub">시행일: 2026년 10월 __일</p>

  <h2>1. 무엇을 사는가</h2>
  <p>유료 아이템은 결제 즉시 계정에 지급되는 <strong>게임 안 디지털 콘텐츠</strong>(꾸미기·펫)입니다. 결제 후 보통 10초 안에 게임 화면에 나타나며,
     늦어도 다음 접속 때 지급됩니다.</p>

  <h2>2. 환불이 되는 경우</h2>
  <ul>
    <li>결제는 됐는데 <strong>48시간이 지나도 아이템이 지급되지 않은 경우</strong></li>
    <li>같은 아이템이 <strong>중복 결제</strong>된 경우(중복분 환불)</li>
    <li>결제 후 <strong>14일 이내</strong>이고 해당 아이템을 아직 게임 안에서 사용(장착·지시)하지 않은 경우</li>
  </ul>

  <h2>3. 환불이 어려운 경우</h2>
  <ul>
    <li>이미 장착하거나 사용한 아이템</li>
    <li>이용약관 위반으로 계정이 제한된 경우</li>
  </ul>

  <h2>4. 신청 방법</h2>
  <p>결제 영수증 메일에 있는 Paddle 링크에서 바로 신청하거나, <a href="mailto:cheorish.hw@gmail.com">cheorish.hw@gmail.com</a> 으로
     주문 번호와 사유를 보내 주세요. 처리는 판매 대행사 Paddle.com 이 하며, 승인되면 결제 수단으로 환불되고 해당 아이템은 계정에서 회수됩니다.</p>

  <h2>Refund Policy (English summary)</h2>
  <p>Paid items are in-game digital goods delivered to your account, normally within 10 seconds. Refunds are available if an item is not delivered within 48 hours, for duplicate charges, or within 14 days of purchase if the item has not been used in game. Request via the Paddle receipt link or cheorish.hw@gmail.com with your order number; Paddle.com processes the refund and the item is removed from the account.</p>
</main>
<footer>고요한 숲 · calm forest — <a href="/">게임으로 돌아가기</a> · <a href="/shop">가격 안내</a> · <a href="/terms">이용약관</a> · <a href="/privacy">개인정보처리방침</a></footer>
```

- [ ] **Step 3: `pages/shop.template.html`** — 같은 틀, 표에 `<!--ROWS-->` 자리:

```html
<main>
  <h1>🌿 고요한 숲 가격 안내</h1>
  <p class="sub">꾸미기 아이템과 펫 — 코인으로도, 현금으로도 살 수 있어요</p>
  <p>고요한 숲은 브라우저에서 바로 하는 아기자기한 농장 게임입니다. 모든 아이템은 게임 안에서 코인을 모아 살 수 있습니다.
     현금 결제는 웹에서 로그인한 계정만 가능하며, 산 아이템은 그 계정으로 어느 기기에서든 보입니다. 결제는 Paddle.com 이 처리합니다.</p>
  <div class="wrap">
  <table>
    <tr><th>구분</th><th>아이템</th><th>코인</th><th>현금</th></tr>
<!--ROWS-->
  </table>
  </div>
  <div class="note">현금 가격 칸이 비어 있는 아이템은 아직 코인으로만 살 수 있습니다. 표시가는 세금 포함이며, 결제창에서 최종 금액을 확인할 수 있습니다.</div>

  <h2>Pricing (English summary)</h2>
  <p>calm forest is a cozy farming game played in the browser. Every cosmetic item and pet can be bought with in-game coins. Cash purchase (via Paddle.com) is available on the web for signed-in accounts; the price shown at checkout is final and includes tax.</p>
</main>
<footer>고요한 숲 · calm forest — <a href="/">게임으로 돌아가기</a> · <a href="/terms">이용약관</a> · <a href="/refund">환불 정책</a> · <a href="/privacy">개인정보처리방침</a></footer>
```

- [ ] **Step 4: `scripts/build-web.mjs`** — INCLUDE 에 추가 + shop 생성

INCLUDE 의 privacy 줄 아래:
```js
  // 💳 Paddle 도메인 심사 필수 — 약관·환불·가격이 사이트 안에서 닿아야 한다. 빼면 심사 반려.
  ['pages/terms.html', 'terms.html'],     // → /terms
  ['pages/refund.html', 'refund.html'],   // → /refund
```
복사 루프가 끝난 뒤 shop.html 생성(`fs`·`path`·출력 디렉토리 변수는 build-web.mjs 상단의 기존 이름을 그대로 쓴다):
```js
// 💳 /shop — 가격표를 카탈로그에서 생성한다(가격 단일 출처). pages/shop.template.html 의 <!--ROWS--> 자리.
{
  const { ITEMS } = await import('../js/cosmetics/catalog.js');
  const { PET_KINDS, PET_PRICE } = await import('../js/pet/rules.js');
  const SLOT_KO = { head: '🎩 머리', neck: '🧣 목', back: '🎒 등', trail: '👣 발자국' };
  const row = (grp, name, coins, cash) => `    <tr><td>${grp}</td><td>${name}</td><td>${coins.toLocaleString('ko-KR')}🪙</td><td>${cash ? cash.label : '—'}</td></tr>`;
  const rows = [
    ...ITEMS.map(it => row(SLOT_KO[it.slot], `${it.ico} ${it.name}`, it.price.coins, it.price.cash)),
    ...PET_KINDS.map(k => row('🐾 펫', `${k.ico} ${k.name}`, PET_PRICE, k.cash)),
  ].join('\n');
  const tpl = await fs.readFile('pages/shop.template.html', 'utf8');
  await fs.writeFile(path.join(OUT, 'shop.html'), tpl.replace('<!--ROWS-->', rows));
}
```

- [ ] **Step 5: 설정 메뉴 + 입구 링크 줄 — `index.html`**

설정 버튼(privacy-btn 다음 줄):
```html
        <button id="terms-btn"><span class="uico">📜</span><span class="ulbl">이용약관</span></button>
        <button id="refund-btn"><span class="uico">↩️</span><span class="ulbl">환불 정책</span></button>
```
핸들러 — 토스에서는 privacy 와 같은 편도 티켓 문제(4004행 주석)가 있으므로 함께 제거한다(스펙 §8 의 "토스에서 제거하지 않는다" 를 **여기서 정정**):
```js
    if (IS_TOSS) {
      $('privacy-btn').remove(); $('delacc-btn').remove();
      $('terms-btn').remove(); $('refund-btn').remove();   // 💳 같은 편도 티켓 문제 — 토스는 자체 IAP 라 약관 링크도 필요 없다
      $('login-links')?.remove();
    } else {
      $('privacy-btn').addEventListener('click', () => openPolicyPage('/privacy', 'privacy_open'));
      $('delacc-btn').addEventListener('click', () => openPolicyPage('/delete-account', 'delete_account_open'));
      $('terms-btn').addEventListener('click', () => openPolicyPage('/terms', 'terms_open'));
      $('refund-btn').addEventListener('click', () => openPolicyPage('/refund', 'refund_open'));
    }
```
입구 링크 줄 — 로그인 카드의 `#login-lang` 버튼 **다음 줄**(Paddle 심사자가 로그인 없이 상품·약관을 찾는 통로. 새 탭으로 연다):
```html
      <!-- 💳 Paddle 도메인 심사 — 로그인 없이 가격·약관·환불·개인정보가 닿아야 한다. 토스에서는 JS 가 제거 -->
      <nav id="login-links">
        <a href="/shop" target="_blank" rel="noopener">가격 안내</a> · <a href="/terms" target="_blank" rel="noopener">이용약관</a> · <a href="/refund" target="_blank" rel="noopener">환불 정책</a> · <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a>
      </nav>
```
CSS(`#login-card` 스타일 근처):
```css
  #login-links { margin-top: 18px; font-size: 11px; color: rgba(255,255,255,.7); }
  #login-links a { color: inherit; text-decoration: underline; }
```

- [ ] **Step 6: 빌드·확인**

Run: `node scripts/build-web.mjs && ls dist/terms.html dist/refund.html dist/shop.html && grep -c "<tr>" dist/shop.html`
Expected: 파일 3개 존재, `<tr>` 23개(헤더 1 + 22)

브라우저: `/shop`, `/terms`, `/refund` 를 preview 로 열어 스타일이 privacy 와 같고 footer 링크가 서로 통하는지 확인. 로그인 화면에 링크 줄이 보이고(스크린샷, mobile 375px 도), ⚙️ 설정에 버튼 2개, 새 탭으로 열림. `?platform=toss` 에서는 링크 줄·버튼이 없음.

- [ ] **Step 7: 문구 검수** — 약관·환불 본문과 입구 링크 줄을 사용자에게 보여 주고 `[법적 이름]`·시행일을 받아 채운다. 14일·48시간 숫자도 확정받는다.

- [ ] **Step 8: Commit**

```bash
git add pages/terms.html pages/refund.html pages/shop.template.html scripts/build-web.mjs index.html
git commit -m "feat: 💳 terms / refund / pricing pages for Paddle domain review + login-screen links

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: 샌드박스 실배달 검증 · 배포 준비

**Files:** 없음(설정·검증). 결과는 `dev/active/paddle-checkout/paddle-checkout-context.md` 에 기록.

- [ ] **Step 1: 사용자 준비물 확인** — 샌드박스 클라이언트 토큰, 웹훅 시크릿, priceId(우선 1~2개라도). 없으면 여기서 멈추고 스펙 §11 목록을 전달한다.

- [ ] **Step 2: 값 반영**
  - `js/config.js` `PADDLE.token` 에 샌드박스 토큰(공개값)
  - `js/shop/price-ids.js` 에 priceId
  - `npx wrangler secret put PADDLE_WEBHOOK_SECRET` — 사용자 터미널. 값은 채팅에 적지 않는다
  - Supabase SQL Editor 에서 `sql/migrations/migrate_purchases.sql` 실행

- [ ] **Step 3: 배포(웹만)** — 저장소의 웹 배포 명령(deploy-checklist 메모리) 후:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://calmforest.cloud/api/paddle-webhook
```
Expected: `401`(서명 없음) → 라우트·시크릿 정상. `503` 이면 시크릿 미등록. `404` 면 라우트 미등록.

- [ ] **Step 4: Paddle 대시보드 → Notifications → 엔드포인트 등록** (URL, 이벤트 `transaction.completed`·`adjustment.created`·`adjustment.updated`) → "Send test" → Workers 로그에 `paddle_webhook … status:'ok'` 또는 `skipped:['pri_…']`(테스트 페이로드의 price 는 카탈로그에 없음 — 정상).

- [ ] **Step 5: 실제 샌드박스 결제** — 웹에서 구글 로그인 → 가게 → `₩2,500` → Paddle 테스트 카드 → 10초 안에 아이템 장착되는지, `purchases` 에 행 1개, GA4 DebugView 에 `cash_checkout_open → cash_checkout_done → cash_grant(via:instant)` 순서.

- [ ] **Step 6: 환불 시뮬레이션** — 대시보드에서 그 거래 환불 승인 → 로그 `revoked:true` → 게임 새로고침 → 아이템이 빠지고 `cash_revoke` 발생.

- [ ] **Step 7: 다른 플랫폼 회귀** — `?platform=toss` 로 현금 버튼·링크 줄 없음 · 부팅 병합이 오류 없이 도는지(콘솔).

- [ ] **Step 8: 기록·리뷰·커밋** — context.md 에 검증 결과와 라이브 전환 체크리스트(토큰·priceId·시크릿 3종 교체, 도메인 심사 제출) 기록. code-reviewer 에이전트 리뷰. main 병합·푸시는 사용자 지시로.

```bash
git add js/config.js js/shop/price-ids.js dev/active/paddle-checkout
git commit -m "chore: 💳 sandbox Paddle token + price ids, verification notes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-Review 메모 (스펙과 다른 점)

- 스펙 §6-2 "코인으로도 산 적 없는 것만 뺀다" — UI 가 이중 구매를 막아 판별 근거가 없다 → Task 5 는 환불 시 회수한다.
- 스펙 §6-1 은 `save-migrate.js` 를 지목했으나 그 파일은 게스트 이관 전용이고 없는 필드 기본값은 `applySave` 가 맡는 기존 패턴 → Task 6.
- 스펙 §8 "토스에서는 제거하지 않는다" — index.html 4004행의 편도 티켓 함정과 충돌 → Task 10 이 제거로 정정.
- 스펙 §9 `cash_grant.wait_ms` — `syncPurchases` 가 시각을 모르므로 Task 8 이 별도 `cash_grant_wait` 로 남긴다.
- 스펙에 없던 입구 링크 줄(Task 10) — 심사자가 로그인 없이 상품·약관을 찾을 통로. 사용자 질문(홈페이지 필요?)에 대한 답이기도 하다.
