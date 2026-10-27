# 갯벌 캐기·잠수 트래킹 설계 (ML 학습 고려)
Last Updated: 2026-10-27

## 원칙
- **GA4는 얇게(퍼널), Supabase는 두껍게(학습용).** GA4는 이벤트당 직접 넣는 키가 23개까지이고(trackEvent가 ts·platform 2개를 더함), 넘치면 아무 키나 버려진다. 학습에 쓸 세부 기록은 한도가 없는 `forage_runs`에 한 판당 한 줄로 남긴다.
- **GA4 새 키 0개.** 모두 이미 쓰는 키를 재사용한다(mode, run_id, attempt_n, items, coins, good, bad, rare, reason, duration_ms, first, night, weather, ease, dda, arm, probe_v).
- **같은 run_id**(crypto.randomUUID)로 GA4 이벤트와 Supabase 행을 잇는다. 썰매(js/mountain/sled-run.js, sled_runs)와 같은 구조.
- **난이도를 흔들어야 배울 게 있다.** 판마다 ease를 probe 팔로 바꾸고(블록 셔플, js/difficulty.js), 실제로 적용된 값(창 폭·숨 길이)을 행에 남긴다.
- 개인정보 없음. 식별자는 기존 user_id·client_id·session_id만 쓴다.

## GA4 이벤트

| 이벤트 | 파라미터(키 수) | 언제 |
|---|---|---|
| `sea_mode_pick` | mode(fish/mudflat/dive/cancel), first, night, weather (4) | 선택 화면에서 고르거나 닫을 때 |
| `forage_start` | mode, run_id, attempt_n, ease, dda, arm, probe_v (7) | 한 판 시작 |
| `forage_result` | mode, run_id, items, coins, good, bad, rare, reason, duration_ms, ease, dda, arm, probe_v (13) | 한 판 끝(밀물·숨 3번) |
| `minigame_abandon` | game, stage, run_id + diffParams (기존 `trackDiffAbandon`) | 중간에 나감 |

캐기·줍기 하나하나는 GA4로 보내지 않는다(분당 15건이라 퍼널 분석엔 소음, 학습 기록은 Supabase에 배열로).

## Supabase `forage_runs` (한 판 = 한 줄)

| 묶음 | 컬럼 | 학습에서 쓰임 |
|---|---|---|
| 식별 | user_id, session_id, client_id, is_guest, variant, platform, run_date, run_id(unique), mode CHECK(mudflat/dive), logic_v | 조인·버전 분리 |
| 결과(라벨) | outcome CHECK(finish/abandon), abandon_stage, end_reason(tide/dives/exit), duration_ms, items, coins, sell_value, rare_count, good, bad, bag jsonb | 성공·포기·보상 라벨 |
| 맥락(특징) | attempt_n, first_time, entry(pick/again), prev_mode, night, weather, season, input(touch/mouse/keys), orientation, fps_avg, coins_before | 이탈·재도전·추천 특징 |
| 난이도 | ease, arm, dda, probe_v, window, breath_s, tide_s | 난이도-반응 곡선 |
| 갯벌 시퀀스 | acts jsonb `[[t_ms, phase100, hit01, depth, sp]]`, lost_tide, lost_miss, idle_ms | 타이밍 오차 분포 = 실력 추정 |
| 잠수 시퀀스 | dives jsonb `[[n, start_ms, end_ms, depth10, items, air100, ooa01]]`, picks jsonb `[[t_ms, depth10, sp, air100]]` | 위험 감수 성향(숨 얼마 남기고 올라오나) |

- 배열은 판당 200개로 자르고, jsonb 합계 8KB CHECK(sled_runs와 같은 방식).
- phase100 = 누른 순간의 숨 위상×100. 0~29가 성공 창이고, 거리가 곧 타이밍 오차다.
- 재도전 라벨은 다음 판의 entry='again'과 시간 간격으로, 다음 날 복귀는 세션 조인으로 만든다(행에 미리 넣지 않음).

## 난이도 probe (js/tuning.js DIFFICULTY)
- `mudflat: { arms: [0.8, 1.0, 1.25], target: 0.7, ddaOn: false }` → 창 폭 = .3 × ease (0.24~0.375)
- `dive: { arms: [0.85, 1.0, 1.15], target: 0.7, ddaOn: false }` → 숨 길이 = 20초 × ease (17~23초)
- DDA는 꺼 둔다(썰매처럼). 목표값이 없는데 움직이면 팔 비교가 오염된다. 표본이 쌓이면 켤지 다시 정한다.

## 이 데이터로 할 수 있는 학습
1. 실력 추정: 판별 타이밍 오차 분포 → 플레이어별 숙련도 곡선(몇 판 만에 안정되는가)
2. 난이도-반응: ease → 성공률·끝까지 하기·다시 하기. 적정 창 폭을 데이터로 정함
3. 이탈·재도전 예측: 맥락+결과 특징으로 "이 판 뒤에 그만둘까" 분류(기존 이탈 예측 파이프라인 특징으로 합류)
4. 선택 화면 추천: 누가 어떤 놀이를 고르고 오래 하는가 → 첫 카드 순서·강조 개인화

## 검증
- 단위 테스트: 행 빌더가 컬럼을 빠짐없이 채우는지, 배열 200개 자르기, GA4 이벤트 키 수 ≤ 23
- 배포 다음 날: BigQuery에서 세 이벤트 수와 run_id 이어짐, forage_runs 행 수가 forage_start와 맞는지 확인
