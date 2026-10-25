# sled-v2 context

Last Updated: 2026-10-25 09:10

## 작업 위치
- 워크트리 `.claude/worktrees/sled-develop`, 브랜치 `feat/sled-v2` (origin/main 97b2541e 기준)
- 미리보기: 루트 `.claude/launch.json` 의 `sled-develop` (포트 8823)
- 헤드리스 캡처: `tools/store-shots/cdp.mjs` (rAF 정지 함정 → 페이지에 `tick(ms)` 훅을 두고 수동 진행)

## 핵심 파일
- 물리: `js/mountain/sled.js` (PHYS, PHYS_V=3, stepSled, slide, tryBoost, collide, crossFlags)
- 코스: `js/mountain/course.js` (COURSE_V=1, 길이 330·폭 14, 깃발 12·장애물 11, minTimeMs=길이/24)
- 지형: `js/mountain/terrain.js` (slopePoint, SLOPE_M_PER_UNIT=70/330). 지금은 수직 운동이 없다.
- 시점: `js/mountain/sled-view.js` (SLED_CAM up 9·back 10·lookAhead 22, sledPose)
- 런타임: `js/spaces/mountain.js` (startSled, updateMountain, sledCamera, boost, courseFor는 장애물 r만 스케일)
- HUD: `js/mountain/sled-hud.js` (showBoostFx, showStick), 속도선 `js/mountain/boost-lines.js`
- 장애물 그리기: `js/mountain/interior-art.js:172` 병합 메시 + poseObstacles(CPU 정점 재작성 → 움직이는 장애물엔 부적합)
- 저장: `js/mountain/save.js` restoreMountain(best·plays·daily·perfect·hut만 보존). 세이브 상한 512KiB.
- 펫: gameState.pets / gameState.pet, `js/pet/render.js` spawnPet, `js/pet/art.js` buildPet (game.js 미의존)
- 시뮬: `tools/sim/sled-sim.mjs` (perfectLine: 다음 관문 2개 계획형 봇)
- 기록: `js/mountain/sled-run.js` → sled_runs (`sql/migrations/migrate_sled_runs.sql`), 리더보드 `migrate_leaderboard_sled.sql`·`migrate_sled_lineup.sql`

## 결정
- 2026-10-25 사용자: A 유령·B 깃발 콤보·C 펫 동승 모두 적용 + 속도·카메라, 드리프트, 점프·트릭, 움직이는 장애물 모두. 시안으로 조합·수치 확정 후 구현.
- 부스터 세기(1.5배·2초)는 그동안 공정성·리더보드 때문에 고정. v2는 새 시즌이라 재설계 허용, 대신 시뮬 재검증 필수.

- 2026-10-25 사용자 확정: 시안 ④ 전부·속도 1.5배, 펫 자리 = 썰매 뒤끝(카메라 쪽).
- 코스 길이는 330 유지(경사면이 70m 고정이라 늘리면 칸당 화면 거리가 줄어 더 느려 보임) → 한 판 약 24초.
- 조향 속도도 속도와 같은 1.5배(코스 모양 유지, 반응 시간만 짧아짐). 라인업 썰매의 속도·조향 덮어쓰기 값도 1.5배.

- 2026-10-25 사용자: 방패 1회는 펫 없어도 모두에게(SHIELD_PER_RUN), 펫은 타기만. 칩 '🛡️ 펫 방패' → '🛡️ 방패'. 칩 문구·안내서 24장 후보 승인.

## 의존·위험
- DB CHECK `phys_v in (1,2)`·`course_v = 1`·서버 최소 시간 13750ms(course_v 1 전용) → v2 배포 전 마이그레이션 필수(조사 세션과 조율).
- 테스트 다수가 PHYS·COURSE 수치를 고정 → 의도된 갱신.
- 모바일 성능: 움직이는 장애물·입자·펫 추가로 드로우콜 증가 → 측정 필수.
