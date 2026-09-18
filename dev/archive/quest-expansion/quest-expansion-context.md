# Context — quest-expansion

Last Updated: 2026-09-12

## 핵심 파일

| 위치 | 무엇 |
|---|---|
| `js/quests.js` | **신규** — 순수 로직(게이트·추첨·반복 의뢰). game.js 는 호출만 |
| `tests/quests.test.mjs` | **신규** — 위 모듈의 테스트 |
| `js/game.js:596` | `QUEST_HOW` — 유형별 "어떻게 하나요" 한 줄. 새 type 마다 필수 |
| `js/game.js:614` | `NPCS` 배열 — 주민 정의 + 퀘스트 체인 |
| `js/game.js:651` | `DAILY_COUNT = 3` → 5 |
| `js/game.js:657` | `QUEST_TYPES` Set — 추적되는 목표 종류 |
| `js/game.js:664` | `DAILY_POOL` — 일일 의뢰 풀 |
| `js/game.js:698` | `refreshDailyQuests()` — 날짜 시드 추첨 |
| `js/game.js:731` | `upgradeDailyQuestsAI()` — 서버 의뢰로 교체 |
| `js/game.js:11160` | `OWL_SPECIAL_POOL` — 올빼미 특별 의뢰 |
| `js/game.js:11499` | `questEvent(type, amount)` — 진행도 증가 |
| `js/game.js:10990` | `buildNPCs()` — NPC 3D 생성 |
| `functions/api/daily-quests.js:20` | `QUEST_SPEC` — 서버 화이트리스트. `NEED = 3` → 5 |
| `scripts/serve.py` | ⚠️ 위 API 의 **로컬 미러**. 한쪽만 고치면 안 됨 |
| `js/i18n-en.js` | 한국어 원문이 키 — 새 문구 전부 영어판 필요 |

## 훅 위치 (새 목표 7종)

| type | 훅 |
|---|---|
| `carve` | `js/game.js:7101` `carveFinish()` |
| `egg` | `js/game.js:3052` `giveReward({egg}, 'coop_collect')` 직후 |
| `gift` | `js/game.js:7896` `giveGift()` |
| `decor` | `js/game.js:7804` `placeOutdoor()` |
| `boat` | `js/game.js:4460` `boat_end` 트래킹 지점 |
| `seafish` | `js/game.js:5891` `sea_catch` 트래킹 지점 |
| `mist` | `js/game.js:4957` 정화 종료 — `purified` 성공일 때만 |

## 의사결정

- 코인 발행 1.28배로 억제, 나머지 보상은 재료·친밀도로 분산 — 사용자 선택
- 새 NPC 이름은 사람 2 · 동물 2 — 사용자 선택
- 잠금 콘텐츠도 퀘스트화하되 `questAvailable` 로 거름 — 사용자 선택
- 게이트를 베타 전용이 아니라 **일반 전제조건**으로 만든다 — A/B 종료 후에도
  닭장·집 단계 조건이 계속 일하므로 삭제 작업이 필요 없다

## 함정

- ⚠️ **진행 중 의뢰 교체 금지.** 진행도는 `st.idx`(몇 번째) + `st.progress`(몇 개) 포인터로만
  저장된다. 목록을 하루 중에 다시 뽑으면 포인터가 엉뚱한 의뢰를 가리켜, 손도 안 댄 의뢰가
  절반 차 있고 하던 진행도가 증발한다. `refreshDailyQuests`/`upgradeDailyQuestsAI` 의
  기존 가드(`st.given || st.idx > 0 || st.progress > 0`)와 같은 기준을 지킨다.
- ⚠️ **하루 1회 제한 콘텐츠의 목표 수치.** 달걀(하루 1회 수집) · 안개 정화(하루 1회) ·
  조각(일일 주문 3건) · 나룻배(횟수 제한). 상한을 안 걸면 그날 안에 못 깨는 의뢰가 된다.
- ⚠️ **✨특별 의뢰는 `st.special` 에 따로 보관.** 일일 배열에 섞으면 `validDailyQuests` 의
  개수 검증에 걸려 다음 접속 때 통째로 다시 뽑히고 진행도가 어긋난다.
  `DAILY_COUNT` 를 5로 올릴 때 이 검증도 함께 봐야 한다.
- ⚠️ **`QUEST_HOW` 누락은 조용히 실패한다.** `QUEST_HOW[q.type] || ''` 가 빈 문자열을
  돌려주고 `:empty` 가 흔적 없이 감춰서 "어쩌라는 건지 모르겠다" 상태로 되돌아간다.
  `tests/quest-how.test.mjs` 가 이미 짝을 잠그고 있다 — 새 type 7종 모두 안내가 필요.
