# mine-root context

Last Updated: 2026-11-18 (구현·리뷰 반영 완료, 병합 대기)

- 브랜치 feat/mine-root, 워크트리 .claude/worktrees/mine-root (main 90a77e3b 에서 분기)
- 결정: 벽화 M1 갱목 3컷, 바닥은 C 시안(육각 돌 고리+굵은 뿌리), 등불 기둥 하나 유지
- 결정: 20층 첫 도착 즉시 자동 연출(만지기 없음), 탭으로 건너뛰기, 기록 hintsSeen.mineRootLit
- 결정: 대사 A안(스펙 표), 이벤트 delve_root_cine {skipped, sec}
- 핵심 파일: js/delve/rules.js(layoutFloor), js/spaces/delve.js(enterFloor/clearRoom), js/data/delve.js(MINER_STEPS), js/world/region-cine.js(리그 패턴), js/spaces/world-tree.js(오버레이 패턴)
- 목업: 루트 체크아웃 sims/mine-root/(murals.js, props.js, capture.mjs), 미커밋
- 주의: floor 10/19 배치 지문 유지, game.js 수정 금지, 새 광원은 등불 하나
- 캡처 함정: 새 게스트로 찍으면 온보딩 투어 끝에 "나의 이야기" 창이 뜬다(showStoryMapOnce). 이번 변경과 무관.
- 헤드리스는 프레임이 느려 연출이 실제보다 길게 찍힌다(dt 0.05 상한).
- HUD 숨김은 기존 body.cine-open 사용.
