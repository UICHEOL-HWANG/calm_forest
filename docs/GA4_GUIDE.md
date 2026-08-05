# 📈 calm forest · GA4 설정 & 탐색 가이드

행동 이벤트(로그인·벌목·수확·집완성 등) 통계를 GA4에서 보는 방법입니다.
**좌표/진행도 같은 상세 데이터는 Supabase**, **행동 이벤트·퍼널·유입은 GA4**로 나눠서 봅니다.

---

## 1. 측정 ID 발급 (이것만 있으면 끝)

1. https://analytics.google.com → **관리(⚙️) → 속성 만들기** (없으면)
2. **데이터 스트림 → 웹** 추가 → 사이트 URL 입력(로컬 테스트면 아무 값, 배포 후 github.io 주소)
3. 생성되면 **측정 ID** `G-XXXXXXXXXX` 복사
4. `js/config.js` 에 붙여넣기:
   ```js
   GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX',
   ```
   → 새로고침하면 `analytics.js` 가 gtag.js 를 **자동 로딩**합니다. HTML은 손댈 것 없음.
5. 콘솔에 `[GA4] 로드됨: G-...` 뜨면 연결 완료.

> 확인: GA4 → **보고서 → 실시간**, 또는 **관리 → DebugView** 에서 이벤트가 실시간으로 뜨는지 보면 됩니다.

---

## 2. 이미 심어둔 이벤트

코드(`js/analytics.js`, `js/game.js`)에서 아래 이벤트를 자동 전송합니다.

| 이벤트 이름 | 발생 시점 | 매개변수 |
|-------------|-----------|----------|
| `login` | 로그인 성공 | `method` (google/anonymous/offline) |
| `character_select` | 첫 캐릭터(동물) 선택 | `animal`(fox/dog/rabbit/cat/bear/panda/chick) |
| `first_chop` | 세션 첫 벌목 | `tree_id` |
| `chop_tree` | 벌목할 때마다 | `tree_id`, `wood` |
| `plant_seed` | 씨앗 심기 | — |
| `water_crop` | 물주기 | — |
| `harvest_crop` | 수확 | `crop` (누적 작물 수) |
| `house_complete` | 집 완성 | — |
| `npc_talk` | 주민과 대화창 열기 | `npc`, `mode`(offer/progress/claim/done) |
| `quest_accept` / `quest_complete` | 퀘스트 수락/완료 | `quest`, `npc` |
| `feedback_submit` | 문의 제출 | `category` |
| `enter_house` / `exit_house` | 집 실내 입장/퇴장 | — |
| `enter_farm` / `exit_farm` | 개인 텃밭 입장/퇴장 | — |
| `enter_mine` / `exit_mine` | 채굴 동굴 입장/퇴장 | — |
| `mine_ore` | 광맥 채굴 | `ore`(stone/coal/gem), `amt` |
| `place_decor` | 가구 배치(꾸미기) | `item`(rug/plant/…) |
| `craft_item` | 제작(작업대) | `category`(cook/tool/outdoor/gift), `item`(요리·도구·야외장식·선물 id) |
| `gift_give` | 주민에게 선물 전달 | `npc`, `gift`(bouquet/fruit/fishset/woodtoy) |
| `shop_sell` / `shop_buy` | 상점 판매/구매 | 판매: `item`,`qty` · 구매: `item` |
| `color_unlock` | 외관 색 랜덤 획득 | `part`(roof/wall/door), `idx` |
| `photo_capture` / `photo_share` | 사진 촬영/공유 | — |
| `fishing_cast` | 낚시 캐스팅 | — |
| `fishing_catch` | 물고기 낚음 | `fish`, `rarity`(common/uncommon/rare) |
| `fishing_miss` | 낚아채기 실패 | — |
| `tutorial_start` | 튜토리얼 시작 | — |
| `tutorial_step` | 튜토리얼 단계 완료 | `step`(1~11), `key`(move/chop/till/seed/water/harvest/talk/fish/build/enter/decor) |
| `tutorial_complete` | 튜토리얼 완료 | — |
| `tutorial_skip` | 튜토리얼 건너뜀 | `at`(welcome 또는 단계번호) |
| `session_time` | 주기/이탈 시 | `seconds` |

또한 **user_id** 를 GA4에 연결(`setGaUser`)해서, GA4↔Supabase를 유저 단위로 조인할 수 있습니다.

### 튜토리얼 퍼널 분석 예 (탐색 → 유입경로 탐색)
`tutorial_start` → `tutorial_step`(step=1) → … → `tutorial_step`(step=11) → `tutorial_complete`
로 단계별 완료율을 보면 **어느 스텝에서 신규 유저가 이탈하는지** 바로 보입니다. `tutorial_skip`의 `at` 값으로 이탈 지점도 확인.
전체 11단계: move·chop·till·seed·water·harvest·talk·fish·build·enter·decor.

