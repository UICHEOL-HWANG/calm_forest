# rollup-incremental — 체크리스트

- [x] 스키마·소비처 확인
- [x] dev docs
- [x] 마이그레이션 SQL 작성 (sql/migrations/migrate_rollup_incremental.sql)
- [x] 검증1 새 전체 vs 기존 전체(11/3~11/9): 세션 406·경제 166 완전 일치. 차이 = 구역 경로 11·꿈 히트맵 14칸(14 hits)·시간대 유저 −2 → 전부 같은 created_at 묶음 안에 먼 구역/일반 행이 섞인 세션(기존은 묶음 안 순서 임의, 신규는 id 순). 7일 전체 18.1s→15.9s
- [x] 검증2 증분 vs 전체(11/8 14,324행·17세션을 4시간 조각 6번 재투입): 6개 표 차이 0. 조각당 0.7~1.3s
- [x] 검증3 나룻배 뒤집힘(합성 세션): 꿈 20 → 강으로 재분류 후 0, PASS
- [x] 검증4 피크일(11/5): 하루 전체 4.7s, 최다 10분 창(3,098행·5세션) 증분 0.7s
- 검증 스크립트: scratchpad verify_rollup.py(advisory lock 선점 → RR 트랜잭션 → ROLLBACK). calm_ml.db.connect 소켓 timeout=15 → 긴 쿼리는 con._usock.settimeout(None)
- [x] 코드 리뷰(database-reviewer) — 데이터 오염 버그 없음. 반영 후보:
  - session_logs.updated_at 은 클라 시계(supabase-client.js upsertSessionRow) → 실측 409세션 중 18개가 서버보다 5분+ 느림. 증분이 "이동 로그 없이 요약만 갱신된" 세션을 놓칠 수 있음 → 서버 시각 컬럼(트리거)+인덱스로 감지
  - 야간 cf_rollup 한 문장 → 10배 규모에서 service_role 120s 초과 위험 → export_to_bq 가 하루씩 호출
  - 크론 교체는 한 번에(unschedule+schedule), cf_rollup_recent 무력화
  - prune 경계 걸친 긴 세션 요약을 잘린 원본으로 덮어씀 → 기존 start_ts < floor 이면 갱신 안 함
  - search_path 에 pg_temp, 보조 함수 service_role 실행 권한 회수
  - 겹침 5분 → 15분
- [ ] 결과 보고 → 사용자 재확정
- [ ] (확정 후) 운영 적용·중간표 채우기·크론 전환·03:00 확인
