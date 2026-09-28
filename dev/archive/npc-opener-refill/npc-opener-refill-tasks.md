# 체크리스트 — npc-opener-refill

- [x] 빈 조합 탐지 — `planOpeners(rows)` (npc × lang × weather 중 3줄 미만, 모자란 줄 수만)
- [x] 크론 보충 루프 — `planCronWork` 로 첫인사 빈칸이 본문보다 먼저 예산(MAX_COMBOS 15)을 받는다 · 서브리퀘스트 최악 34/50
- [x] 테스트 8개(tests/npc-talk.test.mjs) — RED 확인 후 GREEN · 전체 1,295 통과 · code-reviewer APPROVE
- [x] 커버리지 가시화 — rpc 신설 대신 보충한 주에 🟡 메일 알림(SQL 적용 불필요). 관제 게이지는 ops-monitor 재개 시
- [x] 배포(wrangler) 2026-09-28
