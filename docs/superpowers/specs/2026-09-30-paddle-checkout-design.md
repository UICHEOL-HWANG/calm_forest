# 💳 Paddle 현금 결제 — 꾸미기·펫 이중 가격표의 현금 칸 열기

- 날짜: 2026-09-30
- 상태: 설계 확정, 구현 전
- 선행: [2026-09-21-cosmetics-pet-design.md](./2026-09-21-cosmetics-pet-design.md) §0·§2·§11-3 — "현금이 붙는 날 구매 이력은 서버 원장으로"
- 뒤따르는 문서: 구현 계획(writing-plans)

---

## 0. 확정된 선택 (브레인스토밍에서 합의)

| 항목 | 결정 |
|---|---|
| **결제 사업자** | **Paddle Billing** (Merchant of Record). 사업자 등록 없이 개인 셀러로 가입. 세금·환불 처리는 Paddle 몫 |
| **파는 것** | 꾸미기 카탈로그 18종 + 펫 4종. 이미 비워 둔 `price.cash` 칸을 채운다. **새 상품·새 재화 없음** |
| **채널** | **웹만.** `PLATFORM === 'web'` 에서만 현금 버튼. 구글 플레이·앱인토스는 자체 인앱 외 결제가 정책 위반이라 반려된다. itch 는 iframe 이라 제외 |
| **구매자 자격** | 로그인 유저만. 게스트는 현금 버튼을 **그리지 않는다** (안내 문구 없음) |
| **소유권의 근거** | **서버 원장**(`purchases`). 클라이언트는 원장을 읽어 소유에 합칠 뿐 쓰지 못한다 |
| **현금 가격** | 코인 등급을 따른 3단계 + 펫 (§2-2). 숫자는 Paddle 대시보드가 진짜 출처, 코드는 표시 라벨만 |

### 왜 Paddle 인가
2026-09-21 스펙은 "사업자가 없어서 결제는 나중에"로 보류했다. Paddle 은 한국 개인 셀러를 받고
판매자 대신 세금·환불을 처리하므로 그 보류 사유가 사라진다.

### 왜 웹만인가
구글 플레이 앱은 디지털 상품에 Play 결제 외 수단을 쓰면 반려된다. 앱인토스도 자체 IAP 만 허용한다.
Paddle 심사도 **제출한 도메인에서 여는 체크아웃**만 허용하므로 토스·itch 오리진은 애초에 대상이 아니다.
구매한 아이템은 계정에 묶이므로 웹에서 사면 앱·토스에서도 보인다.

---

## 1. 범위

### 이번에 만드는 것
1. `purchases` 원장 테이블 + RLS (§3)
2. `POST /api/paddle-webhook` — 서명 검증·멱등 기록·환불 취소 (§4)
3. 카탈로그 cash 칸 채우기 + 가게의 현금 버튼 + Paddle.js 오버레이 체크아웃 (§5)
4. 원장 → 소유 병합(부팅·결제 직후) (§6)
5. 심사용 페이지 3장: 이용약관·환불 정책·가격 안내 + ⚙️ 설정 메뉴 링크 (§8)
6. 트래킹 (§9) · 테스트 (§10)

### 이번에 **안** 만드는 것
- 구독·시즌 패스·코인 팩 — 상품 구조를 바꾸지 않는다
- 세이브 전체의 서버 권위화 — 현금 아이템만 원장으로 보호한다
- 토스·플레이 인앱 결제 — 채널별로 별도 설계
- 인라인 체크아웃·프로모션 코드·가격 현지화 표시(PricePreview)

---

## 2. 재화와 가격표

