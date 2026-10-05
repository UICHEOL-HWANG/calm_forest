# persona-sim context
Last Updated: 2026-10-02

- 코드: tools/persona-sim/ (personas.json · supabase-admin.mjs · run.mjs)
- 시크릿: .env SUPABASE_URL · SUPABASE_SERVICE_KEY · SUPABASE_ANON_KEY (node --env-file=.env)
- 세션 저장 키: sb-zuyxgjfihxtfdpolljzw-auth-token (supabase-js v2, persistSession)
- Aside 락: ~/Library/Application Support/calmforest/aside.lock (카드뉴스 크론과 공유, 30분 스테일 → 실행 중 touch)
- 식별: 이메일 도메인 sim.calmforest.local (토스/PGS 합성 계정 @toss/pgs.calmforest.local 과 같은 방식)
- 실행: nohup 분리 실행(Claude 백그라운드 작업은 시간 제한으로 죽는다, 2026-10-02 실측) · 로그 ~/Library/Logs/calmforest-persona-sim.log
- 병렬: Aside 프로필 u1/u2 는 브라우저는 되지만 에이전트는 로그인 필요 — 같은 계정 로그인이 안 붙음(미해결)
- 파일럿 발견: 마을 자원창에 🪨 없음 → 돌 사라짐으로 오인(p01) → index.html 수정(미배포)
- 2026-10-02 종료 시점: 29판 완료, 러너 정지·락 해제. 재개: cd ~/calm_forest && nohup node --env-file=.env tools/persona-sim/run.mjs --persona all --rounds 3 --minutes 20 >> ~/Library/Logs/calmforest-persona-sim.log 2>&1 &
- 페르소나 퀵 사유로 나온 게임 신호(미조치): 안개 재시작 버튼 미표시(p12)·낚시 '지금 낚아채요' 조작 불명(p04,p08)·요리 재료 왕복(p06)·도감 빈칸 전부 조건 잠금(p07)
- ⚠️ 배포 보류 상태: 웹은 09afa35(돌 칩 + 다른 세션 도구 세트 포함) 라이브 · 토스 -101 업로드만 · itch zip 빌드만 · capacitor 워크트리 main 병합 커밋만(빌드·푸시 안 함) — 사용자가 페르소나만 하라고 해 중단
