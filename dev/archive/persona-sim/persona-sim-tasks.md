# persona-sim tasks
- [x] personas.json 페르소나 13종(정상 11 + 이상 2: p09 반복 파밍·p10 방치) · quota 합계 339판
- [x] supabase-admin.mjs 계정 생성·세션 발급 (페르소나당 계정 a~e)
- [x] run.mjs 세션 주입 + aside exec + runs/*.jsonl 라벨 + 락 + 라운드로빈·할당 건너뜀
- [x] 파일럿(p11-a) 통과 · 락 미해제/탭 미종료(play_sec 꼬리) 버그 수정
- [x] 본 수집 339/339판 완료 (2026-10-04 14:11 KST)
- [ ] 병렬: Aside u1/u2 프로필 로그인 실패(Local Account) — 해결되면 --slots 기능 추가
- [ ] 분석: runs/*.jsonl ↔ game_logs/session_logs/econ_logs 조인(user_id), p02-a 첫 판은 play_sec 꼬리 → runs 시각 사용
- [x] 이상치 탐지 1차: ml/sql/anomaly_session_features.sql · ml/calm_ml/anomaly_features.py · ml/train_anomaly.py · tests 5개 (2026-10-03)
      첫 실행(BQ 115세션): ROC-AUC 0.79 · 상위5% 임계 재현율 0 · 실제 유저 19세션 중 21% 플래그 → 이상 판 40개 다 쌓이면 재실행
