# 반딧불이 계곡 디벨롭 · context

Last Updated: 2026-11-22

## 상태
방향 시안 단계. 설계 문서·계획서는 방향 확정 뒤에 쓴다. 게임 코드 변경 없음.

- 브랜치 `feat/glade-develop` (워크트리 `.claude/worktrees/glade-develop`, main 8d9ab6de 기준)
- 시안 `sims/glade-develop-directions.html`, 캡처 `sims/glade-develop/`

## 지금 계곡 (main 코드 확인 2026-11-22)
- `js/spaces/glade.js` 194줄: 밤에만 5~7마리(`GLADE_MAX`), 밝을 때(bright>0.6) 휘두르면 0.9, 아니면 0.35, `netBonus` 가산
- 종류 8종 `js/data/places.js` `BUG_KINDS`: 노랑·푸른·초록, 무지개(비·안개 밤), 계절 한정 4종. 게이트 `js/dex-gates.js`
- 쓰임: 촘촘한 포충망(bug 2), 반딧불 등 선물(bug 2), 판매 14, 의뢰 catch 4종, 도감 bug, 배지 night_owl(기본 4종)
- 이벤트: `firefly_swing`, `firefly_swing_empty`, `firefly_catch`

## 빈 곳
1. 종류당 한 번 잡으면 목표가 끝난다
2. 날씨·계절 말고는 밤마다 같다
3. 많이 잡아도 계곡이 변하지 않는다
4. 조작이 한 마리씩 휘두르기 하나다

## 후보 (사용자 확정 전)
- A 오늘 밤의 빛: 날짜 시드로 그 밤의 계곡 상태 하나
- B 등 걸이: 누적 포획으로 계곡에 등이 늘어남
- C 무리 잡기: 무리를 차례대로 연달아 잡기
- D 관찰 수첩: 조건별 한 줄 메모, 문구는 Claude 로 미리 생성해 `js/lines/` 풀 구조에 넣음

## 근거와 한계
- 9/18~10/17 표(`ml/reports/minigame_play_rate.csv`): 반딧불 6명·501회·사람당 3.0일. 표본이 작다
- 광고 진행 중이라 새 집계는 광고 종료 뒤로 미룸(2026-11-22 사용자)
- 로그인 화면·이름 화면·첫 안내는 E5·E7 판정 전까지 건드리지 않는다

## 따로 가는 일
- 맞춤 가구(빛 공방 구조를 가구로): 계곡 다음에 시험 제작부터. Anthropic 키는 키체인 `calmforest-anthropic-aura`
