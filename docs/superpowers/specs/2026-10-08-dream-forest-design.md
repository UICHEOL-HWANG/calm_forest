# 🌙 꿈의 숲 (Dream Forest) — 설계

- 날짜: 2026-10-08
- 상태: 승인됨(사용자 "ㄱㄱ 스펙 쓰고 구현까지 쭉 가자")
- 시안: `dev/active/dimension-maps/` — `compare-abc.png`(차원 맵 3안), `storyboard-dream.png`(흐름 4컷), `storyboard.html?s=1..4`
- 범위: **1차 = 🛏️ 꿈꾸기 + 🌙 꿈의 숲**. 🪞 거울 마을(마을 마차 노선)은 2차, 별도 스펙.

## 1. 목표

밤에 침대에서 "자기"만 하던 자리에 **두 번째 선택지 🌙 꿈꾸기**를 둔다.
꿈꾸기를 고르면 초승달 마차를 타고 떠 있는 섬(꿈의 숲)으로 가서 ✨ 꿈 조각을 모으고, 🛏️ 구름 침대에 누워 깨어나면 아침이 된다.
꿈 조각은 집 꾸미기 메뉴에서 **꿈 장식 4종**으로 바꾼다.

성공 기준
- 밤에 침대를 쓴 사람 중 🌙 꿈꾸기 선택률 ≥ 40% (`dream_choice`)
- 꿈에 들어간 사람 중 조각 1개 이상 획득 ≥ 80%, 깨어나기 완료 ≥ 70% (`dream_enter` → `dream_shard` → `dream_wake`)
- 컷신 건너뛰기 위치(`at_s`)와 온보딩 단계별 이탈(`dream_hint`)이 다음 날 BigQuery 에서 읽힌다

## 2. 흐름

```
밤 · 침대 옆 액션
  └─ 선택 창 (dream_prompt_shown)
       ├─ 💤 푹 자기 → 기존 doSleep() 그대로 (dream_choice{choice:'sleep'})
       └─ 🌙 꿈꾸기 (dream_choice{choice:'dream'})
            ① 잠들기 1.4s — 보랏빛 암전 + 자막, 조작 잠금
            ② 초승달 마차 비행 — 첫 회 4.5s / 이후 1.8s, 탭·액션·Esc 로 건너뛰기 (dream_cutscene_end)
            ③ 꿈의 숲 도착 (dream_enter) — 첫 회 안내 카드
            ④ ✨ 조각 줍기 (dream_shard) — 다가가면 자동 획득
            ⑤ 🛏️ 구름 침대 · 깨어나기 → 암전 → 집 침대 옆, 아침 (dream_wake{via:'bed'})
```

- 꿈속에선 **시간이 멈춘다**(밤 유지). 깨면 `timeOfDay = WAKE_TIME`(0.30) — `doSleep()` 과 같은 결과.
- 꿈속에서 새로 고침·앱 종료 → 다음 접속은 **집 앞(houseExitPoint)에서 아침**으로 시작(세이브는 실내 여부를 복원하지 않아 집 안 좌표를 적으면 마을 밖으로 튄다). `timeOfDay` 도 WAKE_TIME 으로 저장.
  `getGameState()` 가 `playerPos` 를 돌아갈 자리로 바꿔 저장한다(이웃 마을 `neighborReturnPos()` 패턴).
  다음 접속 때 `dream_wake` 는 보내지 않는다 — 들어간 수 대비 깬 수의 차가 곧 이탈.
- 낮의 침대 액션은 지금과 같다(옮기기). 밤 침대 액션만 선택 창으로 바뀐다.

## 3. 꿈의 숲 공간

- 좌표 `DREAM = (0, 0, -550)` — 비어 있는 자리(MIST -250, RIVER -400 과 150m 이상). `DREAM_R = 30`.
- **걷는 면은 전부 y=0 평면**이다. 섬은 높이가 아니라 **모양**으로 떠 있게 보인다(밑면 역원뿔 + 아래로 깊은 보랏빛 하늘).
  높이가 다른 섬을 진짜로 만들면 점프·낙하·카메라 충돌이 새로 필요하다 → 1차에선 하지 않는다(YAGNI).
- 걸을 수 있는 영역 = **섬 원 4개 ∪ 징검다리 캡슐 3개**. 밖으로 나가려 하면 가장 가까운 영역 경계로 되밀린다(순수 함수 `clampWalkable`).

| 섬 | 중심(DREAM 기준) | 반지름 | 내용 |
|---|---|---|---|
| 달맞이 섬(main) | (0, 0) | 7 | 도착 지점, 🛏️ 구름 침대, 버섯 등 3 |
| 분홍 섬(pink) | (-14, -13) | 4.4 | 수정 나무 |
| 하늘빛 섬(sky) | (13, -16) | 4.8 | 수정 나무 2 |
| 별가루 섬(star) | (20, 2) | 3.4 | 수정 나무 1 |