### 2-1. cash 칸의 모양
```js
// js/cosmetics/catalog.js
{ id: 'straw_hat', slot: 'head', ico: '👒', name: '밀짚모자',
  price: { coins: 1200, cash: { priceId: 'pri_01…', label: '₩2,500' } }, earSafe: 'dome' }
```
- `priceId` 는 Paddle 대시보드에서 만든 Price 의 id. **서버가 웹훅의 price_id 를 이 값으로 역조회**해 item 을 정한다 (§4-2).
- `label` 은 버튼에 그대로 찍는 표시 문자열. 실제 청구액은 Paddle 이 정한다(통화·세금 포함). 대시보드 가격을 바꾸면 label 도 같이 고친다 — `tests/cosmetics-catalog.test.mjs` 가 `cash` 가 있으면 두 필드 모두 있는지 잠근다.
- 펫은 `PET_KINDS` 각 항목에 같은 모양의 `cash` 를 둔다. 코인 가격은 기존 `PET_PRICE` 그대로.
- `cash: null` 인 항목은 이전과 같이 현금 버튼이 없다. 상품 등록 전이나 팔지 않기로 한 항목에 그대로 쓴다.

### 2-2. 가격 3단계 + 펫
| 코인 가격 | 현금 라벨 | 해당 항목 |
|---|---|---|
| ≤ 900🪙 | ₩1,500 | leaf_band, star_pin, scarf, bell, bowtie, paw, drop |
| 1,200~1,800🪙 | ₩2,500 | beanie, cap, mushroom, straw_hat, flower_crown, pack, basket, cape, flower |
| ≥ 2,200🪙 | ₩3,900 | star, sparkle |
| 펫 3,000🪙 | ₩4,900 | leaf, spirit, bird, golem |

Paddle 에 등록하는 Price 는 항목마다 하나(18 + 4 = 22개). 같은 단가끼리 Price 를 공유하지 않는다 —
공유하면 웹훅의 price_id 만으로 어떤 아이템인지 알 수 없다.

### 2-3. 통화
Paddle Price 의 기본 통화는 KRW 로 등록한다. 대시보드가 KRW 를 거부하면 USD 로 등록하고 label 을 `$1.99` 식으로 바꾼다 —
코드 구조는 같다. 이건 계정 개설 후 가장 먼저 확인할 항목이다.

---

## 3. 원장 — `public.purchases`

`sql/migrations/migrate_purchases.sql` (Supabase SQL Editor 에서 1회, 멱등).

```sql
create table if not exists public.purchases (
  id              bigint generated always as identity primary key,
  event_id        text not null unique,        -- Paddle notification id — 멱등 키
  transaction_id  text not null,               -- txn_… — 환불이 이 값으로 찾아온다
  user_id         uuid not null references auth.users(id) on delete cascade,
  item_id         text not null,               -- 카탈로그/펫 id ('straw_hat', 'leaf')
  kind            text not null check (kind in ('cosmetic', 'pet')),
  price_id        text not null,               -- pri_…
  amount          integer,                     -- 결제 총액(최소 단위, Paddle totals.total)
  currency        text,                        -- 'KRW' | 'USD' …
  occurred_at     timestamptz not null,        -- Paddle occurred_at
  revoked_at      timestamptz,                 -- 환불·차지백이면 채워진다. 행은 지우지 않는다
  raw             jsonb,                       -- 웹훅 data 원문(분쟁·디버깅용)
  created_at      timestamptz not null default now()
);
create index if not exists idx_purchases_user on public.purchases (user_id);
create index if not exists idx_purchases_txn  on public.purchases (transaction_id);

alter table public.purchases enable row level security;
drop policy if exists "own purchases select" on public.purchases;
create policy "own purchases select" on public.purchases
  for select using ((select auth.uid()) = user_id);
-- insert/update 정책은 두지 않는다 → 클라이언트는 쓸 수 없고, Worker 의 service key 만 쓴다
```

- 한 결제에 항목이 여러 개면(장바구니) **항목당 1행**, `event_id` 는 `<notification_id>:<price_id>` 로 만든다. 체크아웃은 항목 1개만 열지만 원장은 여러 개도 받는다.
- RLS 는 `(select auth.uid())` 형태 — 저장소 규칙(supabase-schema-structuring).

---

## 4. 서버 — `POST /api/paddle-webhook`

