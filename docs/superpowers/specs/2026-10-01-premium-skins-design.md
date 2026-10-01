# 💎 프리미엄 2단계 — 🧥 전신 스킨 칸 + 🌿 숲의 정령 · 🧸 플러시 인형 + 획득 연출 B+C

- 날짜: 2026-10-01
- 선행: [프리미엄 자국 1단계](2026-10-01-premium-trails-design.md) — 브랜치 `feat/premium-trails`(T10·T11 결제 실검증·상점 열기 대기)
- 브랜치: `feat/premium-skins` (feat/premium-trails daf269a 에서 분기 — 1단계는 따로 병합 가능)
- 시안: `sims/skin-look-sim.html`(S1~S3·P1~P3 → **S3·P1 확정**) · `sims/skin-trail-rule-sim.html`(자취 규칙 A~D → **A 확정**) · 연출 `sims/premium-reveal-sim.html`(D = B+C)

---

## 1. 결정 기록 (2026-10-01, 사용자)

| 질문 | 결정 |
|---|---|
| 스킨을 동물에 어떻게 입히나 | **A 덧입히기** — 동물 체형·귀·꼬리·얼굴 배치는 그대로, 재질·장식만 바꾼다. 7종 공통 함수 하나 |
| 다른 꾸미기와 같이 입나 | **같이 입는다** — 모자·목·등은 스킨 위에 그대로 얹힌다 |
| 정령 자취 × 자국 칸 | **A** — 자국 칸이 **비었을 때만** 정령 새싹 자취. 자국을 끼우면 그 자국이 우선 |
| 정령 외형 | **S3 반딧불 정령** — 청록 반투명 몸 + 몸속을 떠도는 빛 알갱이 + 빛 테두리 + 머리 새싹 |
| 인형 외형 | **P1 솔기·단추 눈** — 원래 털색 + 옆구리·정수리 솔기 + 단추 눈 + 배 천 패치 + 걸을 때 말랑 |
| 가격 | 🌿 ₩10,000 · 🧸 ₩9,000 (조사 제안가 그대로) |
| 연출 | 전신 스킨 = **B+C 상자 폭발**(~2.3s) — 메모리 확정분 |

---

## 2. 데이터

### 2-1. 카탈로그 (`js/cosmetics/catalog.js`)
- `SLOTS = ['head', 'neck', 'back', 'trail', 'skin']` — 끝에 붙인다(세이브·순서 호환).
- RAW 에 두 줄:
  ```js
  { id: 'forest_spirit', slot: 'skin', ico: '🌿', name: '숲의 정령',   won: 10000, tier: '프리미엄' },
  { id: 'plush_doll',    slot: 'skin', ico: '🧸', name: '플러시 인형', won: 9000,  tier: '프리미엄' },
  ```
- `equip.js`·`wardrobe.js`·`entitlements.js`·`functions/api/_paddle.js` 는 SLOTS/ITEMS 를 따라가므로 코드 수정 없음. `sanitize` 는 옛 세이브(`equipped.skin` 없음)를 `null` 로 채운다(테스트로 못박음).
- `js/shop/price-ids.js` 에 두 id 를 `null` 로 추가 — 시드 스크립트(`scripts/paddle-seed.mjs`)가 premium 항목을 등록한 뒤 채운다.

### 2-2. 정령 자취 판정 (`js/cosmetics/skin-rules.js`, 순수)
```js
export const SKIN_TRAIL = Object.freeze({ forest_spirit: 'sprout' });
/** 실제로 찍을 자국 id — 자국 칸이 우선, 비었으면 스킨 자취, 둘 다 없으면 null */
export function effectiveTrail(cos) { return cos?.equipped?.trail || SKIN_TRAIL[cos?.equipped?.skin] || null; }
```
- `sprout` 는 카탈로그 아이템이 **아니다**(살 수 없음) — `trail.js` 의 자국 조형 표에만 있다.
- 같은 파일에 말랑 함수 `squashOf(phase, on)` 도 둔다(§3-2).

---

## 3. 스킨 조형 (`js/cosmetics/skin.js`, THREE 인자)

