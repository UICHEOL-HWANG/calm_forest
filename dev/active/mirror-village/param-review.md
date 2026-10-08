# 🪞 거울 마을 이벤트 파라미터 정리안 (Task 15 · 2026-10-08)

근거: BQ `analytics_547127440` 30일 키 실측 + 꿈의 숲 1차(`js/spaces/dream.js`) 키.
원칙: 정보 삭제 없음(파생 가능한 것만 뺌) · 기존 키로만 이름 바꿈 · 이벤트당 ≤5(현재 최대 6).

## 키 단위

| 지금 키 | 쓰는 이벤트 | 기존에 있나 | 제안 | 이유 |
|---|---|---|---|---|
| `npc_id` | clue | ❌ (`npc` 13종 이벤트) | **→ `npc`** | 주민 키 통일 |
| `item_id` | found | △ (`item` 20종 · `item_id` 는 꾸미기 4종) | **→ `item`** | decor_buy_mirror 도 `item` |
| `wait_s` | hint | ❌ | **→ `elapsed_s`** | 꿈 1차 키 · "단서 들은 뒤 초" 같은 뜻 |
| `search_s` | found | ❌ | **→ `elapsed_s`** | 위와 같음 |
| `done_today` | board·enter·leave | ❌ | **→ `left_today`(=3-done)** | 꿈 1차 키 · 값은 남은 의뢰 수 |
| `reward` | return | ❌ | **이벤트째 빼기 후보** | `hinted ? 2 : 3` 로 파생 · return 은 found 직후 같은 프레임 |
| `quest_n` | clue·hint·found·return | ❌ (`quest_id` 는 문자열 id) | 유지 | 1~3 순서, 퍼널 축 |
| `spot_id` | clue·hint·found | ❌ | 유지 | 어려운 자리 분석 |
| `flipped`·`hinted` | clue·found | ❌ | 유지 | 스펙 §성공지표(반전 해결률·힌트율) |
| `dir` | board·cutscene_end | ❌ | 유지 | 갈 때/올 때 |
| `prior_visits`·`first`·`skipped`·`at_s`·`short`·`visit_n`·`elapsed_s`·`step`·`night`·`item`·`cost`·`left` | — | ✅ (기존·꿈 1차) | 그대로 | |

결과: 새 키 **10 → 5**(`quest_n`·`spot_id`·`flipped`·`hinted`·`dir`) · 이벤트 11 → 10(return 빼면).

## 이벤트 단위 (제안 반영 후)

| 이벤트 | 파라미터 | 쓰는 분석 |
|---|---|---|
| mirror_stop_shown | prior_visits, night | 정류장 노출→탑승 전환(접근마다 1회) |
| mirror_board | dir, first, left_today | 탑승 퍼널 |
| mirror_cutscene_end | dir, skipped, at_s, short | 연출 건너뛰기율 |
| mirror_enter | visit_n, left_today | 재방문 |
| mirror_clue | quest_n, npc, spot_id, flipped | 의뢰 퍼널 시작 |
| mirror_hint | quest_n, spot_id, elapsed_s | 반전별 힌트율·대기시간 |
| mirror_found | quest_n, item, spot_id, flipped, hinted, elapsed_s | 해결률·탐색시간(6개 — 상한 23 대비 여유) |
| mirror_leave | left_today, elapsed_s | 체류 |
| mirror_onboard | step | 온보딩 |
| decor_buy_mirror | item, cost, left | 조각 소비(decor_buy_shard 와 같은 모양) |

GA4 측정기준 등록은 하지 않는다(BQ 로 분석) — 50칸 한도와 무관.
