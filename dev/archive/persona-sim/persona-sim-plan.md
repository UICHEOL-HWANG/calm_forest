# persona-sim — 이메일 페르소나 계정 + Aside 플레이로 학습 데이터 쌓기

목표: 이메일 계정으로 페르소나를 만들고, Aside 브라우저 에이전트에 페르소나 지령을 줘
calmforest.cloud 를 플레이시켜 이탈 예측·난이도 조정(DDA)·이상치 탐지 학습 데이터를 쌓는다.

1. 계정: Supabase admin API 로 `persona-<id>@sim.calmforest.local` 생성(email_confirm, 메일 발송 없음)
2. 로그인: admin generate_link → verify 로 세션 발급 → aside repl 로 calmforest.cloud localStorage 에 주입
3. 플레이: `aside exec` 에 페르소나 지령 프롬프트 — 순차 실행(브라우저·localStorage 공유)
4. 기록: 실행마다 runs/*.jsonl 에 persona_id·user_id·시작/끝·aside 결과 (라벨 조인용)
5. 데이터: 게임의 기존 계측(game_logs·session_logs·econ_logs·GA4) 그대로. 계정 도메인/user_id 로 식별
