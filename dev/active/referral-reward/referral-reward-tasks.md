# 🤝 친구 추천 보상 — 체크리스트

## 0. 설계
- [x] 보상 방향·단계 확정 (물뿌리개 1 / 아치 3 / 날개 5)
- [x] 시안 3종 (`mockup.html`)
- [x] 브랜치 격리 (feat/referral-reward 워크트리)
- [x] 별 테마 = 도구 세트 전체 · 활성화 원천 session_logs 수용 (2026-10-08)

## 1. DB
- [x] `migrate_referrals.sql`: referral_codes · referrals · RLS (+ referral_bind_fails · claim 쿨다운)
- [x] purchases.source 컬럼 + kind CHECK 'decor'
- [x] 보안 트리거: 새 3종 id + friendarch 야외 장식 가드
- [x] 셀프테스트 28종 + 운영 적용 (2026-10-08)

## 2. API (Worker)
- [x] `POST /api/referral` action=code (비익명 JWT)
- [x] action=bind (거절 사유: anonymous·not_new·self·bad_code·already_bound·cycle·inviter_full·too_many)
- [x] action=claim (활성화·멱등 지급·소식, 30초 쿨다운 throttled)
- [x] worker/index.js 라우트 등록 + 단위 테스트 11종
- [ ] 보상 소식 문구 사용자 검수 (REWARD_NOTICE)
- [ ] 실 JWT 로 배포 후 E2E (워크트리에 .dev.vars 없음)

## 3. 카탈로그·소유
- [x] catalog: tools_star · friend_wing · friend_pin (`reward:'referral'`, premium 아님) / OUTDOOR friendarch (js/data/reward-decor.js)
- [x] entitlements: decor kind → outdoorStored · 보상 토스트 REWARD_MSG · 상점 행 '🤝 초대 보상'(받은 사람만)
- [x] security-hardening 테스트: premium + reward = SQL 목록 (2165 pass)
- [ ] 새 문구 검수: 토스트·상점 태그·아이템 이름·아치 설명

## 4. 조형
- [ ] 별빛 도구 세트(전 도구) · 아치 · 날개 · 하트 핀 (게임 안 캡처 PC+모바일 컨펌)

## 5. UI
- [ ] ☰ 친구 초대 시트 (링크·공유·진행 1/3/5) — 문구 선검수
- [ ] 도착 배너 · 보상 소식

## 6. 마무리
- [ ] 트래킹 이벤트 6종
- [ ] 코드 리뷰 · 보안 리뷰
- [ ] 4곳 배포 → 플래그 ON → 다음날 BQ 재검증
