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
- [x] 시안 3안×4 → 선택(도구 B·날개 A·핀 B·아치 B) → 게임 이식 8f9842d (tool-skins-crystal.js · art-friend.js · friend-arch-art.js) · 게임 안 PC/모바일 낮/밤 캡처
- [ ] 사용자 게임 화면 컨펌 · 미검증: 비 오는 날 크리스탈 우산 · 곰/고양이/토끼 착용 · 날개 퍼덕임 없음(꾸미기 애니 경로 없음)

## 5. UI
- [x] ☰ 친구 초대 시트 (링크·공유·진행 1/3/5) — 문구 추천안 A 확정 · js/referral/{rules,flow,ui,index}.js · PC·모바일 캡처 확인
- [x] 로그인 화면 도착 배너 · 연결 결과 토스트 · 보상 소식(서버 notices)
- [x] CONFIG.REFERRAL_ON=false (4곳 배포 후 켬) · dev 세션은 서버 안 부름

## 5-1. 사고
- [x] cafe.js 한 줄 if 주석이 본문을 삼켜 게임 부팅 불가 → 6a5864b 수정 + tests/js-syntax.test.mjs(js/ 전체 파싱 가드)

## 6. 마무리
- [ ] 트래킹 최종 정리(사용자 지시: 다 만들면 파라미터 정리) — 현재 5종: invite_land{} · invite_sheet_open{guest,active} · invite_share{channel} · referral_bind{result} · referral_reward_grant{item_id,tier}
- [ ] 코드 리뷰 · 보안 리뷰
- [ ] 4곳 배포 → 플래그 ON → 다음날 BQ 재검증
