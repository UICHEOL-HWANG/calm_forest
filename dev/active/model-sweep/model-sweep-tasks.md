# 모델 Sweep · 체크리스트

- [x] dev docs
- [x] model_eval: 시간 분할·폴드 내 대체·지표 (테스트 먼저)
- [x] model_zoo: 6패밀리 build·피처 묶음 (테스트 먼저)
- [x] sweep 러너·yaml·family당 3런 스모크
- [x] select: 홀드아웃·bootstrap CI·후보 json
- [x] storage(OCI 버킷)
- [x] 전체 Sweep 1회(6패밀리 30런, 11/09) → 게이트 통과 0/18, 현행 유지. 다음 Sweep 은 양성 2배쯤(약 12월)
- [ ] (트리 승리 시) tree_export·API 분기·정합성 테스트
- [ ] Sweep DAG(VM 이전 뒤 배포)
- [x] 리뷰 에이전트(python-reviewer) 지적 반영: 결측 의존 표·time_split 검증·paired bootstrap 게이트·sklearn<1.10

- [x] VM 2대 이전(11/09): 버킷 경유 model_sync·ship_logs, DAG 8개 수동 검증 성공, 다운 구간 ANALYSIS_GATES 기록
- [ ] 클라이언트 엔드포인트 lab → ml 전환(게임 5곳 배포 필요)
- [x] W&B 시각화(11/09): 폴드별 지표(fold/*)·부스팅 반복 곡선(curve/*) step 기록, 실행 묶음 태그 batch-YYYYMMDD-HHMM, Sweep 끝나면 sweep_report.py 가 평행좌표·중요도·최고값·곡선 리포트 자동 생성(--no-report 로 끔). 11/09 기존 180런에 batch-20261109 태그 붙여 리포트 생성·구조 확인
