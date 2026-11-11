# 북쪽 물가 넓히기 — 맥락

Last Updated: 2026-11-10 (계획 확정, 구현 전)

## 결정
- 안 3 확정(사용자 "안 3이 나을거 같은디"). 안 1 북동 곶·안 2 북쪽 바닷가는 기각.
- 지도는 손으로 찍은 원(WM_LAND) 대신 걷기 한계 + 실제 물 상수에서 그린다.

## 코드 접점
- 걷기 한계: js/game.js `const maxR = 42` (updatePlayer 마을 else 분기)
- 지도: index.html `MAP_VIEW`·`WM_LAND`·`WM_WATER`·`WM_GROVE`·`paintIsland` (전체 지도 drawWorldMap, 미니맵 setMinimap 이 공유)
- 바다터: js/data/places.js SEA_GATE·SEA_COVE(상대)·HOMI_STALL(절대), js/spaces/sea.js spawnSeaGate(게이트 상대 배치), js/spaces/doors.js 프롬프트
- 경매 무대: js/data/auction.js AUCTION_STAGE
- 광장 깃대 PLAZA_POLE (23,-8.2) js/data/plaza.js — 호미 가게 이동의 제약
- 3D 땅: buildWorld CircleGeometry(60), 그 바깥은 하늘색

## 지도 어긋남(현재, 확장과 별개)
- 후미가 풀밭에 둘러싸인 만인데 지도에선 섬 바깥의 열린 바다
- 남동·서쪽 걸을 수 있는 풀밭이 지도에선 바다
- 박물관 개울 고리 없음

## 캡처
- 위에서 본 렌더: sims/north-expand/top.jpg (스크립트 scratchpad/topdown.mjs: 헤드리스 부팅 후 직교 카메라로 __scene 렌더)
- 지금 지도: sims/north-expand/map-now.png
