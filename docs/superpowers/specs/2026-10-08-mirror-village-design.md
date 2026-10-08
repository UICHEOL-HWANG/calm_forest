# 🪞 거울 마을 (Mirror Village) — 설계

- 날짜: 2026-10-08
- 상태: 섹션 1~5 승인됨 · ✅ 디자인 6항목 컨펌 완료(2026-10-08)
- 선행: 🌙 꿈의 숲(`2026-10-08-dream-forest-design.md`) — 차원 맵 2차
- 시안: `dev/active/dimension-maps/storyboard.html?s=B`(컨셉) · 본 시안은 `dev/active/mirror-village/`
- 브랜치: `feat/mirror-village` (워크트리 `.claude/worktrees/mirror-village`)

## 1. 목표

낮에 마을 🚏 정류장에서 초승달 마차를 타고 **연못 너머 밤낮이 뒤집힌 작은 마을**로 간다.
그림자 주민 3명의 잃어버린 물건을 단서로 찾아 돌려주고 🪞 거울 조각을 받아 **거울 장식 4종**으로 바꾼다.
밤 = 🌙 꿈의 숲(침대), 낮 = 🪞 거울 마을(정류장)으로 하루를 나눈다.

결정 요약
- 핵심 루프: 잃어버린 물건 찾기(A) + 반전 단서(B). 1번째 단서는 그대로, 2·3번째는 좌우 반전. 막히면 💧 힌트 버튼.
- 입구: 마을 정류장 신설 + 초승달 마차 재사용, **낮(06~18시)만 운행**. 탑승·하차를 연출로 보여 준다(암전 순간이동 금지).
- 보상: 🪞 거울 조각(전용 재화) → 거울 장식.
- 시간: 거울 마을 안에선 바깥 시간 정지, 조명은 늘 푸른 밤.
- 구조: 1차 패턴 복제(A안) + 컷신만 공용화. 공통 모듈 일반화는 3차 맵 때 두 사례를 보고.

성공 기준
- 들어간 사람 중 1번째 의뢰 완료 ≥ 80%, 3건 모두 완료 ≥ 50% (`mirror_enter` → `mirror_return{quest_n}`)
- 반전 단서(`flipped=1`)의 힌트 없는 해결률 ≥ 40%. 반전 쪽 힌트율 > 50% 면 단서 문구 개정
- 같은 날 `dream_enter` 와 `mirror_enter` 를 둘 다 한 사람 비율이 다음 날 BigQuery 에서 읽힌다

## 2. 흐름

```
낮(06~18시) — 판정은 !isNight()(js/daynight.js 단일 출처) · 🚏 마을 정류장 옆 액션 「🪞 거울 마을행 타기」 (mirror_board{dir:'go'})
  ① 탑승 — 조작 잠금, 캐릭터가 정류장 앞 승차 지점까지 걸어감 → 초승달 마차에 올라앉음
  ② 출발 — 마차가 떠올라 마을 연못 쪽으로 비행 → 수면에 닿는 순간 위아래 뒤집힘(물결 와이프)
  ③ 도착 — 거울 마을 하늘에서 내려와 거울 정류장에 착지 → 하차(서기) (mirror_cutscene_end, mirror_enter)
       첫 회 ≈ 6s / 이후 ≈ 2.5s · 탭/액션/Esc 건너뛰기
  차원 전환 ✅ **B 🪞 거울 문** — 호수 위에 둥근 거울 링이 일어서고 거울 속(색 반전 마을)으로 통과(`mockups/compare-cut3.png`, 2026-10-08 확정). ②의 '수면 물결 와이프' 대신 이 연출. 공통 컷 `mockups/compare-cut1.png`(정차 자리는 정류장 지붕과 겹치지 않게).
  ④ 의뢰 — 그림자 주민(머리 위 💬)에게 말 걸기 → 단서 (mirror_clue)
  ⑤ 물건 줍기 (mirror_found) → 주민에게 돌려주기 → 🪞 +N (mirror_return)
  ⑥ 귀환 — 거울 정류장 「🚏 마을로 돌아가기」 (mirror_board{dir:'back'}) → ①~③ 역순 → 마을 정류장 하차 (mirror_leave)
```

