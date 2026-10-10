# 관리자 대시보드 v2 — 체크리스트

- [x] 1. 롤업 테이블·cf_rollup 마이그레이션 작성 + 셀프테스트 DO 블록
- [x] 2. 운영 DB 적용 + Supabase 원본(10/4~) 롤업
- [x] 3. BQ 백필(7/27~10/3) + 페르소나 플래그
- [x] 4. export_to_bq.py: prune 전 롤업, 실패 시 prune 건너뜀
- [x] 5. RPC cf_admin_dashboard 작성·적용·결과 수치 대조(기존 RPC 7일치와)
- [x] 6. 캐릭터 PNG → dashboards/img/chars
- [x] 7. admin_analytics.html A안 재작성 + 로딩 + 맵 필터
- [x] 8. dashboards/index.html 허브
- [x] 9. 브라우저 실측(PC·모바일·다크) + code-reviewer
- [x] 10. 실험 페이지 시안 3개 → 확정 후 구현
- [x] 11. 키 스캔 → main 병합 → 웹 배포

## 진행 메모 (2026-10-10)
- 롤업 검증: Supabase 원본과 날짜별 세션·DAU 정확히 일치(10/4~10/10)
- 페르소나가 9/28 주부터 세션 대부분(10/4: 290 중 281) → 서버에서 제외
- 맵 판정: 강 나룻배 코스가 꿈·거울과 좌표 겹침 → '먼 구역 방문 구간의 첫 위치' 규칙. 출시 전 꿈/거울 기록 0 확인
- RPC 서버 시간 0.53s(60일), 롤업 0.36s
- 브라우저: 실제 RPC 응답 픽스처(dev/active/.../fixtures, git 제외)로 렌더 · 로딩 · 맵 필터 · 모바일/라이트 확인
- 워크트리 npm ci 필요(@anthropic-ai/sdk) — 그 뒤 전체 테스트 통과

## 실험 페이지 (2026-10-11, main c9402f3 · 웹 배포)
- A(레지스트리+상세) + C(효과 그림) · 레지스트리 cf_experiments(시드 6개) · 결과 cf_experiment_results ← experiment_summary.py(매일)
- 힌트 배너는 사전등록 그대로(randomization 10k · 주민 클러스터 부트스트랩) · 10/14 이후, complete=true 일 때만 판정
- 리뷰 반영: numpy.bool_ 주민 키 버그(잠정값 −1.2 → −10.5%p, p=0.33) · NULL 플래그 · P1 KST · 입질 뒤 포기=실패 · intraday 제외
- 릴스 숫자는 수동 입력(페이지에 실행 가능한 SQL 안내)