징검다리: main↔pink, main↔sky, main↔star (폭 1.6, 디딤돌은 장식 — 위아래로 살짝 떠다님).

- 조명·안개: 보라 하늘, 보라 `scene.fog`, 반딧불·별 상시. `updateDayNight` 에 `atDream` 블록.
- 그림자: `OUT_OF_REACH_FLAGS` 에 `atDream` 추가.
- BGM: 새 테마 `'dream'` — 오르골(`'stars'`) 계열, 느린 템포·다른 화성.
- 드로우콜 예산 ≤ 60 (섬·나무·디딤돌은 재질별 `mergeGeos` 병합, 조각만 개별 메시).

## 4. ✨ 꿈 조각

- **하루(실제 날짜, `todayStr()`) 7개.** 후보 14곳 중 `todayStr()` 시드로 7곳 — 매일 배치가 바뀐다.
  각 섬 최소 1개, main 은 정확히 2개(도착 직후 바로 보이게).
- 같은 날 다시 꿈을 꾸면 **남은 조각만** 있다. 다 모은 날엔 프롬프트가 구름 침대로 안내.
- 획득: 반경 1.1m 안에 들어오면 자동. 반짝 + 효과음 + `+1 ✨`.
- 멀리서도 보이게 조각마다 **빛기둥**.
- 저장: `gameState.inventory.shard`(화폐) + `gameState.dream`:

```js
dream: { visits: 0, day: '', got: [], total: 0 }
// visits 꿈 들어간 누적 횟수 · day 'YYYY-MM-DD' · got 그날 주운 자리 id(예 'pink-2') · total 누적 획득
```

- `normalizeDream(saved, today)` — 타입·범위 검증(음수·비배열·모르는 id 버림), `day !== today` 면 `got` 비움.
- 옛 클라이언트는 `dream` 필드를 모른다 → 저장 때 사라진다(`inventory.shard` 는 `Object.assign` 이라 산다).
  꿈 장식 id 도 옛 클라이언트가 지운다 → **웹·토스·Play·itch 4곳 동시 배포**.

## 5. 💤/🌙 선택 창

- 제목 `🛏️ 잘 시간이에요`, 부제 `오늘 밤은 어떻게 할까요?`
- `💤 푹 자기` / `바로 아침이 돼요` · `🌙 꿈꾸기` / `꿈의 숲에서 꿈 조각을 모아요`
- 첫 방문 전(`visits === 0`)엔 🌙 에 **NEW** 배지 + 강조 테두리 + 설명 줄 `깨어나면 아침이에요`.
- 오늘 남은 조각이 있으면 `✨ 오늘 남은 조각 N개`.
- 바깥 탭·닫기 = 취소(`dream_choice{choice:'cancel'}`).

## 6. 컷신

`js/dream/cutscene.js` — 프롤로그의 시간 키 컷 + smoothstep 문법.

| 구간(첫 회) | 내용 |
|---|---|
| 0–1.4s | 보랏빛 암전 페이드 인 + 자막 `스르르… 꿈속으로` |
| 1.4s | 플레이어를 비행 경로 시작점으로 옮겨 초승달 마차에 앉힌다, 암전 걷힘 |
| 1.4–4.5s | 마차가 구름 바다 위를 곡선으로 날아 달맞이 섬에 내려앉는다. 카메라는 옆에서 따라가다 섬 쪽으로 돈다 |
| 4.5s | 하차(서기 포즈), 마차는 섬 가장자리에 정박, 조작 복귀 |

- 두 번째부터: 1.4s 잠들기 → 0.4s 짧은 비행 끝부분 → 도착 = 1.8s.
- 건너뛰기: 화면 탭 / 액션 / Esc → 즉시 도착. `dream_cutscene_end{skipped, at_s, short}`.
- 입력 잠금은 기존 `sleeping` 플래그 재사용.
- 마차 = 시안의 초승달 요람(두 원호 외곽선 Extrude) + 구름 양 둘 + 등불. `js/dream/art.js`.

## 7. 깨어나기

- 🛏️ 구름 침대 옆(1.8m) 프롬프트 `🛏️ 구름 침대 · 깨어나기`. 액션 → 암전 → 집 침대 옆, `timeOfDay = WAKE_TIME`, BGM main, 저장.
- 아침 토스트: 조각을 주웠으면 `☀️ 잘 잤어요 · 꿈 조각 ✨{N}개`, 아니면 기존 문구.

## 8. 꿈 장식 4종 (화폐 ✨)

`DECOR` 에 `pay: 'shard'` — 기존 꾸미기 메뉴·창고·옮기기를 그대로 탄다.