- 밤의 마을 정류장: 액션 대신 안내 `🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서` (`mirror_stop_shown{night:1}`).
- 거울 마을에선 시간이 멈춘다(`timeOfDay` 고정, 돌아오면 떠난 시각 그대로).
- 의뢰 중간에 언제든 귀환 가능. 그날 진행(`done`)은 이어진다.
- 거울 마을에서 새로 고침·종료 → 다음 접속은 **마을 정류장 앞**. `getGameState()` 가 `playerPos` 를 돌아갈 자리로 바꿔 저장(꿈의 숲·이웃 마을 패턴). 이때 `mirror_leave` 는 보내지 않는다(enter−leave 차 = 이탈).
- 정류장 위치 ✅ **A 호수 남쪽 잔디 (16, 17)** (시안 `mockups/compare-stop.png`, 2026-10-08 확정). 주변 나무가 정류장을 가리지 않게 정리할 것.

## 3. 거울 마을 공간

- 좌표 `MIRROR = (0, 0, -700)` — 꿈의 숲(-550)과 150m. 반지름 `MIRROR_R = 22`.
- 손으로 만든 작은 마을. **실제 마을 복제 금지**(드로우콜).
- 외관 ✅ **3안 색 반전 숲 마을** — 내 마을 색의 보색 팔레트·은빛 나무·오로라(시안 `mockups/compare-game.png`, 2026-10-08 확정). 가장자리는 숲 링, 정류장 남쪽엔 나무 금지(화면 가림).
- 카메라는 고정(북쪽을 봄) → **화면 왼쪽 = 서쪽(-x)**. 단서의 왼/오는 이 기준.
- 표지물(단서 기준점) 5: 🪞 거울 연못(중앙) · 🪣 우물 · 🕰️ 거꾸로 시계탑 · 🏮 등불 기둥 · 🚏 거울 정류장(남쪽 끝).
- 그림자 주민 집 3채 + 나무·덤불·바위 장식. 하늘엔 거꾸로 매달린 낮 마을 실루엣(저폴리, 원경).
- 걷는 면 y=0 원 하나, 연못·집 충돌체. `clampWalkable` 순수 함수.
- 조명: 푸른 밤 하늘·안개, 물건만 따뜻한 색 + 빛. `updateDayNight` 에 `atMirror` 블록. `OUT_OF_REACH_FLAGS` 에 `atMirror`.
- BGM: 새 테마 `'mirror'` — 오르골 계열, 꿈과 다른 조(단조 느낌 금지, 맑고 신비하게).
- 드로우콜 예산 ≤ 60 (재질별 `mergeGeos`, 물건·주민만 개별).

## 4. 의뢰와 단서

- 숨는 자리 후보 15곳: `{ id, landmark, side: 'left'|'right'|'front'|'back', cover: 'bush'|'rock'|'tree', x, z }` (MIRROR 로컬).
  왼/오 자리 ≥ 10곳.
- 단서 템플릿: `{주민}: "{표지물} {방향} {덮개} 밑에서 잃어버렸어요"`.
- 반전 단서는 **왼↔오만** 바꾼다(앞/뒤 유지). 반전 의뢰에는 왼/오 자리만 배정.
- 하루 배정 `pickQuests(today)`: `todayStr()` 시드로 주민 3명 순서·물건 3종(6종 풀)·자리 3곳(서로 다른 표지물).
  quest 1 = 그대로(`flipped:0`, 아무 자리) · quest 2·3 = 반전(`flipped:1`, 왼/오 자리).
- 순차 해금: 1건 마치면 다음 주민 머리 위 💬.
- 물건은 단서를 들은 뒤에만 반짝·획득 가능(반경 1.1m 자동). 빛 1개 + 은은한 일렁임.
- 💧 힌트: 단서 들은 지 30초 후 버튼 노출. 누르면 `🪞 거울 말로는 왼쪽 → 진짜는 오른쪽` + 자리에 빛기둥. (`mirror_hint`)
  quest 1 에도 노출(문구: `{표지물} {방향} 을 다시 살펴봐요` + 빛기둥).
