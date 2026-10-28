# Context — sea-feel
Last Updated: 2026-10-15 (게임 이식 착수, 워크트리 .claude/worktrees/sea-feel · feat/sea-feel ← origin/main 1228f1cf)

- 게임 코드: js/spaces/sea.js (상태머신 idle/cast/fight/catch/miss, seaMG), 어종 수치 js/data/places.js SEA_SPECIES
- 원 프로토타입: sims/sea-sim.html (건드리지 않음, 장면 코드 복사)
- 이식 시 주의: GA4 sea_catch good/bad·난이도 probe(rollDifficulty ease) 지표 정의가 B·C 에서 바뀐다
- 스윙 모션 변경 금지(memory no-swing-motion-change)
- 시안 비교는 3개 이상 PC+모바일 나란히(memory design-compare-before-ship)
- 시뮬 원본 포즈 문제: 로드가 어깨 뒤로 눕고 줄이 머리를 관통 → 새 포즈는 로드 방향을 월드 기준(물고기/찌 yaw + 앙각)으로 강제
- 디버그 파라미터: ?pose=0~3 &cam=side &freeze=초(던지기 정지) &seed= &auto=1 &embed=1
- 줄: 18점 verlet 로프(늘어남만 구속, 물 위 y≥0.03), 찌 비행 FLIGHT 0.85s·중력 14
- 게임 프리뷰: launch.json 'sea-feel'(8815) · ?dbg=1&sea=1&seadebug=1&weather=clear · 게스트→곰→건너뛰기 자동화는 이 세션 JS 참고(__sea.action/__sea.mg)
- PC 는 #action-btn 이 #mobile-controls 안이라 안 보인다 → #sea-btn 은 최상위 + controls.js setupSeaButton 을 터치 분기 앞에서 호출
