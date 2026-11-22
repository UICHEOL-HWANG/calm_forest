# 반딧불이 계곡 디벨롭 · context

Last Updated: 2026-11-22 (구현 완료, 로컬 커밋, 미병합)

## 상태
구현 완료(계획서 태스크 0~9). feat/glade-develop 에 로컬 커밋만, 푸시·병합·배포 안 함.

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

## 구현 기록 (2026-11-22)
- 드로우콜(태스크 7): 줄등 메시 8개(기둥 2·줄 1·병 3·불빛 2). 같은 화면에서 줄등만 켜고 끈 차이 7~10회/프레임(PC 1280×720, 20프레임 평균 3회). 기준 12 이하. 전체 평균은 720~760으로 흔들려 단순 비교는 쓸 수 없다
- 이벤트 분류표 `docs/analysis/event-taxonomy.csv` 에 `glade_string` 행 추가, `firefly_catch` custom_keys 에 `mode` 추가(분류표 테스트가 요구)
- 캡처 도구 `verify/impl-shots.mjs` 는 돌아온 플레이어 흉내(tutorialSeen=true, 첫 안내·팁 건너뛰기, 모달 닫기)를 넣는다. 새 게스트는 첫 안내 중이라 계곡 배너가 일부러 미뤄진다
- 코드 리뷰(code-reviewer): CRITICAL·HIGH 없음. 반영: 일반 반디가 더 가까우면 일반 포획 우선, 무리 개체 dispose, 무리 첫 안내는 무리가 있을 때만(live), 첫 포획 연출을 무리 경로에도. 남긴 것: firefly_catch 는 큰 반디 한 번에 1건(마릿수는 firefly_swarm.caught 와 합쳐 볼 것), 밤 종류는 낮이 와야 다시 뽑음(밤 중 자정을 넘겨도 같은 밤 유지, 의도), 줄등이 걸린 나무를 베면 재생 30초 동안 줄이 허공에 뜸, 매 프레임 작은 객체 생성
- 확인한 것: npm test 6674 통과, build-web 성공, i18n_check glade 7/7, 밤 3종·줄등 0/60/240·낮·무리 PC·폰 캡처, 영어 배너, 새 게스트(계곡 키 없음) 3마리 → 첫 칸 yyyb·예외 0, CDP 로 무리 잡기(차례 8마리·순서 틀림 6마리·꼬마 남았을 때 큰 반디 안 잡힘)
- 확인 못 한 것: 실기기, 소리, 프레임 수치(fps), 새로 고침 뒤 유지(이 환경은 Supabase 차단이라 게스트 세이브 자체가 남지 않음), 사람 손으로 무리 박자감
- 기존 문제(범위 밖): 상단 힌트 배너 자리가 길 안내 나침반(41m)과 PC·폰 모두 겹침
