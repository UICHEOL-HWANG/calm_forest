# neighbor-indoor — context

Last Updated: 2026-10-12 (T1~T8-1 완료, 운영 SQL·배포 대기)

## 워크트리
- `.claude/worktrees/neighbor-indoor` · 브랜치 `feat/neighbor-indoor` (main 7e62fb3 기준)
- 브라우저: 루트 `.claude/launch.json` 에 `neighbor-indoor`(워크트리 serve.py 절대경로, 포트 8061) 추가해서 띄운다

## 핵심 파일
- `js/spaces/indoor.js` buildRoom(102~) → buildRoomWith(def, ctx) 인자화 · decorMesh(id) 순수
- `js/neighbors/{sanitize,track,scene,indoor-rules(신규),indoor-scene(신규)}.js` · `js/spaces/neighbor.js` · `js/spaces/doors.js` atNeighbor 분기
- `sql/migrations/migrate_neighbors.sql`(최종본) · `migrate_neighbors_room.sql`(운영 적용분) · `sql/tests/neighbors_selftest.sql`
- `js/house-floors.js` floorsFor/floorAt/normalizeFloor/gardenDoorLocal (순수) · `js/house/surface.js` planSeats (순수)

## 의사결정
- 새 파일(room-build.js) 대신 indoor.js 안에서 인자화 — 순환 import·변경 범위 최소
- 이웃 실내 플래그는 atNeighbor 유지 + 모듈 안 visit.indoor (전역 indoor/houseFloor 오염 금지)
- 집주인 x+1.5 비킴(문 프롬프트·말풍선 겹침) · HUD "내 마을로" 실내에서도 동작
- 옛 클라는 room 무시 → 4곳 동시 배포 불필요

## 함정
- Node 테스트엔 three 없음 → 방 짓기 동치는 브라우저 스냅숏(room-baseline.json)
- preview 는 루트를 띄운다 → 워크트리 serve.py 절대경로 필수
- migrate_neighbors_moderation.sql 재실행 시 showcase 에서 room 빠짐 → room 파일 다시
- 셀프테스트 keys 배열에 'room' 추가 필요
