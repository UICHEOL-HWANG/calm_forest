# premium-cosmetics — tasks (1단계)

브랜치: `feat/premium-trails` (base main ba31c3f) · 계획: docs/superpowers/plans/2026-10-01-premium-trails.md

- [x] T1 현금 전용 가격 모양 (4f750ba)
- [x] T2 가게 판정 · premiumRowMode · cashAvailable 게이트(storeOpen || 개발 세션) (d72440f)
- [x] T3 자국 조형 firefly·rainbow·tintTrailMark (9aea3cf, 142a102)
- [x] T4 trail-fx.js (adf3d44)
- [x] T5 게임·미리보기 배선 (782402b, aa1ed41)
- [x] T6 가게 프리미엄 행 (268807c)
- [x] T7 획득 연출 A + #buy-reveal (7caa03f, acb8ae2) — 보트 결과 버튼 id br-close → boat-result-close 로 변경(중복 id)
- [x] T8 시드 스크립트 프리미엄만 (207fbce)
- [~] T9 화면 검증 — 진행 중
  - 확인됨: 밤에 월드 반딧불 떠오름 ✓ · 가게 이펙트 탭 💎 행 2개 + 구매 완료 ✓
  - 발견→수정 커밋 98616f5(**리뷰 미실시**): 반딧불 잎이 바늘(petalOf wide 는 비율인데 s*0.55 넣음) · 무지개 색 간격 0.09→1/7 · 입자 RGBA · 미리보기 밤 바닥 원판+normal 블렌딩
  - 남은 것: ① 98616f5 리뷰 ② 미리보기·월드 재캡처(PC+375px, 밤/낮) ③ 무지개 월드 캡처 ④ 드로우콜 측정(__perf / renderer.info, 착용 시 +1) ⑤ 연출 A 단독 캡처(`import('/js/shop/purchase-reveal.js').then(m=>m.playPurchaseReveal({itemId:'firefly'}))`) ⑥ 토스 빌드에 hidden 분기 확인 ⑦ 브랜치 전체 최종 코드 리뷰
- [ ] T10 샌드박스 결제 실검증(사용자 준비물: 클라이언트 토큰·웹훅 시크릿·API 키)
- [ ] T11 상점 열기·4곳 배포·라이브 심사
- [ ] 문구 검수(스펙 §8) — 사용자 답 대기

## 검증 요령(로컬)
- 워크트리에서 `python3 scripts/serve.py 8021` → `http://localhost:8021/?dbg&time=0.92&weather=clear` (time=밤 고정)
- 게스트 → 캐릭터 선택 → 프롤로그 건너뛰기 → `tut-skip`
- 콘솔: `const gs=__gs(); gs.cosmetics={owned:[...gs.cosmetics.owned,'firefly','rainbow'],equipped:{...gs.cosmetics.equipped,trail:'firefly'}}`
- 가게 열기: `const g=await import('/js/game.js'); cos-menu.classList.add('show'); g.Input.openCosMenu(document.getElementById('cos-preview'))` → 이펙트 탭
- ⚠️ 합성 키 이벤트로는 플레이어 이동이 잘 안 됨(월드 자국 캡처는 실제 입력/조이스틱 필요)
- ⚠️ 브라우저 패널이 가려지면 rAF 정지 → tabs_select 후 캡처
