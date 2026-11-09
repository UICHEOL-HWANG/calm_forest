# 계획 (승인 전 초안)

1. 시안 3개를 실제 게임 화면 위에 렌더해 PC·모바일로 비교, 문구 후보 표와 함께 승인받는다.
2. `js/guide/next-goal.js`(목적지 표·전환 판정), `js/guide/goal-cine.js`(카메라 리그, tree-shot·region-cine 재사용), `js/guide/goal-arrow.js`(화면 안/밖 화살표·경유점) 신설.
3. 튜토리얼 renderCoach 단계 전환 때 next-goal 이 목적지를 정하고 시네마틱 → 화살표.
4. ③ 상인: 도착 실패 수정, sell 완료 조건을 실제 판매로.
5. ④⑤ 순서: 시안 비교 후 결정. tests/house-cost.test.mjs 가 잠근 조건과 함께 갱신.
6. 물→밭: 물 서식지 조망샷 뒤 세계수 밭 가지 시네마틱 → 세계수 화살표, openWorldTree 가 새로 열린 가지 탭 우선, tree_tab 이벤트, 밭 탭 추천 조합 + 칸 꽉 참 안내.
7. guide_step {flow, step, act} 이벤트.
8. 화살표 추종 봇으로 완주 검증, npm test.