| id | 이름 | 아이콘 | 값 | 비고 |
|---|---|---|---|---|
| `moonLamp` | 달 램프 | 🌙 | 5 | 상판 소품(`sm`, h 0.55), 발광 |
| `crystalPot` | 수정 화분 | 💎 | 8 | 상판 소품(`sm`, h 0.7) |
| `starMobile` | 별 모빌 | ⭐ | 12 | 바닥 스탠드, foot 0.5×0.5 |
| `cloudBed` | 구름 침대 | ☁️ | 20 | `big`, foot 1.5×2.2, `sleep: true` — 이 침대로도 자기·꿈꾸기 |

- 총 45조각 ≈ 7밤.
- 목록 노출: `dream.visits > 0` 또는 창고 보유분 있음. 그 전엔 숨긴다.
- 결제 아이콘 `✨`, 부족 토스트 `꿈 조각이 부족해요 (필요 N ✨)`.
- 밤 침대 판정 `def.id === 'bed'` → `def.id === 'bed' || def.sleep`.
- 천장 규칙 테스트에 새 소품 포함.

## 9. 온보딩 (단계마다 1회, `gameState.hintsSeen`)

| 키 | 언제 | 무엇 |
|---|---|---|
| `dreamNight` | 꿈을 안 꿔 본 사람이 밤에 집 안 침대 근처에 처음 왔을 때 | 배너 `🌙 꿈꾸기` / `밤엔 침대에서 꿈의 숲에 갈 수 있어요` |
| (상시) | 선택 창, `visits === 0` | 🌙 NEW + 설명 |
| `dreamArrive` | 첫 도착 | 안내 카드 3줄 + `좋아요` |
| `dreamShard` | 첫 조각 | 배너 `✨ 꿈 조각` / `구름 침대에 누우면 아침에 깨어나요` |
| `dreamWake` | 첫 깨어남 | 배너 `✨ 꿈 장식` / `🛋️ 꾸미기에서 꿈 조각으로 바꿔요` |

- 꿈속 프롬프트: 남았으면 `✨ 반짝이는 조각을 찾아보세요 · {N}개 남음`, 다 모았으면 `🛏️ 구름 침대에서 깨어나요`.
- HUD 칩: `🌙 꿈의 숲 · ✨ {got}/7`.
- 각 안내가 실제로 떴을 때 `dream_hint{step}`.

## 10. 트래킹

공통: 예약 파라미터(`source` 등) 금지, id·축은 키값. `trackEvent` → `session_logs.counts` 자동 집계.

| 이벤트 | 파라미터 |
|---|---|
| `dream_prompt_shown` | `visit_n`, `left_today` |
| `dream_choice` | `choice: sleep\|dream\|cancel`, `first: 0/1`, `left_today` |
| `dream_cutscene_end` | `skipped: 0/1`, `at_s`, `short: 0/1` |
| `dream_enter` | `visit_n`, `left_today` |
| `dream_shard` | `shard_id`, `island`, `nth_today`, `elapsed_s` |
| `dream_wake` | `via: bed`, `shards`, `elapsed_s`, `left_today` |
| `dream_hint` | `step: night\|arrive\|shard\|wake` |
| `decor_buy_shard` | `item`, `cost`, `left` |

- 기존 `sleep{from}` 은 💤 선택 때 그대로(지표 연속성).
- Supabase 별도 테이블 없음 — 조각은 코인이 아니라 `econ_logs` 대상이 아니고, 당일 확인은 `session_logs.counts` 로 충분.
- 배포 다음 날 BigQuery 퍼널 재검증.

## 11. 코드 구조

| 파일 | 역할 | 의존 |
|---|---|---|
| `js/dream/layout.js` | 좌표 표, `clampWalkable`, `pickShards`, `normalizeDream`, `islandOf`, `shardsLeft` | 순수 — Node 테스트 |
| `js/dream/art.js` | 섬·나무·구름 침대·초승달 마차·조각 메시 | THREE |
| `js/dream/cutscene.js` | 컷신 상태·경로·카메라 | THREE |
| `js/spaces/dream.js` | 공간 빌드(지연)·들어가기/깨어나기·조각·프롬프트·HUD·트래킹 | game.js(순환 import 규칙) |

game.js 는 연결부만. UI(index.html): 선택 모달, 도착 카드, 컷신 건너뛰기, HUD 칩, 꾸미기 ✨ 아이콘.

## 12. 테스트

- `tests/dream-layout.test.mjs`: `pickShards` 결정성·7개·섬마다 ≥1·main 2개 / `clampWalkable` / `normalizeDream`.
- `tests/dream-wiring.test.mjs`(소스 검사): `atDream` 연결 지점들, 이벤트 8종, 예약 파라미터 미사용.
- 기존 테스트 갱신: shadow-scope, minimap, decor-ceiling, i18n.
- 브라우저 실측: 선택 창 → 컷신 → 조각 → 깨어나기 → ✨ 결제 → 구름 침대로 꿈꾸기, PC·모바일 캡처.

## 13. 하지 않는 것 (1차)

높이 다른 섬·점프 · 꿈 NPC · 별자리 연동 · 🪞 거울 마을 · 조각 판매 · 리더보드.
