# 세계수 꽃피우기 — 체크리스트

- [x] 수치 시뮬레이션 (sims/tree-bloom-sim.py)
- [x] dev docs
- [x] tests/tree-bloom.test.mjs 먼저 작성(실패 확인)
- [x] js/world/tree-bloom.js: 표(단계·돌보기·손님·꽃 장식), restore, offerStage, careToday, guestFor, observeGuest, bloomRows, growthOf, lifeOf
- [x] game.js: treeBloom 기본값·복원
- [x] world-tree.js: 뷰·액션·이벤트·보상·GA4(tree_care, tree_stage_offer, tree_guest, tree_bloom)
- [x] 꽃 장식 4종(tree-board.js TREE_DECOR, bloom 필드) · 꽃피기 전엔 목록에서 숨김
- [x] tree-board-ui.js: 꽃피우기 섹션 + CSS
- [x] 브라우저 검증(PC·375px): 돌보기·살펴보기·단계 바치기·저장 왕복
- [x] 코드 리뷰 반영(M2 조망샷 꽃 상태 붙잡기, L1 표시 손님 일치, L3 GA4 0/1)
- [x] UI 문구 검수(권장안 3곳 반영) · 영어 번역 · 밤=Chestnut 충돌 피해 ☀️🌙 아이콘
- [x] 밸런스 재조정(숯·벽돌 17, 보석 1, 보상 상향) · 보통 유저 16일
- [x] 커밋

## 리뷰 메모

- M1(해금 켠 새 세이브에서 이미 가지를 끝낸 경우 나무가 덜 핀 모습으로 돌아감): 지금 UNLOCKS 가 라이브에서 꺼져 있어 실유저 영향 없음. 켜기 전 배포라면 무시 가능.
