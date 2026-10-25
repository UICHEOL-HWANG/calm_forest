# cave-delve · tasks

## 설계

- [x] 방해꾼 시안(v1·v2) · 규칙 3안 · 몹별 대응 배정
- [x] 안내 3단·문구 확정 · 실제 게임 HUD 목업 PC·폰 10장(겹침 0, 한 줄)
- [x] 층 구조 · 내려가는 곳 위치 규칙
- [x] 기존 퀘스트와 겹침 6곳 정리 → 별도 트랙
- [x] 구조(모듈·저장·흐름)
- [x] 광부 A안 · 보상 목표 · 트래킹 7종
- [x] 스펙 작성 `docs/superpowers/specs/2026-10-25-cave-delve-design.md`
- [x] 사용자 스펙 검토(2026-10-25 승인)

## 구현 전

- [x] 하루 수입 시뮬 → S3 확정(광맥 2·1개 고정·보석 4→8%/10→18%) `sim/income-sim.mjs`
- [x] 구현 계획 `cave-delve-plan.md`(Task 0~13)
- [ ] 실행 방식 선택(서브에이전트 / 인라인)

## 구현(계획 확정 후 세분화)

- [ ] `js/data/delve.js`
- [ ] `js/delve/rules.js` + 노드 테스트
- [ ] `js/delve/pests.js` + 노드 테스트
- [ ] `js/delve/pest-art.js`(굽기·드로우콜)
- [ ] `js/delve/miner.js`
- [ ] `js/spaces/delve.js`
- [ ] 저장 복원·정리 · 퀘스트 패널 카드 · 배너/프롬프트/액션 아이콘
- [ ] 영어 사전 · i18n 검사
- [ ] 트래킹 7종
- [ ] 캡처 검증(PC·폰·320) · 드로우콜 실측
- [ ] 코드 리뷰
- [ ] 4곳 동시 배포(+iOS) · 다음 날 BigQuery 재검증
