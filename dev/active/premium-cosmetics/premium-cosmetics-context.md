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
