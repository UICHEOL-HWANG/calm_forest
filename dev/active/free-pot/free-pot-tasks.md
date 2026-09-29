# 🍲 자유 냄비 — Tasks

상세는 `free-pot-plan.md`. ⏸️ = 사용자 승인 게이트.

- [ ] 0. 선행: `feat/orchard-look` 미커밋 작업 정리 → `feat/free-pot` 브랜치
- [ ] 1. 규칙 모듈 `js/free-pot/rules.js` + 테스트 (TDD)
- [ ] 2. 생성기·검수 도구 `tools/free-pot/{generate,review}.mjs` + 테스트
- [ ] 3. ⏸️ 표 생성(KST 17~20시) → 무결성·분포 테스트 → review.html 사용자 검수
- [ ] 4. 게임 배선: `dish.js`, `dishOf`, `kitchenStart/Finish`, 찬장, 트래킹(`taste`·`is_new`)
- [ ] 5. ⏸️ UI 문구 후보 검수 → 🍲 탭·결과 카드 → 브라우저 검증(PC·모바일·영어)
- [ ] 6. 코드 리뷰·전체 테스트·GA4 파라미터 → 배포는 사용자 결정

## 같이 하기로 한 것(별도 계획)
- 🧰 보물상자 — 배 이동 중 떠내려오는 상자, 확률표·하루 상한
- 🦆 사공 오리 퀴즈 — 게임 세계 문제(도감·주민·지명), 문제 풀은 Supabase

## 보류
- 카페 취향 주문(손님 4자리 중 1자리) — 표의 `tags` 사용