```js
export function applySkin(THREE, built, skinId) // built = buildAnimalMesh 반환({ group, k, ... }) → 제자리 수정, 반환 { tick(t) } | null
```
- 시안 코드(`sims/skin-look-sim.html`)를 옮긴다. 시뮬은 눈을 "어둡고 작은 구"로 **추측**했다 → 게임은 `animal-faces.js` 가 눈동자·하이라이트에 `userData.part = 'pupil' | 'highlight'` 를 달아 **표식으로** 찾는다. 머리 그룹은 `userData.part = 'head'`.
- ⚠️ 시뮬 함정 재발 방지: `Color` 내부값은 선형 — 밝기 판정은 `getHex()`(sRGB)로.
- ⚠️ 재질 공유(꾸미기 스펙 §14): 캐릭터 기존 재질을 **dispose 하지 않는다**. 스킨 재질은 모듈 단위 캐시(스킨당 1벌)로 재사용.

### 3-1. 🌿 숲의 정령 (S3)
- 몸 재질(눈동자·하이라이트·어두운 색 제외) → `MeshStandardMaterial({ color 0x5fc4a8, emissive 0x1f7a68, ei 0.8, transparent, opacity 0.6 })` 1벌. luma 0.65 < 블룸 0.85.
- 빛 테두리: 반지름 ≥ 0.45 인 구(몸·머리)에 BackSide 가산 껍질(×1.06, 0x9af0c8, 0.22) — 드로우콜 +2.
- 빛 알갱이: Points 1개(26점, 0xe6ff9a, depthTest false) — 드로우콜 +1. `tick(t)` 로 궤도 갱신.
- 머리 새싹: 줄기 + 잎 2장(0x9be07a, emissive 0x3f9a40) — 1벌 재질, 병합 1메시.

### 3-2. 🧸 플러시 인형 (P1)
- 털색 그대로. 솔기 실 색 = 몸색 × 0.55.
- 솔기: 몸 옆구리 대원 2줄 + 머리 정수리 대원 1줄(바늘땀 캡슐). 단추 눈: 눈동자 자리에 원통 + 테 + 구멍 4, 원래 눈동자·하이라이트는 숨김. 배 천 패치(0xf6e6c8, 둥근 사각 + 테두리 땀).
- ⚠️ 바늘땀은 수십 개 메시 → **재질별로 병합해 굽는다**(`BufferGeometryUtils.mergeGeometries`, 몸 좌표계/머리 좌표계 각각). 목표 드로우콜 증가 ≤ +6.
- 걸을 때 말랑: `squashOf(phase, on)` → s = on ? 1 − 0.08·(1 − |sin φ|) : 1, `charGroup.scale = (1/√s, s, 1/√s)`. 스킨이 플러시일 때만.

### 3-3. 드로우콜 한도(실측해 tasks 에 기록)
| 스킨 | 목표 |
|---|---|
| 숲의 정령 | ≤ +4 (껍질 2 · 알갱이 1 · 새싹 1) |
| 플러시 인형 | ≤ +6 |

---

## 4. 게임 배선

- `applyCharacter(id)` 에서 `buildAnimalMesh` 직후 `applySkin(THREE, built, cos.equipped.skin)` → `applyCosmetics`. 반환 `tick` 은 `skinTick` 으로 보관, 메인 루프에서 호출.
- `applyCosmetics(cos)` 머리에서 **스킨이 바뀌었으면** `applyCharacter(gameState.character)` 로 캐릭터를 다시 만든다(재질 교체 = 재조립). 같으면 지금처럼 앵커 자식만 교체.
- `buildCharacterMesh(id, cos)`(선택 화면·가게·옷장 미리보기)도 `applySkin` 을 거친다 → 미리보기 루프에서 `tick` 호출.
- `updateTrail`: `gameState.cosmetics.equipped.trail` 대신 `effectiveTrail(gameState.cosmetics)`.
- `trail.js`: `sprout` 자국(새싹 2잎 + 초록 원판, 단일 메시로 굽힘)을 조형 표에 추가.
- 말랑: 걷기 블록(`walkPhase`)에서 플러시일 때만 `charGroup.scale` 적용, 멈추면 1. **도구 휘두르기 모션은 건드리지 않는다.**