- ⚠️ **i18n `" · "` 글루.** 문장을 조합해 만들면 사전 키가 성립하지 않는다(beta-feedback-r3
  에서 겪음). 새 문구는 통문장으로 두고 키를 만든다.
- ⚠️ **서버 3곳 동기화.** `functions/api/daily-quests.js` 와 `scripts/serve.py` 는 같은 규칙의
  미러. `js/game.js` 의 `QUEST_TYPES` 와도 짝이 맞아야 한다.
- ⚠️ **새 API 라우트를 만들면** `worker/index.js` 에 등록해야 한다(dex-notes·daily-quests 404 사고).
  이번엔 기존 라우트만 고치므로 해당 없음 — 새로 만들면 확인할 것.

## 검증

```bash
npm test
```

## 진행 기록 (2026-09-12)

브랜치 `feat/quest-expansion` · 테스트 272건 통과.

### 구현 완료
- `js/quests.js` 신규 — `QUEST_GATES` · `QUEST_LIMITS` · `questAvailable` · `pickGated` · `REPEAT_POOL` · `repeatNPCsFor` · `repeatQuestFor`
- `QUEST_TYPES` 12 → 19 (carve·egg·gift·decor·boat·seafish·mist) + `QUEST_HOW` 7줄
- 훅 7곳 삽입 — 조각은 `kind==='done'`, 강은 `result==='clear'`, 안개는 `result==='purified'`,
  장식은 `!moved && !taken` 일 때만(파밍 차단)
- `currentQuest(def, st)` / `onRepeatQuest` / `questId` 도입 — `st.idx` 포인터를 건드리지 않고
  반복 의뢰를 별도 슬롯 `st.repeat = { date, done, q }` 에서 돌린다
- 새 NPC 4명 + 외형 4종(`badger`·`stargazer`·`duck`·`rancher`)
- 일일 3 → 5, `QUEST_COINS=[10,10,15,15,20]`, 럭키박스는 앞 3건만
- 서버 3곳 동기화 + i18n 영어판(누락 0)

### 실측으로 확인한 것
- 새 NPC 4명이 의도한 좌표에 서고 외형이 읽힌다(3차 수정 후)
- 일일 의뢰가 5건으로 뜨고 새 목표(🛶강 완주)가 나온다 + 수행 방법 줄이 붙는다
- `?repeat=1` 로 체인을 소진시키면 **정확히 3명**만 `!` 글리프가 뜬다
- 반복 의뢰 수락 → 글리프 `…` + 퀘스트 패널에 0/8 · 보상 씨앗+5·코인+8

### 겪은 함정 (다음 사람용)
- ⚠️ `DAILY_COINS` 이름이 **출석 보상**(`js/game.js:1208`)에 이미 있었다. `node --check` 는
  못 잡고 브라우저 콘솔이 잡았다 → 새 상수는 `QUEST_COINS`/`QUEST_LUCKY` 로.
- ⚠️ `?owl=1` 디버그가 `idx = 3` 하드코딩이라 `DAILY_COUNT` 변경과 어긋났다 → `DAILY_COUNT` 참조로.
  `owl`·`repeat` 이 `DEV_PARAMS` 에 없어 검수 세션이 지표에 기록되던 것도 함께 수정.
- ⚠️ 🐿️다람쥐·🦦수달은 ☕카페 손님 캐스트에 이미 있다(`tests/cooking-course.test.mjs` 가 잠금)
  → 🦡오소리·🦆오리로 교체.
- ⚠️ NPC 외형: 머리에 얹는 덮개가 **공용 눈(y 1.18 · z 0.32)** 보다 크면 얼굴이 통째로 사라진다.
  덮개는 위쪽 캡(theta 0~PI/2.5)까지만. 소품은 몸 **뒤가 아니라 앞·옆**에 둬야
  위에서 내려다보는 기본 카메라의 실루엣에 걸린다.
- ⚠️ 오소리를 "흰 얼굴 + 검은 줄" 로 만들면 🐼요리사 판다와 구분이 안 된다 → 명암을 뒤집어
  "짙은 얼굴 + 흰 줄" 로.
- ⚠️ 브라우저 검수: 키 입력 전에 **캔버스를 한 번 클릭**해야 먹는다. 텃밭 근처 주민은
  "밭일 우선" 규칙에 막혀 대화가 안 열린다(맨손으로 바꿔야 한다).
- ⚠️ `?time=` 은 0~1 스케일이다(`?time=12` 는 자정). 낮은 `0.35`.

### 남은 일
- 모바일 실측(퀘스트 패널·대화창 길이 — 일일이 5건으로 늘어 목록이 길어졌다)
- 새 목표 7종의 실제 플레이 발화 확인(훅 위치는 `tests/quests.test.mjs` 가 잠갔다)
- 토스 번들·itch 반영
