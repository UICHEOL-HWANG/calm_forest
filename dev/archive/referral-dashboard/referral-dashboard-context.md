# 🤝 친구 초대 대시보드 — 컨텍스트
Last Updated: 2026-10-09

- 작업 위치: `.claude/worktrees/ga4-param-split` (main)
- 스타일: `dashboards/_dash.css` — 차트 색은 토큰이 유일 출처(V('--s1')), 카테고리는 s1→s5 순서 고정
- 기존 퍼널 렌더: admin_analytics.html `funnelRows()` (.funnel-row · .drop.worst)
- 관리자 RPC 패턴: dashboard-redesign memory · admin-uid-guard(이메일+UUID)
- 시안: `mockup.html?v=A|B|C`, 비교판 `compare.html`
- 결정: C안(한 장 요약+실패 사유+단계 보상·감시). 실패 사유는 Worker 가 referral_bind_log 에 기록(새 테이블). 제외 계정은 ex CTE 한 곳
