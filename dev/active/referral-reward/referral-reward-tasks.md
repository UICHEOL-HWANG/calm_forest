# 🤝 친구 추천 보상 — 체크리스트

## 0. 설계
- [x] 보상 방향·단계 확정 (물뿌리개 1 / 아치 3 / 날개 5)
- [x] 시안 3종 (`mockup.html`)
- [x] 브랜치 격리 (feat/referral-reward 워크트리)
- [x] 별 테마 = 도구 세트 전체 · 활성화 원천 session_logs 수용 (2026-10-08)

## 1. DB
- [ ] `migrate_referrals.sql`: referral_codes · referrals · RLS
- [ ] purchases.source 컬럼 + kind CHECK 'decor'
- [ ] 보안 트리거: 새 3종 id + friendarch 야외 장식 가드
- [ ] 셀프테스트 스크립트 + 풀러 적용

## 2. API (Worker)
- [ ] `/api/referral/code` (GET/POST, 비익명 JWT)
- [ ] `/api/referral/bind` (검증 5종)
- [ ] `/api/referral/claim` (활성화 판정·멱등 지급·소식)
- [ ] worker/index.js 라우트 등록 + 테스트

## 3. 카탈로그·소유
- [ ] catalog: tools_star · friend_wing · friend_pin (비매 플래그) / OUTDOOR friendarch hidden
- [ ] entitlements: decor kind → outdoorStored
- [ ] security-hardening 테스트 목록 일치

## 4. 조형
- [ ] 별빛 도구 세트(전 도구) · 아치 · 날개 · 하트 핀 (게임 안 캡처 PC+모바일 컨펌)

## 5. UI
- [ ] ☰ 친구 초대 시트 (링크·공유·진행 1/3/5) — 문구 선검수
- [ ] 도착 배너 · 보상 소식

## 6. 마무리
- [ ] 트래킹 이벤트 6종
- [ ] 코드 리뷰 · 보안 리뷰
- [ ] 4곳 배포 → 플래그 ON → 다음날 BQ 재검증