- 물건 6종: 금반지 · 오르골 상자 · 당근 인형 · 털실 뭉치 · 작은 등불 · 별 브로치. ✅ **1안 원색 저폴리**(물건마다 제 색·각진 저폴리, `mockups/compare-items.png`, 2026-10-08 확정).
- 그림자 주민 ✅ **2안 보색 쌍둥이** — 실제 마을 주민 실루엣 그대로 색만 보색(이름 `거울 {주민}`), 눈 발광(`mockups/compare-res.png`, 2026-10-08 확정). 실제 `buildNPCLook` 재사용 + 재질만 보색 치환이 목표(순환 import 규칙 지킬 것).

## 5. 🪞 거울 조각과 장식

- 보상: 의뢰 1건 +2, 힌트 없이 찾으면 +1 → 하루 최대 9.
- `DECOR` 에 `pay: 'mirror'` — 기존 꾸미기·창고·옮기기 그대로.

| id | 이름 | 값 | 비고 |
|---|---|---|---|
| `upsidePot` | 거꾸로 화분 | 6 | 상판 소품(`sm`) |
| `waterMirror` | 물빛 거울 | 10 | 바닥 스탠드 거울(벽걸이 가구 체계가 없어 YAGNI), foot 0.6×0.3 |
| `shadowBear` | 그림자 곰 인형 | 14 | 바닥 |
| `mirrorLamp` | 거울 등불 | 22 | 바닥 스탠드, 푸른 빛 |

- 외관 ✅ **2안 보색 반전** — 마을·주민과 같은 보색 팔레트(`mockups/compare-decor.png`, 2026-10-08 확정). `shadowBear` 표시 이름은 `거울 곰 인형`.
- 총 52 ≈ 7~8일. 노출: `mirror.visits > 0` 또는 창고 보유분.
- 결제 아이콘 `🪞`, 부족 토스트 `거울 조각이 부족해요 (필요 N 🪞)`.
- 천장 규칙·벽걸이 규칙 테스트에 새 소품 포함.

## 6. 저장

```js
inventory.mirror                       // 🪞 거울 조각(화폐)
gameState.mirror = { visits: 0, day: '', done: 0, hinted: [], total: 0 }
// visits 누적 방문 · day 'YYYY-MM-DD' · done 그날 마친 의뢰 수(0~3) · hinted 힌트 쓴 quest_n · total 누적 조각
```

- `normalizeMirror(saved, today)` — 타입·범위 검증, `day !== today` 면 `done=0, hinted=[]`.
- 진행 중 의뢰(단서 듣고 미발견)는 저장하지 않음 — 다시 들어오면 해당 주민에게 다시 말 걸기.
- 🚨 옛 클라이언트는 `mirror` 필드·거울 장식 id 를 지운다 → **웹·토스·Play·itch 4곳 동시 배포**.

## 7. 온보딩 (단계마다 1회, `gameState.hintsSeen`)

| 키 | 언제 | 무엇 |
|---|---|---|
| `mirrorStop` | 낮, 정류장 근처 첫 방문 | 배너 `🚏 마차 정류장` / `낮엔 🪞 거울 마을에 갈 수 있어요` |
| `mirrorArrive` | 첫 도착 | 안내 카드 3줄(그림자 주민 · 잃어버린 물건 · 정류장으로 귀환) + `좋아요` |
| `mirrorFlip` | quest 2 단서를 들을 때 | 배너 `🪞 여기 주민들은 좌우를 반대로 말해요` |
| `mirrorReturn` | 첫 귀환 | 배너 `🪞 거울 장식` / `🛋️ 꾸미기에서 거울 조각으로 바꿔요` |

- HUD 칩 `🪞 거울 마을 · 의뢰 {done}/3`.
- 프롬프트: 의뢰 대기 `💬 {주민}에게 말 걸기` · 탐색 중 `🔍 {단서 요약}` · 3건 완료 `🚏 정류장에서 돌아가요`.
- 미니맵: 마을 🚏 아이콘, 거울 마을 라벨. **미니맵 라벨·펫·발자국 고정 목록(index.html / farm-auto / game.js) 갱신**.

## 8. 트래킹

공통: 예약 파라미터(`source` 등) 금지, id·축은 키값. 모든 호출은 `js/mirror/track.js` 래퍼 경유(파라미터 이름·타입 한곳 고정).

