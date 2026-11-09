# admin A/B 대시보드 갱신 — 체크리스트

- [x] 계획 승인
- [x] funnel 화면 + analyzeExperiment 분기 (테스트 먼저, node 36 통과)
- [x] experiment_summary.py: run_e5 · run_hguide · run_gift_path (pytest 14 통과)
- [x] 마이그레이션 작성·실행 (ads_w1 삭제, e5·hguide·gift_path·ads_h1·h6·h7 추가, DB 반영 확인)
- [x] E1·E5·hguide·gift_path 결과 DB 에 계산·저장
- [ ] 광고 CTR 숫자 입력 — 사용자 몫(메타 광고 계정 MCP 롤아웃 제한, 노출·클릭·광고비 필요)
- [x] 화면 확인(미리보기 + RPC 대역)
- [ ] code-reviewer 결과 반영
- [ ] 배포(대시보드 정적 파일 · supabase-to-bq 워크플로 반영) — 사용자 요청 시

## 메모
- 로컬 .env 의 SUPABASE_SERVICE_KEY 는 REST 401. 로컬 실행은 풀러(pg8000)로 persona·upsert 우회(scratchpad run_summary_local.py)
- 안내(login_nudge)를 본 기기에는 exp_login 이 없다 → E5 와 가입 선물 경로는 무리별로 못 나눈다
- 이메일 화면 이후는 기기 ID 가 바뀌어 연결 불가(별도 집계)
