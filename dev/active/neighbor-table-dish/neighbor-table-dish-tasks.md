# neighbor-table-dish tasks

- [x] 현황·이용량 확인, 시안 3종, 실화면 구도 확정 (2026-11-19)
- [x] 계획 작성
- [x] 0. 워크트리 claude/neighbor-table-dish-0d8ba4 (main 073160e6 기준), npm test 기준선 6291 pass / 0 fail
- [x] 1. js/neighbors/dish-rules.js + 테스트 (265d7f58)
- [x] 1. sql/migrations/migrate_neighbor_dishes.sql, 셀프테스트 ⑧, tests/neighbor-dish-sync.test.mjs (운영 적용 안 함, 265d7f58)
- [x] 2. 문구 후보 검수 요청 (표대로 확정, 상한 이대로, 운영 SQL 은 롤백 시험만 → ALL PASS)
- [x] 2. 답방 목록: api·rules·ui, 허용 목록, i18n (c023a0b2)
- [x] 3. seat-rules + 테스트, seat.js, scene.js 식탁 충돌·seatHost
- [x] 3. 실화면 캡처 12조합(verify/seat-shots.mjs), 앉기 값 확정. 앉은 동안 머리 위 🪑·미니맵 숨김, 걸을 때 미니맵은 상단 줄 아래
- [x] 4. 요리 고르기 창 → 기존 요리 판 한 판(cook-course neighbor 분기) + 이웃 전용 그루터기 무대(시안 A·B·C 중 C 확정), pantryGive, 서버 호출, 접시·별 표시
- [x] 4. 가짜 API 하네스(verify/flow-verify.mjs): 4판(끓이기·간·굽기·썰기) 진입·복귀, 실패 6경로·게스트·빈 찬장에서 찬장·코인 그대로
- [x] 5. 집주인: js/table/dish-inbox.js, 한 입 버프(30·38·45초), 평가 4종, 답방(visitBack), 접속 알림(8초 뒤 modalQueue)·요리책 머리 단추. verify/host-verify.mjs 로 폰·PC 확인. 내 식탁에 앉아서 먹는 연출은 미구현
- [x] 6. 개인정보 처리방침·가이드(문구 확정본), 트래킹 스키마 테스트(이벤트 4종, 분류표 등록)
- [x] 6. code-reviewer, security-reviewer, 지적 반영(그만두기=취소, 서버 10초 타임아웃, 찬장 칸 없으면 코인 없음, 답방 마을 밖 차단, 숨김 이용자·페르소나 올리기 거절). 롤백 시험 ALL PASS 재확인, 웹 빌드 성공
- [x] 7. (분리) 접속 중 표시 가능 여부 확인: 가능(supabase-js 2.116 presence). 토스 웹뷰 wss·요금제 동시 접속 한도는 미확인, 구현 안 함
- [ ] 사용자 승인 뒤: 운영 SQL 적용 + 셀프테스트