파일: `functions/api/paddle-webhook.js` + `worker/index.js` 라우트 1줄 (API route wiring 규칙: 등록 안 하면 404).
순수 로직은 `functions/api/_paddle.js` 로 빼서 테스트한다.

### 4-1. 서명 검증
- 헤더 `Paddle-Signature: ts=<unix>;h1=<hex>`.
- 서명 대상은 `${ts}:${rawBody}`, HMAC-SHA256, 키는 `env.PADDLE_WEBHOOK_SECRET`. **`request.text()` 원문**을 쓴다 — JSON 파싱 후 재직렬화하면 서명이 어긋난다.
- `ts` 와 현재 시각 차이 **5분** 초과면 거부(Paddle SDK 기본 5초는 시계 오차에 너무 빡빡하다).
- 비교는 상수 시간(`crypto.subtle.verify` 또는 길이 검사 후 XOR 누적).
- 실패 → `401`. 시크릿 미설정 → `503` + 로그(배포 실수를 조용히 삼키지 않는다).

### 4-2. 이벤트 처리
| event_type | 처리 |
|---|---|
| `transaction.completed` | `data.items[]` 각각의 `price.id` 를 카탈로그(`ITEMS` + `PET_KINDS`)에서 역조회 → 행 insert. 모르는 price_id 는 로그 남기고 건너뛴다(200) |
| `adjustment.created` / `adjustment.updated` | `data.action ∈ {refund, chargeback}` 이고 `data.status === 'approved'` 면 `transaction_id` 가 같은 행 전부 `revoked_at = occurred_at`. 부분 환불(`adjustment.items` 일부)은 이번엔 구분하지 않고 **전체 취소**로 본다 — 항목 1개 결제라 실질적으로 같다 |
| 그 외 | 200 으로 받고 무시 |

- **user_id 는 `data.custom_data.user_id`** 에서 읽는다. 체크아웃이 우리 사이트에서 넣은 값이고 Paddle 이 서명해 돌려주므로 위조 경로가 없다. 없거나 uuid 형식이 아니면 로그 남기고 200(재시도해도 고쳐지지 않는 건 재시도시키지 않는다).
- **item 은 custom_data 를 믿지 않고 price_id 로만 정한다.** 카탈로그가 순수 모듈(THREE/DOM 없음)이라 Worker 가 `../../js/cosmetics/catalog.js`, `../../js/pet/rules.js` 를 그대로 import 한다. 가격표 단일 출처.
- insert 는 PostgREST `POST /rest/v1/purchases` + `Prefer: resolution=ignore-duplicates`, `on_conflict=event_id`. 재배달은 조용히 무시된다.
- DB 호출 실패 → `500`. Paddle 이 라이브 3일간 60회 재시도하므로 우리 쪽 큐가 필요 없다. 처리 시간은 REST 1회라 5초 제한 안이다(waitUntil 로 미루지 않는다 — 미루면 실패를 200 으로 덮는다).
- 로그 1줄: `{ evt:'paddle_webhook', type, txn, user, items:[…], status }`. 서명 실패도 같은 키로 `status:'bad_sig'`.

### 4-3. 설정
- 시크릿: `npx wrangler secret put PADDLE_WEBHOOK_SECRET` (GEMINI_API_KEY 와 같은 방식). wrangler.jsonc 주석에 이름을 적어 둔다.
- Supabase 쓰기는 기존 `SUPABASE_SERVICE_KEY` 를 쓴다(cards-bundles 와 동일).
- 로컬 미러(`scripts/serve.py`)는 **만들지 않는다.** 웹훅은 Paddle 이 공개 URL 로 보내야 하므로 로컬에서 재현이 안 된다. 검증은 §10 의 단위 테스트 + 샌드박스 실배달로 한다.

---

## 5. 클라이언트 — 체크아웃

### 5-1. 현금 버튼이 그려지는 조건
```
PLATFORM === 'web' && state.online && !state.isGuest && item.price.cash
```
넷 중 하나라도 아니면 코인 버튼만 있다(오늘과 같음). 산 항목은 두 버튼 모두 '구매 완료'.