---

## 5. 가게 · 옷장

- 가게 `COS_TABS` 와 옷장 `SLOT_TABS` 에 `['skin', '🧥 스킨']` — ✨ 이펙트 뒤(가게는 🐾 펫 앞).
- 가게 스킨 행 = 1단계 프리미엄 행 그대로(`premiumRowMode`). 토스·안드로이드·itch 는 행이 전부 hidden → **탭 자체를 숨긴다**(빈 탭 금지).
- 옷장은 산 것만(기존 `ownedIn`) — 전 플랫폼.
- 미리보기: 스킨 탭은 캐릭터를 그대로 보여 준다(자국 탭처럼 걷는 자국으로 바꾸지 않음).

---

## 6. 획득 연출 B+C (`purchase-reveal.js` · `reveal-pose.js`)

- `playPurchaseReveal({ itemId, animalId, mode, buildShowcase, onWalk, onClose })` — `mode` 생략 시 `revealModeOf(item)`: slot 'skin' → `'boxburst'`, 나머지 → `'spot'`.
- `buildShowcase()` = 호출부(cafe.js)가 넘기는 **스킨 입은 내 캐릭터 메시** 팩토리(purchase-reveal 은 game.js 를 import 하지 않는다).
- 시간축(순수, 테스트) `boxburstPose(t)` — 승인 시안 mode D 와 같은 값:
  - 0~0.4 상자 등장(easeOutBack) · 0.5~1.4 덜컹(가운데 0.95 에서 가장 셈)
  - 1.4 뚜껑 날아감 + 섬광(1.4~1.68 페이드) + 무지개 버스트 · 링(1.4~2.6 확장·페이드)
  - 1.4~2.2 캐릭터 솟음(easeOutBack) · 계속 천천히 회전 · **2.3 카드**
- 시안 `sims/premium-reveal-sim.html` mode D 의 상자·버스트·링 조형을 옮긴다. 입자는 Points 1개.
- 카드 버튼: 스킨은 **[바로 입어보기]**(이미 장착됨 → 가게 닫고 마을로) · [닫기]. 자국은 기존 [바로 걸어보기].

---

## 7. 문구 (사용자 검수 완료 2026-10-01)

| 키 | 문구 |
|---|---|
| 🌿 이름 / 설명 | 숲의 정령 / 밤이면 몸속에서 반딧불이 떠다녀요 |
| 🧸 이름 / 설명 | 플러시 인형 / 꿰맨 자국과 단추 눈, 걸을 때마다 말랑말랑 |
| 카드 태그 | PREMIUM · 전신 스킨 |
| 카드 버튼 | 바로 입어보기 |
| 탭 | 🧥 스킨 |
- i18n-en 사전에 같이 넣는다(통문장 키 — i18n 글루 함정).

---

## 8. 트래킹

- 기존 이벤트 재사용: `cosmetic_equip`(slot 'skin'), `premium_row_view`, `cash_checkout_*`, `premium_reveal_close`(스킨은 via 'wear').
- 새 이벤트 없음. 배포 다음날 BQ 에서 slot='skin' 행 재검증.

---

## 9. 테스트

- catalog: 스킨 2종 won·premium·slot, SLOTS 끝 'skin'.
- equip.sanitize: 옛 세이브 → skin null · 안 산 스킨 벗김.
- skin-rules: effectiveTrail 4가지(자국만·스킨만·둘 다·없음) · squashOf 경계값.
- reveal-pose: boxburstPose 단계 경계·카드 2.3 · revealModeOf.
- 소스 검사(gameSource): applySkin 이 applyCharacter·buildCharacterMesh 에, effectiveTrail 이 updateTrail 에 배선.
- 화면: 7종 × 두 스킨 × 낮/밤 · PC/375px · 모자·망토 동시 착용 · 가게·옷장 탭 · 연출 B+C · 드로우콜 실측.

---

## 10. 범위 밖

- Paddle 샌드박스 결제 실검증·라이브 심사(1단계 T10·T11과 함께).
- 세트 할인·첫 구매 팩·펫 스킨.
