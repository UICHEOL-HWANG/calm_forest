# 🤝 친구 초대 대시보드 — 계획

목표: 관리자 대시보드(`dashboards/admin_analytics.html`)에 🤝 친구 초대 섹션 추가. 새 사이트 X.

1. 시안 3개(PC·모바일) → 사용자 선택
2. SQL RPC: referrals·purchases(source='referral')·GA4 아님(서버 진실) — 퍼널·실패 사유·K-factor·단계 분포·상위 초대자(uid 마스킹)
3. admin_analytics.html 섹션 렌더(_dash.css 토큰·V() 만)
4. KPI 슬랙 리포트에 한 줄 추가(managed-agents kpi-daily)
5. 검증(빈 데이터 상태 포함) → 웹 배포(대시보드는 웹만)

데이터 출처
- 서버: referrals(invitee·inviter·bound_at·activated_at·platform) · purchases source='referral' · referral_bind_fails
- GA4(BQ): invite_sheet_open · invite_share{channel} · invite_land · referral_bind{result} — 공유·도착 단계만 GA4 에 있다
