# 컨텍스트

Last Updated: 2026-11-10 13:50 KST

## 근거 데이터
- ml/reports/story_stall_20261110/result.csv: 장별 다음 장까지 걸린 시간, 멈춘 기기의 행동
- 장 도달: 337대 → 1장 326 · 2장 68 · 3장 46 · 4장 24 · 5장 21 · 6장 18 · 7장 14 · 8장 12 · 9장 5
- 광부: 만남 22 · 승강기 21 · 도둑 20 · 5층 18 · 먹보 18 · 10층 18 · 반짝이 14 · 빛 7
- sims/onboarding-cine/flow/dropout.png

## 핵심 파일
- 장 표: js/story/chapters.js(STORY, STORY_REWORLD) · 완료 규칙: js/story/rules.js(gated)
- 세계수 판: js/world/tree-board.js(TREE_DECOR, BRANCHES, removeDecor 환불), js/spaces/world-tree.js
- 안내 엔진: js/guide/guide-rules.js, js/guide/goal-guide.js (이번 작업 add369d8·321a1c2a)
- 카페: js/spaces/cafe.js(조리·서빙), js/data/catalog.js(레시피·판매가)
- 안개숲: js/spaces/mist.js · 밭 넓히기: farm-stage.js · 과수원: orchard-actions.js
- 광부: js/data/delve.js MINER_STEPS, js/spaces/delve.js, js/delve/rules.js
- 스포트라이트: js/hud/spotlight.js
- 광고 바닥: feat/admob-rewarded(21f78653) js/ads/rewarded.js · 설계 docs/superpowers/specs/2026-11-09-progress-prepass-rewarded-design.md

## 결정
- 화면: A안(대상 옆 카드). 판 안에선 카드가 다른 장식 카드를 가리지 않게 빈 공간 쪽으로 배치
- 광고 버튼: "🎬 광고 보고 🪨 3개 받기" 형식 + 반짝임 테두리
- 단계 판정은 세이브 상태 기반
- 광고는 재료 부족 줄 옆에만, 하루 전체 3회
- 안내 묶음 1 배포 → 1주 기준선 → 광고 실험(효과 분리)

## 미확인
- 8장 47시간 멈춤 원인
- 카페 주문 생성기가 신규에게 만들 수 없는 주문만 낼 수 있는지
- 장식 재사용 공식 안내의 경제 영향
