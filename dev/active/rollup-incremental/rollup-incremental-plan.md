# 관리자 대시보드 롤업 증분화 — 계획 (2026-11-09 사용자 확정: 검증까지)

## 배경
- `cf_rollup_recent()`(pg_cron */10)가 하루치 원본 전체를 매번 재집계 → 비용이 하루 누적 행 수에 비례.
- 11/1~11/6 광고 기간 평균 20s·최대 57s, 같은 DB 쓰기와 경합. 11/9 1차 조치로 "오늘만" 집계(어제는 03:00 야간 확정).
- DAU 10배 시 다시 수 분 단위가 되므로 증분 구조로 바꾼다.

## 구조
1. 1단계 중간표(세션 단위, 신설)
   - `cf_heat_sess(session_id, day, slot, map, persona, gx, gz, hits)`
   - `cf_hour_sess(session_id, day, hour, map, persona, uid, hits)`
   - `cf_sessions`·`cf_session_zones` 는 원래 세션 단위 → 해당 세션만 덮어쓰기
2. 2단계 대시보드 표(형태 그대로): 건드린 날의 `cf_heat_day`·`cf_heat_slot`·`cf_map_hour` 를 중간표 group by 로 재생성, `cf_econ_day` 는 그날 원본 재계산
3. 공통 함수 `cf_rollup_sessions(sessions[], floor)` + `cf_rollup_days(days[])`
   - 10분 증분 `cf_rollup_incremental()`: 마지막 실행 −5분 이후 행이 들어온 세션
   - 야간 `cf_rollup(from, to)`: 기간 안에 행이 있는 세션 전부(시그니처·반환 키 유지)
4. 기준 시각 `cf_rollup_state(id=1, last_ts)`

## 단점 대응
| 위험 | 대응 |
|---|---|
| distinct uid 는 못 더함 | 중간표에 uid 보관 → 그날 다시 distinct |
| 나룻배 판정이 나중에 뒤집힘 | 세션 전체 재계산 + 세션 중간표 통째 교체 |
| 커밋 지연 행 누락 | 직전 5분 겹쳐 읽기 + 세션 덮어쓰기, 03:00 전체 재확정 |
| 중간표 미완성 날 | 적용 시 floor~오늘 전체 채움, floor 이전 날은 중간표 정리·재생성 안 함 |
| prune 경계 날 | 기존 v_floor 규칙을 공통 함수에 그대로 |
| 긴 세션(최장 74h) | 세션 인덱스로 전체를 읽음 → 기존(3h·±1일 창)보다 정확, 미세 차이 보고 |
| 결과 차이 | 검증 통과 전 크론 전환 안 함 |
| 되돌리기 | 크론 명령만 `cf_rollup_recent()` 로 복귀 |

## 검증(운영 데이터, 한 트랜잭션, ROLLBACK)
1. 새 전체 vs 기존 전체(최근 5일) 행 단위 비교, 차이는 원인별 분류
2. 증분(4시간 조각으로 원본 재투입) vs 한 번에 전체 → 완전 일치
3. 합성 세션으로 나룻배 뒤집힘 재현 → 증분 = 전체
4. 피크일(11/5) 10분 창 증분 1회 시간 vs 기존 하루 전체

## 적용(검증 보고 후 재확정 받으면)
1. 마이그레이션 적용 → `cf_rollup(floor, today)` 1회로 중간표 채움
2. 크론 명령을 `cf_rollup_incremental()` 로 교체
3. 다음 03:00 GH Actions `rollup_before_prune` 결과 확인
