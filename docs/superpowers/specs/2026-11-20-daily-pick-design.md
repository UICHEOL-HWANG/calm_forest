# 오늘의 꾸미기 (1차: 겨울 8종) 설계

- 날짜: 2026-11-20
- 브랜치: `feat/daily-pick` (워크트리 `.claude/worktrees/daily-pick`, main 2aadb098 기준)
- 화면 시안: `sims/daily-pick-compare.html` · 캡처 `sims/daily-pick/compare.png` → **B안 금빛 카드** 확정

## 1. 목표

꾸미기 가게에 매일 바뀌는 한 칸을 두고, 앱·토스 유저는 보상형 광고를 보면 그날 그 아이템을 반값에 산다.

- 새 꾸미기 소개 창구 + 매일 들어올 이유 만들기
- 광고는 지름길일 뿐, 광고 없이도(웹·대조군) 정가로 같은 아이템을 살 수 있다

판정 지표: `daily_pick` 자리 광고 완료 수, 오늘의 꾸미기 구매율(카드 본 사람 중 산 사람), 가게 재방문(카드 본 날 수 / 사람).

## 2. 확정된 결정

| 항목 | 결정 |
|---|---|
| 아이템 범위 | 캐릭터 꾸미기 + 집·마당 가구 둘 다 |
| 순환 풀 | 새로 추가하는 아이템만 |
| 판매 경로 | 오늘의 칸에서만 판매(각 탭에는 안 나옴) |
| 출시 단위 | 1차 겨울 8종(캐릭터 4 + 가구 4) → 2차 숲 동물 8종(1차 지표 본 뒤) |
| 화면 | B안 금빛 카드: 꾸미기 가게 탭 아래 맨 위 카드 1장 + 남은 시간 + 8칸 순환 점 |
| 광고 노출 | 앱·토스의 광고 배정 그룹만(기존 `rewarded.open()`), 웹·대조군은 정가 버튼만 |

## 3. 1차 겨울 8종 (가안 · 조형 시안으로 확정)

기존 `earmuff 털 귀마개`·`snowflake 눈송이 발자국`(산장 판매)과 겹치지 않게 고른다.

| 순서 | id | 종류 | 이름 | 가격 🪙 | 반값 |
|---|---|---|---|---|---|
| 0 | `wp_pompom_hat` | 캐릭터 head | 방울 뜨개 모자 | 1,400 | 700 |
| 1 | `wp_knit_scarf` | 캐릭터 neck | 손뜨개 겨울 목도리 | 1,200 | 600 |
| 2 | `wp_firewood` | 캐릭터 back | 등에 멘 장작 바구니 | 1,400 | 700 |
| 3 | `wp_boot_trail` | 캐릭터 trail | 털장화 발자국 | 1,600 | 800 |
| 4 | `wp_hearth` | 실내 가구 | 작은 벽난로 | 1,500 | 750 |
| 5 | `wp_fur_rug` | 실내 가구 | 양털 러그 | 900 | 450 |
| 6 | `wp_cocoa_table` | 실내 가구 | 핫초코 탁자 | 1,100 | 550 |
| 7 | `wp_snowman` | 마당 장식 | 목도리 두른 눈사람 | 1,200 | 600 |

- 캐릭터·가구가 번갈아 나오게 순서를 섞는 안도 가능 → 조형 확정 때 같이 정한다.
- 반값 = `Math.ceil(price / 2)`.

## 4. 구조

### 4.1 데이터·규칙 (순수 모듈, THREE 없음)

`js/data/daily-pick.js`

- `DAILY_PICK_POOL`: 위 8개 `{ id, kind: 'cos' | 'decor', price }` (순서 고정)
- `pickIndex(dateKey)`: `'YYYY-MM-DD'` → `Date.UTC(y, m-1, d) / 86400000` 를 8로 나눈 나머지. 모든 유저가 같은 날 같은 아이템.
- `pickOf(dateKey)` → 풀 항목
- `priceOf(pick, halfState, dateKey)`: `halfState?.d === dateKey && halfState.id === pick.id` 면 반값, 아니면 정가
- `msLeft(nowMs)`: 로컬 자정까지 남은 ms (카드 남은 시간 표시)

날짜 키는 기존 `todayStr()`(로컬 날짜)를 그대로 쓴다. 출석·데일리 퀘스트와 같은 기준.

### 4.2 카탈로그 등록

- 캐릭터 4종: `js/cosmetics/catalog.js` RAW 에 `group: 'daily'` 로 추가. `shopRows`(탭 목록)에서 `group === 'daily'` 는 뺀다(오늘의 칸에서만 판매).
  - 조형: `js/cosmetics/art-winter-pick.js` (새 파일, 기존 `art-sprout.js` 방식)
- 가구 4종: 실내 3종은 `DECOR` 에 `hidden: true` 로, 눈사람은 `OUTDOOR` 에 `hidden: true, quest: true` 로 추가 → 작업대에 안 나오고 `grantDecor()` 로 보관함에 들어간다.
  - 조형: 기존 가구 조형 파일 방식을 따라 새 파일 하나(`js/decor/winter-pick-art.js`)

### 4.3 세이브

