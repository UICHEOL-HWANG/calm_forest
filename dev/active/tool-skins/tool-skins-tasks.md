# tool-skins — tasks (Last Updated: 2026-10-02)
- [x] 1 순수 규칙 + 테스트 (tests/tool-skins.test.mjs, 기존 개수 테스트 갱신)
- [x] 2 조형 모듈 이식(27 도구 + 우산 3) + bake — sims/tool-skins-bake-check.html 로 확인, 최대 5콜
- [x] 3 게임 배선(손 도구·우산·밤 발광) — 커밋 4247fcc
- [x] 4 가게·옷장·미리보기·구매 연출
- [x] 5 검증: npm test ✅ 1612 · 코드리뷰 APPROVE(4건 반영 69dd898) · 게임 안(사용자 게스트 로그인, ?weather=rain): 🌙·🍄 손 도구·우산 확인, 우산 +6콜(그림자 포함)·도구 2메시
  - ⚠️ 우산을 머리 바로 위로 세우면 41° 카메라에서 얼굴을 통째로 가림 → 등 쪽 0.3rad·크기 1.0(0.75=숨음, 0.45=반 가림)
  - 확인용 장착은 되돌림(게스트 세이브에 tools_* 없음 확인)
- [ ] 6 Paddle priceId(사용자 라이브 키) → 배포 4곳
