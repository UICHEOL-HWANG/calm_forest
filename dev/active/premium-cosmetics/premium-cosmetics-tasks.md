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
- [x] T9 화면 검증 (a440c7f, d01a418, bd4f46f)
  - 98616f5 리뷰 ✓ — 수정 1: 미리보기 무지개 반짝이 색이 자국보다 한 칸 밀림(첫 자국 n=1 인데 내부 카운터 0) → onStamp `step` 옵션
  - 캡처(PC 1280·375px × 밤 0.92/낮 0.5): 가게 미리보기 · 월드 · 연출 A ✓
    - 연출 A 빛줄기가 진열물 root 에 달려 회전 따라 중심이 맴돌고 캔버스 네모에서 잘림 → scene 직속 + 캔버스 radial mask
    - 375px 미리보기 밤 바닥 원판이 아래 1/3 을 못 덮음 → 반지름 1.1→2.4
  - 드로우콜(헤드리스 480×360, Points 끄고 켠 같은 프레임 비교): 반딧불 +1 · 무지개 +1 · 입자 0개면 drawRange 0 → 0 ✓
  - 토스·안드로이드·itch hidden 분기 ✓(빌드 플래그 → platform.js → premiumRowMode 'hidden')
  - 브랜치 전체 리뷰 → d01a418: 상점 닫힘이면 게스트도 unavailable · 연출은 가게 열렸을 때만 · 연출 시작 중 예외 시 오버레이 정리 · 연출 반짝이 색 · 캐릭터 미리보기 무지개 색 · 자국 풀 dispose
  - **남긴 것(사용자 판단)**: ① 개발 세션 게이트가 공개 URL 파라미터(?weather= 등)라 T10 동안 누구나 샌드박스 결제로 실제 purchases 행을 만들 수 있다 → 허용 목록(userId) 게이트 또는 라이브 전 샌드박스 행 삭제 단계 ② checkout.completed 때 Paddle 성공 화면이 떠 있어 연출 A 가 그 아래서 재생될 수 있다 → T10 실결제에서 확인, 필요하면 Checkout.close() ③ build-web `/shop` 행이 coins null 에서 터진다 → T11 Step 2 에서 프리미엄만으로 재작성(계획에 있음)
  - 관찰: 월드 반딧불은 작고 은은하다(size 0.22) — 의도 범위인지 실기기에서 판단
- [ ] T10 샌드박스 결제 실검증(사용자 준비물: 클라이언트 토큰·웹훅 시크릿·API 키)
- [ ] T11 상점 열기·4곳 배포·라이브 심사
  - ⚠️ 라이브 priceId 로 바꾸기 **전에** 샌드박스 구매 행 삭제: `delete from purchases where price_id in (<샌드박스 firefly·rainbow pri_ id>)` — T10 테스트 결제(그리고 공개 dev 파라미터로 누가 했을지 모를 결제)가 라이브에서 영구 지급되지 않게
  - build-web `/shop` 프리미엄 전용 재작성(Step 2) 전엔 storeOpen=true 로 빌드하지 말 것(coins null 에서 터짐)
- [ ] 문구 검수(스펙 §8) — 사용자 답 대기
- [~] 2단계 — 아래 섹션(사용자가 2026-10-01 1단계 T10·T11 보다 먼저 착수 지시)

## 검증 요령(로컬)
- 워크트리에서 `python3 scripts/serve.py 8021` → `http://localhost:8021/?dbg&time=0.92&weather=clear` (time=밤 고정)
- 게스트 → 캐릭터 선택 → 프롤로그 건너뛰기 → `tut-skip`
- 콘솔: `const gs=__gs(); gs.cosmetics={owned:[...gs.cosmetics.owned,'firefly','rainbow'],equipped:{...gs.cosmetics.equipped,trail:'firefly'}}`
- 가게 열기: `const g=await import('/js/game.js'); cos-menu.classList.add('show'); g.Input.openCosMenu(document.getElementById('cos-preview'))` → 이펙트 탭
- ⚠️ 합성 키 이벤트로는 플레이어 이동이 잘 안 됨(월드 자국 캡처는 실제 입력/조이스틱 필요)
- ⚠️ 브라우저 패널이 가려지면 rAF 정지 → tabs_select 후 캡처

---

# 2단계 — 🧥 전신 스킨 (브랜치 `feat/premium-skins`, 워크트리 .claude/worktrees/premium-skins)

스펙 docs/superpowers/specs/2026-10-01-premium-skins-design.md · 계획 docs/superpowers/plans/2026-10-01-premium-skins.md
결정: 덧입히기(A) · 다른 꾸미기와 같이 입음 · 정령 자취는 자국 칸 비었을 때만(A) · 🌿 S3 반딧불 정령 ₩10,000 · 🧸 P1 솔기·단추 눈 ₩9,000 · B+C 상자 폭발

- [x] T1 카탈로그 skin 칸 + 2상품 (60ff461)
- [x] T2 skin-rules(effectiveTrail·squashOf) (2ccdfc2)
- [x] T3 부위 표식(pupil·highlight·head·skull·body·belly) + kk.id (5b9187a)
- [x] T4 sprout 자국 + mergeGeos export (4e8ba90)
- [x] T5 skin.js(applySkin·disposeSkin) (f02ace4)
- [x] T6 게임 배선 (d6f1f39)
- [x] T7 가게·옷장 스킨 탭 + i18n (46d41f1, f867959 탭 6개 글자 쪼개짐 수정)
- [x] T8 연출 B+C (c0f81c1, 11eec56 재질 공유 지오메트리 정리·발 원점 오프셋)
- [~] T9 화면 검증·드로우콜·리뷰 — 2991e82 인형 배 패치가 곰·판다·강아지·병아리 몸속에 묻히던 것 수정 · 최종 리뷰 진행
  - 드로우콜(캐릭터 1마리): 없음 24 · 정령 +4 · 인형 ±0(구운 6 − 숨긴 눈 6)
  - 화면: 7종×2스킨 낮 · 정령+모자+망토 밤 · 가게 스킨 탭 PC 한 줄/375px 두 줄 · 연출 B+C 0.97/1.5/2.0/2.9s · A 연출 회귀 없음
  - **판단 대기(사용자)**: 정령 새싹이 모자를 뚫고 솟는다(그대로 vs 모자 쓰면 새싹 숨김)
- [ ] 결제 실검증·시드(1단계 T10 과 같이) — 스킨 priceId 2개는 paddle-seed 가 premium 을 자동 등록
