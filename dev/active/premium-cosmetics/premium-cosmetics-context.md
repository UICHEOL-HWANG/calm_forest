# premium-cosmetics — context

Last Updated: 2026-10-01

## 결정
- 기존 꾸미기 18·펫 4 = 코인 전용(price-ids 전부 null). 현금은 새 프리미엄(won)만.
- 가격대별 연출: 자국 A 스포트라이트 · 망토/날개 B · 전신 스킨 B+C. 시뮬 sims/premium-reveal-sim.html
- 현금 버튼은 storeOpen 또는 개발 세션(?dbg)에서만 — 샌드박스 토큰을 넣어도 실유저는 못 본다.
- 토스·안드로이드·itch 는 프리미엄 행 숨김(외부 결제 안내 금지). 산 건 옷장에서 전 플랫폼 장착.

## 핵심 파일
- js/cosmetics/{catalog,equip,wardrobe,trail,trail-walk}.js · 신규 trail-fx.js
- js/shop/{cash,price-ids,paddle,premium-row(신규),reveal-pose(신규),purchase-reveal(신규)}.js
- js/spaces/cafe.js(drawCosMenu·onGranted) · js/game.js(updateTrail 배선만) · index.html(#buy-reveal)
- scripts/paddle-seed.mjs · functions/api/_paddle.js(ITEMS 역조회 — 수정 불필요)

## 함정
- node 테스트는 three import 불가 → THREE 인자·순수 파일 분리·gameSource() 소스 검사
- 자국 1개 = 단일 메시, 입자는 Points 1개(드로우콜 +1)
- 브라우저 패널이 가려지면 rAF 정지 → 캡처 전 tabs_select

## 사용자 준비물(Task 10~11)
- 샌드박스 클라이언트 토큰 · 웹훅 시크릿(wrangler secret) · API 키(시드)
- 약관 법적 이름·시행일 · 환불 문구 검수 · 라이브 도메인 심사 제출

## 진행 메모 (Last Updated: 2026-10-01 저녁)
- 실행 방식: superpowers subagent-driven-development. 원장은 `.superpowers/sdd/2026-10-01-premium-trails/progress.md`(gitignore — 클라우드엔 없음 → 아래 결정 기록이 대체)
- 결정 기록(Ruling):
  - T1: paddle-seed 테스트 개수만 22→24 로 맞춤(T8 이 다시 씀)
  - T2: shopButton null 로 가게 탭이 일시적으로 깨지는 건 T6 에서 해소(해소됨)
  - T7: 기존 보트 결과 버튼 id `br-close` → `boat-result-close` (새 연출 오버레이와 중복)
  - T9: 무지개 색 간격 1/7·입자 RGBA·미리보기 밤 바닥(normal 블렌딩)·잎 비율 — 스펙 §3 의도("일곱 빛깔", "미리보기는 늘 밤") 우선
- 미뤄 둔 minor: price-ids 헤더 "22개" 문구 · paddle-seed 사용 예시 `--only straw_hat` → firefly · particle size 필드 미사용(Points 균일 크기) · premiumViewed 리셋이 closeCosPreview 에만 · 미리보기/월드 무지개 색 순서 다름