### 5-2. `js/shop/paddle.js`
- `loadPaddle()`: 현금 버튼을 **처음 누를 때** `https://cdn.paddle.com/paddle/v2/paddle.js` 를 script 태그로 넣고 `Paddle.Environment.set(CONFIG.PADDLE.env)`(sandbox 일 때만) → `Paddle.Initialize({ token: CONFIG.PADDLE.token, eventCallback })`. 부팅 비용 0.
- `openCheckout({ priceId, itemId, kind })`:
  ```js
  Paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customData: { user_id: state.userId, item_id: itemId, kind },
    customer: state.email ? { email: state.email } : undefined,   // 이메일 프리필 → 첫 화면 건너뜀
    settings: { locale: 현재 언어('ko'|'en') },
  });
  ```
- `eventCallback`: `checkout.completed` 면 `onCompleted(itemId)` 호출 → §6-2 폴링. `checkout.closed` 면 트래킹만.
- `CONFIG.PADDLE = { token: 'test_…', env: 'sandbox' }` — 클라이언트 토큰은 공개값이라 config.js 에 둔다. 라이브 전환은 이 두 값과 wrangler secret 교체뿐.

### 5-3. 가게 UI (js/spaces/cafe.js `drawCosMenu` / `drawPetTab`)
- 코인 버튼 옆에 현금 버튼 하나 추가. 라벨은 `cash.label` 그대로(`₩2,500`). 새 문구 없음 → 선검수 대상 아님.
- 누르면 `openCheckout`. 결제 중 버튼 비활성, 완료·닫힘 후 복구.
- 모바일 폭에서 버튼 2개가 한 줄에 들어가는지 **실측**(mobile-hud-layout 규칙). 안 들어가면 현금 버튼을 줄 아래로 내린다.

---

## 6. 소유 병합 — 원장이 진실, 세이브는 사본

### 6-1. 세이브 필드
`gameState.cashOwned: string[]` — 마지막으로 원장에서 본 유효(미환불) 항목 id. `save-migrate.js` 가 없으면 `[]` 로 채운다
("필드 없음"과 "읽기 실패"를 구분하는 기존 규칙 그대로).

코인 구매와 현금 구매를 구분하는 유일한 근거다. 이게 없으면 환불된 항목을 `owned` 에서 뺄 때
코인으로 산 것까지 빼거나, 환불된 것을 못 뺀다.

### 6-2. 병합 함수 (`js/shop/entitlements.js`, 순수)
```
applyPurchases(gameState, rows) → { gameState', granted:[…], revoked:[…] }
  live     = rows.filter(r => !r.revoked_at)
  gone     = cashOwned − live.ids            // 환불됨
  fresh    = live.ids − cashOwned            // 새 결제
  cosmetics.owned  = owned − gone(코인으로도 산 적 없는 것만) ∪ fresh(cosmetic)
  pets             = gone(pet) 삭제 · fresh(pet) 는 emptyPet(kind) 로 추가
  equipped 슬롯이 gone 이면 unequip · 현재 펫이 gone 이면 pet = null
  cashOwned        = live.ids
```
- "코인으로도 산 적 없는 것만" — `owned` 에 있는데 `cashOwned` 에도 있으면 현금 구매로 본다. 코인 구매 후 같은 걸 현금으로 또 사는 경로는 UI 가 막는다('구매 완료').
- 불변: 입력을 바꾸지 않고 새 객체를 돌려준다.

### 6-3. 호출 시점
1. **부팅**: `loadGame` 뒤, 마이그레이션 뒤, 첫 렌더 전. `fetchPurchases()` (supabase-client, `select item_id, kind, revoked_at`) → `applyPurchases` → `granted` 가 있으면 토스트 "🎁 산 아이템이 도착했어요"(문구 선검수 대상, 아래 §11).
   원장 읽기 실패는 **무시하고 세이브대로 간다**(현금 아이템은 cashOwned 사본으로 이미 owned 에 있다). 다음 부팅에 다시 맞춘다.
