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
- [x] 사용자 승인 뒤: 운영 SQL 적용 + 셀프테스트 (2026-11-19, ALL PASS, 잔여 0, anon 실행 불가 확인). 앱은 미배포
- [x] 최종 QA (2026-11-19, 병합된 main 과 같은 트리, 가짜 이웃 API·헤드리스)
  - 방문자(flow-verify) 폰 세로·가로·PC: 4판 진입·복귀·찬장 −1·🪙+5, 실패 6경로·그만두기·게스트·빈 찬장에서 찬장·코인 그대로
  - 집주인(host-verify) 폰·PC: 한 입 버프 45초, 평가 1회, 답방 입장, 먹은 날 잠금, 실패 3경로, 답방 불가 이웃 단추 없음, 요리책 "🍽️ 이웃 접시 3"
  - 회귀(qa-kitchen) 폰·PC: 이웃 한 판 전후 내 요리 기록·재료 불변, 내 주방 결과 창(닫기·점수·먹기/보관) 복구
  - 콘솔 오류 0건(모든 실행)
  - 관찰: 가로 폰에서 요리 판 카드가 무대를 거의 가림(기존 주방과 같은 배치, 이번 변경 아님)
  - 못 한 것: 실기기, 실제 서버 계정 두 개로 주고받기, 영어 화면 캡처

## 보완 4건 (2026-11-20, 브랜치 claude/dish-hardening-bf8eee)
- [x] 1. 다계정 코인: 운영 village_dishes 0행(앱 미배포). 코인은 주는 사람 자기 세이브에 들어가고 계정 사이로 옮길 길이 없어, 새 계정을 여러 개 만들어도 본계정 이득은 없다. 계정당 하루 🪙15 상한은 방문 보상(neighbor_react 하루 3회)과 같은 틀. "하루 첫 접시만 🪙5" 안은 사용자 결정 대기(SQL `'rewarded', v_first` 한 곳 + 고르기 창 안내 문구 1줄, 클라는 이미 서버 rewarded 를 따른다)
- [x] 2. 차단 뒤 접시: my_table_dishes·my_visitors·neighbor_dish_eat 는 이미 차단한 사람 접시를 뺀다(셀프테스트로 확인). 빠진 곳은 neighbor_dish_leave 의 6칸 집계 하나였다. 차단한 사람 접시가 7일 동안 칸을 차지해 다른 이웃이 full 을 받았다. migrate_neighbor_dishes_block_full.sql 로 고침(운영 본문에서 출발, 한 줄). 운영 롤백 시험: 패치 전 새 검사 FAIL(full), 패치 후 ALL PASS. 운영 미적용
- [x] 3. 점수 자가 신고: 보류. 보상(🪙5)이 별과 무관하고, 별은 집주인 한 입 버프 길이(30·38·45초)와 표시에만 쓰인다. 서버에서 판을 다시 돌리려면 입력 기록 검증이 필요해 비용이 크다. 보상을 별에 묶는 날 다시 본다
- [ ] 4. 가로 폰 요리 판 카드: 시안 A(아래 띠)·B(오른쪽 패널)·C(낮은 카드+둥근 탭) 캡처 비교, 사용자 선택 대기. 가로 폰 미디어 쿼리 안에서만 바꾸고 PC 는 그대로