`gameState.dailyPick = { d: 'YYYY-MM-DD', id, half: true }` (광고 본 날만 기록)

- 복원 시 문자열·불리언만 받고 나머지 버림(조작·옛 세이브 방어)
- 날짜가 다르면 반값 아님 → 따로 지우지 않아도 다음 날 자동 정가

소유 판단:
- 캐릭터: `gameState.cosmetics.owned.includes(id)` (기존)
- 가구: 보관함 수량 + 놓인 수 > 0 → 가짐. 가구는 한 번만 판다(이미 있으면 "이미 있어요").

### 4.4 화면 (B안)

`js/spaces/cafe.js` 의 `drawCosMenu()` 에서 `drawTabBundles` 앞에 `drawDailyPickCard(box)` 한 줄. 카드 그리기는 새 파일 `js/game-ui/daily-pick-card.js`.

- 모든 탭 맨 위(펫 탭 포함)에 같은 카드
- 내용: 아이콘 상자 · "📅 오늘의 꾸미기" · ⏳ 남은 시간 · 이름 · [🪙 가격] · [AD 광고 보고 반값]
- 8칸 순환 점: 오늘 칸 강조
- 상태 4가지: 광고 가능(정가+광고) / 반값(취소선 정가 + 반값 버튼, "반값" 배지) / 광고 없음(정가만) / 가짐(회색 "이미 있어요" + "내일 바뀌어요")
- 카드 누르기 = 입어보기(캐릭터만, 기존 `tryOnCos`), 가구는 아이콘만
- 광고 버튼: `rewarded.button('daily_pick', ['광고 보고', ' ', '반값'], grant, after)`, grant 에서 `gameState.dailyPick` 기록 + `requestSave()` + 카드 다시 그리기
- 튜토리얼 중엔 기존 `adQuiet` 규칙에 따라 광고 버튼 숨김
- 코인 모자라면 기존 토스트 "코인이 모자라요"

### 4.5 측정 (GA4 파라미터 ≤5)

| 이벤트 | 파라미터 | 언제 |
|---|---|---|
| `daily_pick_view` | item_id, state(ad/half/noad/owned) | 하루 1번, 카드가 처음 그려질 때 |
| `daily_pick_buy` | item_id, half(0/1), price_coins, coins_after | 구매 |
| `prepass_ad_result` | slot=`daily_pick` (기존) | 광고 결과 |

텐진: 기존 `rv_*` 그룹에 `daily_pick` 이 자동으로 들어가는지 확인만.

### 4.6 문구 (검수 대상 · 엠대시 금지)

- 카드 제목: `📅 오늘의 꾸미기`
- 남은 시간: `⏳ 13:42` (시:분)
- 가짐: `이미 있어요` / `내일 바뀌어요`
- 반값 배지: `반값`
- 광고 버튼: `광고 보고 반값`
- 광고 실패: 기존 `지금은 광고를 볼 수 없어요`
- 영어(i18n-en): Today's pick · Already have · Changes tomorrow · Half off · Watch ad for half off

## 5. 오류·예외

- 광고 skip/fail/nofill → 반값 안 됨, 기존 토스트
- 자정을 넘겨 카드를 다시 열면 새 아이템 정가. 전날 광고 기록은 남아도 효과 없음.
- 구매 중 코인 부족 → 기존 토스트, 아무것도 안 바뀜
- 모르는 꾸미기·가구 id 세이브 → 구버전 앱이 지운다 → **5곳 동시 배포 필수**(웹·토스·Play·iOS·itch)
- 가구 지급 실패(`grantDecor` false) → 코인 빼지 않음(지급 성공 확인 후 차감)

## 6. 테스트

`tests/daily-pick.test.mjs` (node 테스트, 순수 모듈만)
- 같은 날짜 → 같은 아이템, 연속 8일 → 8종 모두 한 번씩
- 반값: 같은 날·같은 id 만 반값, 다음 날 정가
- 반값 계산 홀수 가격 올림
- 세이브 복원 정리(이상한 값 버림)
- `shopRows` 에 `group: 'daily'` 안 나옴
- 실내 가구 천장 규칙: 기존 `tests/decor-ceiling.test.mjs` 통과

화면: PC 460 · 세로 폰 390 · 가로 폰 740×360 · 667×375 터치 에뮬 캡처로 넘침·잘림 확인. 실제 게임에서 광고 모의(rewarded-debug) 반값 → 구매 → 보관함·옷장 반영까지.

## 7. 순서

1. 겨울 8종 조형 시안(각 3안 이상 렌더 비교) → 확정
2. 데이터·규칙 모듈 + 테스트(TDD)
3. 카탈로그 등록·조형 코드
4. 카드 UI + 광고 연결 + 세이브
5. 측정 이벤트 + 영어 문구
6. 화면 검증(PC·모바일) + 코드 리뷰
7. 5곳 동시 배포(사용자 확인 후)

## 8. 하지 않는 것

- 2차 숲 동물 8종(1차 지표 본 뒤 별도)
- 광고 횟수 서버 검증(꾸미기는 보기만 바뀌는 아이템이라 조작 위험 낮음)
- 웹 반값 수단(웹은 광고 없음 결정 유지)
- 오늘의 꾸미기 알림 푸시