2. **결제 직후**: `checkout.completed` → 1초 간격으로 최대 10회 `fetchPurchases` 해서 그 item 이 보이면 병합 + 바로 장착/데려가기(코인 구매와 같은 결) + `requestSave()`. 10초 안에 안 오면 토스트 "잠시 후 다시 들어오면 도착해 있어요"(§11) — 웹훅은 결국 오고 부팅 병합이 받는다.
3. 웹 외 플랫폼도 **부팅 병합은 돈다.** 웹에서 산 걸 앱·토스에서도 보이게 하는 경로가 이것이다.

---

## 7. 오류·엣지
| 상황 | 동작 |
|---|---|
| 결제창 열었다 닫음 | 아무 변화 없음. `cash_checkout_close` 만 기록 |
| 결제 성공했는데 창을 바로 닫음 | 웹훅은 오고 원장에 남는다 → 다음 부팅 병합에서 지급 |
| 같은 웹훅 재배달 | event_id 충돌 무시 → 이중 지급 없음 |
| 환불 | revoked_at → 부팅 병합에서 제거·해제. 이미 코인으로도 샀던 항목이면 유지 |
| 모르는 price_id | 로그 + 200. 대시보드에서 상품을 잘못 만든 경우라 사람이 본다 |
| custom_data 없음(대시보드에서 수동 결제 등) | 로그 + 200, 지급 없음 |
| 세이브 왕복 | `cashOwned` 는 세이브에 실리므로 save-guard 의 덮어쓰기 방지 규칙을 그대로 탄다 |

---

## 8. 심사용 페이지 (Paddle 도메인 심사 요건)
Paddle 은 **제출 도메인 안에서** 상품 설명·가격·구매 시 받는 것·이용약관(개인 셀러 법적 이름 포함)·환불 정책·개인정보 정책이
**내비게이션으로 닿게** 있어야 승인한다. 지금은 privacy 만 있다.

| 파일 | 경로 | 내용 |
|---|---|---|
| `pages/terms.html` | `/terms` | 이용약관 — 판매자(개인) 이름, 디지털 상품 성격, 계정 귀속, 분쟁 |
| `pages/refund.html` | `/refund` | 환불 정책 — 지급 전 취소·14일·중복 결제·Paddle 이 처리 주체 |
| `pages/shop.html` | `/shop` | 가격 안내 — 카탈로그 22종 표(아이콘·이름·코인가·현금가). **빌드가 catalog.js 에서 생성**해 가격표가 한 곳에서만 산다 |

- privacy.html 과 같은 스타일·같은 footer. 세 페이지 footer 에 서로 링크 + 게임으로 돌아가기.
- `scripts/build-web.mjs` 의 pages 목록에 추가(`→ /terms` 등). shop.html 은 빌드 시 템플릿에 표를 끼운다.
- ⚙️ 설정 메뉴에 `📜 이용약관`·`↩️ 환불 정책` 버튼 추가(`openPolicyPage` 재사용). 토스에서는 기존 privacy 와 같이 **제거**한다 — 토스 웹뷰는 새 탭이 없어 정책 페이지가 편도 티켓이 되는 함정(index.html 의 privacy 제거 주석)이 같고, 토스는 자체 IAP 라 약관 링크도 필요 없다.
- 입구(로그인 화면) 카드 아래에 링크 줄 `가격 안내 · 이용약관 · 환불 정책 · 개인정보처리방침` — 심사자가 **로그인 없이** 상품·약관을 찾는 통로. 별도 마케팅 홈페이지는 필요 없다. 토스에서는 제거.
- 영어판: 안내서처럼 `-en.html` 을 따로 두지 않고 **한 페이지에 ko 본문 + en 요약 섹션**. i18n 사전에 넣지 않는다(정적 페이지).
- 문구는 구현 전 사용자 검수(ui-copy-review-first). 법적 이름은 사용자가 직접 채운다.

