# meta-ads — tasks (Last Updated: 2026-10-19)
## 광고 켜기 전 (필수)
- [x] 1 Meta Pixel 모듈 + 결제 이벤트 + customData.attr + 테스트 (feat/meta-pixel)
- [x] 2 Pixel 'calm forest web' 1986547471986641 생성(2026-10-19, Aside·약관 동의 승인) · 광고 계정 1081146891511146 소유 · config 반영
- [ ] 3 👤 Supabase Authentication → SMTP 커스텀(Resend 등) 연결 여부 확인
- [x] 4 (2026-10-19 5b9cb32a) 인앱 브라우저 로그인 처리(plan §2) — 감지 순수 함수 + 테스트 · 이메일 메인 · 안드로이드 크롬 intent 버튼 · iOS 안내 · URL 에 utm/fbclid 재부착 · GA4 이벤트
- [ ] 5 PR 생성 → 리뷰 → 웹 배포(웹만)
- [ ] 6 👤 배포 후 Events Manager 테스트 이벤트로 실결제 1건 — Purchase value·currency 확인(Paddle.js checkout.completed data.totals.total 형태 확인)
- [ ] 7 👤 광고 URL utm: ?utm_source=meta&utm_medium=paid&utm_campaign=<캠페인>&utm_content={{ad.name}}
- [ ] 8 👤 개인정보처리방침에 Meta Pixel 사용 문구
## 이후
- [ ] 9 CAPI — 웹훅에서 Purchase 서버 전송(event_id = txn id, attr.fbc/fbp 사용)
- [ ] 10 purchases → BQ export(컬럼 선별) · ads_funnel.sql 에 결제 단계 조인(user_id)
- [ ] 11 Paddle 대시보드 결제수단(Apple Pay·Google Pay·국내 간편결제 지원 여부) 확인
- [ ] 12 1~2주 데이터 보고 스타터 키트 검토(새 kind 'kit' — entitlements.js 소모성 지급·환불 회수 규칙 필요)

## 발견(2026-10-19)
- E2 종료로 웹 신규 기기는 전부 skip_login → 광고 유저는 로그인 화면을 거의 안 본다. 게임 안 가입 수단은 구글뿐이라 인앱에선 가입 불가 → CompleteRegistration 표본 부족 우려. 후속: 게스트 이메일 연결
- 👤 Pixel '상세한 페이지 및 제품 정보 자동 포함' 기본 ON(끌지 결정)
- 👤 광고 계정 결제 수단 없음(has_payment_method false)