| 이벤트 | 파라미터 |
|---|---|
| `mirror_stop_shown` | `prior_visits`, `night: 0/1` |
| `mirror_board` | `dir: go\|back`, `first: 0/1`, `done_today` |
| `mirror_cutscene_end` | `dir`, `skipped: 0/1`, `at_s`, `short: 0/1` |
| `mirror_enter` | `visit_n`, `done_today` |
| `mirror_clue` | `quest_n`, `npc_id`, `spot_id`, `flipped: 0/1` |
| `mirror_hint` | `quest_n`, `spot_id`, `wait_s` |
| `mirror_found` | `quest_n`, `item_id`, `spot_id`, `flipped`, `hinted: 0/1`, `search_s` |
| `mirror_return` | `quest_n`, `reward` |
| `mirror_leave` | `done_today`, `elapsed_s` |
| `mirror_onboard` | `step: stop\|arrive\|flip\|return` |
| `decor_buy_mirror` | `item`, `cost`, `left` |

- Supabase 별도 테이블 없음(조각은 코인 아님 → `econ_logs` 대상 아님).
- 배포 다음 날 BigQuery: 의뢰 단계 퍼널, `flipped` 별 `search_s`·힌트율, 꿈·거울 같은 날 동시 이용률.

## 9. 코드 구조

| 파일 | 역할 | 의존 |
|---|---|---|
| `js/mirror/layout.js` | 좌표·표지물·숨는 자리 15·`clampWalkable` | 순수 |
| `js/mirror/quests.js` | `pickQuests`, `normalizeMirror`, `rewardFor` | 순수 |
| `js/mirror/clues.js` | 단서·힌트 문장(사전 키), `flipSide` | 순수 |
| `js/mirror/art.js` | 마을·그림자 주민·물건 6·정류장 2 | THREE |
| `js/mirror/decor-art.js` | 거울 장식 4 | THREE |
| `js/mirror/track.js` | 이벤트 11종 래퍼 | `trackEvent` |
| `js/spaces/mirror.js` | 지연 빌드·탑승/귀환·의뢰·힌트·HUD·온보딩 | 위 + game.js(순환 import 규칙) |
| `js/mirror/ride.js` | 탑승(걷기→앉기)·이륙·🪞 거울 문 통과·착지·하차 타임라인. 1차 `js/dream/cutscene.js` 는 고치지 않는다(라이브 꿈길 회귀 0) — 마차 조형만 `makeMoonCarriage()` 재사용 | THREE |
| `js/mirror/ride-schedule.js` | 단계 경계 시각(순수) | — |

- `game.js` 는 연결부만(`atMirror`, 조명·그림자 플래그, 세이브 왕복, 정류장 액션) — 목표 ≤ 50줄.
- UI(index.html): 도착 카드, 힌트 버튼, HUD 칩, 꾸미기 🪞 아이콘, 컷신 건너뛰기 재사용.

## 10. 테스트

- `tests/mirror-quests.test.mjs`: 시드 결정성·3건·quest 1 그대로 / 2·3 반전(왼/오 자리)·표지물 중복 없음·`normalizeMirror` 경계.
- `tests/mirror-clues.test.mjs`: `flipSide`, 반전 단서·힌트 문장, ko/en 키 존재.
- `tests/mirror-track.test.mjs`(소스 검사): 11종 호출 존재, 예약 파라미터 미사용, `flipped`·`hinted`·`search_s` 누락 없음.
- `tests/mirror-wiring.test.mjs`: `atMirror` 연결 지점, 미니맵·펫·발자국 고정 목록.
- 기존 갱신: shadow-scope, minimap, decor-ceiling, i18n, **dream QA 27항목(컷신 공용화 회귀)**.
- 브라우저 실측: 오프라인 CDP — 탑승 → 의뢰 3건 → 힌트 → 귀환 → 🪞 결제, PC·모바일·영어 캡처.

## 11. 디자인 컨펌 (구현 전 필수)

각 항목 시안 ≥ 3, PC + 모바일 나란히:
1. 정류장 위치·외관(마을 쪽 / 거울 쪽)
2. 거울 마을 전경(배치·조명)
3. 그림자 주민
4. 잃어버린 물건 6종
5. 거울 장식 4종
6. 탑승·연못 통과·하차 컷신 스토리보드

## 12. 하지 않는 것 (2차)

그림자 쪽지·주민 도감(3차 후보) · 공통 차원 모듈 일반화 · 진행 중 의뢰 저장 · 조각 판매 · 리더보드 · 밤 운행.