---

## 9. 트래킹 (feature-tracking-checklist)
| 이벤트 | 파라미터 | 시점 |
|---|---|---|
| `cash_checkout_open` | `item_id`, `kind`, `price_id` | 현금 버튼 → 결제창 열림 |
| `cash_checkout_close` | `item_id`, `kind` | 결제 없이 닫음 |
| `cash_checkout_done` | `item_id`, `kind`, `price_id` | `checkout.completed` |
| `cash_grant` | `item_id`, `kind`, `via`(instant/boot), `wait_ms` | 원장에서 확인돼 소유에 합쳐짐 |
| `cash_revoke` | `item_id`, `kind` | 부팅 병합에서 환불 제거 |

- 축은 전부 키값. 금액은 GA4 에 보내지 않는다(원장에 있다).
- 서버 로그 `paddle_webhook` 은 Workers observability 로 본다.
- 다음 날 BigQuery 로 `cash_checkout_open → done → grant` 깔때기 재검증.
- 코인 구매 이벤트 `cosmetic_buy`/`pet_buy` 는 그대로. 현금 구매는 위 이벤트만 남기고 `cosmetic_equip(via:'cash')` 는 기존 장착 이벤트를 재사용.

---

## 10. 테스트 (`npm test`, 순수 함수만)
- `tests/paddle-signature.test.mjs` — 올바른 서명 통과 · h1 변조 거부 · ts 5분 초과 거부 · 바디 공백 하나 바뀌면 거부
- `tests/paddle-events.test.mjs` — `transaction.completed` → 행(항목당 1, event_id 규칙, price_id 역조회) · 모르는 price_id 건너뜀 · custom_data 없음 → 빈 결과 · `adjustment` refund/approved → revoke 대상 txn · pending 은 무시
- `tests/entitlements.test.mjs` — 새 결제 추가·장착 유지 · 환불 제거+해제 · 코인으로도 산 항목은 환불에도 유지 · 펫 추가/제거 · 입력 불변
- `tests/cosmetics-catalog.test.mjs` 확장 — cash 가 있으면 `priceId`(`pri_` 접두)·`label` 둘 다 · priceId 전체 유일(펫 포함) · 등급표(§2-2)와 label 일치
- 샌드박스 실배달: 배포된 Worker 에 Paddle 대시보드 "테스트 알림" → 원장 행 확인 → 게임 부팅 병합으로 아이템 지급 확인. 환불 시뮬레이션까지 1회.

---

## 11. 사용자가 직접 하는 것 (코드 밖)
1. Paddle 가입(개인 셀러) → 샌드박스 클라이언트 토큰 · 웹훅 엔드포인트(`https://<웹 도메인>/api/paddle-webhook`, 이벤트: transaction.completed, adjustment.created, adjustment.updated) · 시크릿 발급
2. 상품·가격 22개 등록(§2-2). KRW 가능 여부 확인(§2-3) → priceId 를 카탈로그에 기입
3. 도메인 심사 제출(웹 도메인만) — §8 페이지가 라이브여야 한다. 인게임 아이템이라 게임 운영 증빙(플레이 콘솔·토스 콘솔 스크린샷)을 요구할 수 있다
4. 약관의 법적 이름, 토스트 문구 2건(§6-3) 검수
5. 승인 후: `CONFIG.PADDLE` 을 라이브 토큰·`production` 으로, 라이브 웹훅 시크릿 등록, 라이브 priceId 로 교체(샌드박스와 id 가 다르다)

---

## 12. 열린 결정 (구현 전에 정해야 함)
- 없음. §2-3 통화는 계정 개설 후 사실 확인으로 정해진다(설계는 두 경우 모두 같다).

## 13. 나중에
- 인라인 체크아웃 / 가격 현지화 표시(PricePreview)
- 토스 IAP · 플레이 인앱 — 같은 원장에 `channel` 컬럼을 더해 붙인다
- 부분 환불 항목 단위 취소
