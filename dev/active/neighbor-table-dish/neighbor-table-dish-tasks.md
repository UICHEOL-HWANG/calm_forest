# neighbor-table-dish tasks

- [x] 현황·이용량 확인, 시안 3종, 실화면 구도 확정 (2026-11-19)
- [x] 계획 작성
- [x] 0. 워크트리 claude/neighbor-table-dish-0d8ba4 (main 073160e6 기준), npm test 기준선 6291 pass / 0 fail
- [x] 1. js/neighbors/dish-rules.js + 테스트 (265d7f58)
- [x] 1. sql/migrations/migrate_neighbor_dishes.sql, 셀프테스트 ⑧, tests/neighbor-dish-sync.test.mjs (운영 적용 안 함, 265d7f58)
- [x] 2. 문구 후보 검수 요청 (표대로 확정, 상한 이대로, 운영 SQL 은 롤백 시험만 → ALL PASS)
- [x] 2. 답방 목록: api·rules·ui, 허용 목록, i18n (c023a0b2)
- [x] 3. seat-rules + 테스트, seat.js, scene.js 식탁 충돌·seatHost
- [ ] 3. 실화면 캡처 12조합 완료(verify/seat-shots.mjs). 머리 위 🪑 동그라미는 사용자 지적으로 앉은 동안 숨김. 앉기 값 최종 확인 대기
- [ ] 4. 요리 고르기 시트, cook-course neighbor 분기, pantryGive, 서버 호출, 접시·별 표시
- [ ] 4. 가짜 API 하네스로 성공·실패 경로 확인
- [ ] 5. 집주인: dish-inbox, 한 입 버프, 평가, 답방, 접속 알림 연결
- [ ] 6. 개인정보 처리방침·가이드, 트래킹 스키마 테스트
- [ ] 6. code-reviewer, security-reviewer, 지적 반영
- [ ] 7. (분리) 접속 중 표시 가능 여부 확인
- [ ] 사용자 승인 뒤: 운영 SQL 적용 + 셀프테스트