---

## 3. ② 맞춤 측정기준/측정항목 등록 (GA4 UI, 코드 X)

GA4는 커스텀 매개변수를 등록해야 탐색에서 쪼갤 수 있어요.
**관리 → 맞춤 정의 → 맞춤 측정기준(또는 측정항목) 만들기** 에서 아래를 등록:

| 매개변수 | 유형 | 범위 | 용도 |
|----------|------|------|------|
| `method` | 측정기준(텍스트) | 이벤트 | 로그인 방식(google/anonymous) |
| `quest` | 측정기준(텍스트) | 이벤트 | 퀘스트 이름 |
| `npc` | 측정기준(텍스트) | 이벤트 | 주민 id |
| `mode` | 측정기준(텍스트) | 이벤트 | 대화 상태(offer/progress/claim/done) |
| `category` | 측정기준(텍스트) | 이벤트 | 문의 종류 |
| `key` | 측정기준(텍스트) | 이벤트 | 튜토리얼 단계 |
| `at` | 측정기준(텍스트) | 이벤트 | 튜토리얼 이탈 지점 |
| `wood` / `crop` / `seconds` / `step` | 측정항목(숫자) | 이벤트 | 수치 집계 |

> 등록 후 데이터는 즉시 반영, 과거 데이터는 최대 24~48h. (BigQuery는 등록 없이도 raw로 다 있음)

## 3-b. ③ 주요 이벤트(전환) 지정 (GA4 UI, 코드 X)

**관리 → 이벤트(또는 데이터 표시 → 주요 이벤트)** 에서 아래를 "주요 이벤트"로 토글하면 전환 리포트가 채워집니다:
- `harvest_crop` (첫 수확) · `house_complete` (집 완성) · `quest_complete` (퀘스트 완료) · `tutorial_complete` (튜토리얼 완료)

→ "방문자 중 몇 %가 집을 완성/튜토리얼을 끝냈나" 같은 전환율을 볼 수 있어요.

## 3-c. ④ user_id 연결 (이미 코드 적용됨)

로그인 시 Supabase `user_id`를 GA4에 심어(`setGaUser`) 보내므로, **GA4 유저 ↔ Supabase 유저**를 같은 키로 조인할 수 있습니다. GA4 **관리 → 보고 ID**에서 "관찰됨(user_id 우선)"으로 두면 크로스 기기 식별도 향상됩니다.

---

## 4. 탐색(Exploration)으로 보는 핵심 리포트

**보고서가 아니라 "탐색"** 메뉴에서 자유 분석을 만듭니다.

### (a) 유입 퍼널 — 어디서 이탈하는가
**탐색 → 유입경로 탐색 분석** 새로 만들기 → 단계 설정:
1. `login`
2. `first_chop`
3. `plant_seed`
4. `harvest_crop`
5. `house_complete`

각 단계 전환율/이탈률이 나옵니다. "심었는데 수확까지 안 감" 같은 지점을 잡을 수 있어요.

### (b) 경로 탐색 — 자연스러운 행동 순서
**경로 탐색 분석**: 시작점을 `login`으로 두면 유저가 실제로 어떤 순서로 행동하는지 트리로 보입니다.

### (c) 세그먼트 비교
`method = google` vs `anonymous` 세그먼트를 만들어, 로그인 방식별 체류/전환 차이를 비교. (통계적으로 표본 커지면 유의미)

### (d) 유지(Retention) 보고서
**보고서 → 참여도 → 유지**에서 코호트별 재방문을 봅니다. (Supabase 쪽 `retention_pct`와 교차검증)

---

## 5. 역할 분담 정리

| 보고 싶은 것 | 어디서 |
|--------------|--------|
| 벌목/수확/집완성 횟수·전환 퍼널 | **GA4** (이벤트) |
| 유입 경로·기기·지역·재방문 | **GA4** |
| 캐릭터 이동 히트맵·체류 구역 | **Supabase** (`game_logs`, 히트맵 쿼리) |
| 인벤토리/집 진행도 분포 | **Supabase** (`game_saves`) |
| 전체 유저 합산 커스텀 통계 | **Supabase SQL** (`sql/analytics_queries.sql`) / 관리자 대시보드 |

GA4는 이벤트 카운트·퍼널·유입에 강하고, 좌표처럼 촘촘한 원자료는 Supabase가 강합니다. 둘을 같이 보면 "무엇을(GA4) 어디서(Supabase)"가 완성돼요.
