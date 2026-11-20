# tree-finale context

Last Updated: 2026-11-20

## 문서
- 스펙: `docs/superpowers/specs/2026-11-20-tree-finale-design.md`
- 계획: `docs/superpowers/plans/2026-11-20-tree-finale.md` (사본: `tree-finale-plan.md`)
- 시안: `compare.html` (연출 A/B/C → B 선택), `title-compare.html` (칭호 자리 A/B/C → A 선택)

## 결정
- 트리거: 9장 완료. 소급은 `hintsSeen.treeFinale` 없을 때 마을 진입 시 1회.
- 연출: B 뿌리 길 따라가기 약 13초, 건너뛰기 가능, 보상은 `story.ch` 기준.
- 상시: 꽃 + 뿌리 길 + 칭호 「세계수지기」.
- 칭호 자리: A (PC 이야기 칩, 세계수 판 띠, 남의 오늘의 이웃 목록 배지).
- 문구: 자막 "이웃들이 오간 길마다 뿌리가 이어졌어요", 제목 "세계수가 다시 숨을 쉬어요", 예고 "모든 이야기를 마치면 세계수에 꽃이 피어요".
- 칭호 기준은 상수 9. STORY.length 를 쓰지 않는다.

## 핵심 파일
- `js/spaces/world-tree.js`: 조망샷 줄, `shotReady`, `treeShotBusy`, `treeShotFogPush`, `updateWorldTree`
- `js/world/tree-shot.js`: `ease`, `createShotRig` 패턴
- `index.html:5304` `setStory`: allDone 이면 칩 숨김
- `js/neighbors/rules.js` `pickerRows`, `js/neighbors/ui.js` `pickerRow`
- `game.js` `afterModals` 는 `treeShotBusy()` 를 기다린다

## 운영 DB
- `neighbors_today` 운영 본문(2026-11-20 확인)은 `migrate_neighbors_moderation.sql:71-101` 과 같다.
- 도달자: 9장 완료 11명(활동 6명).

## 의존·주의
- 운영 SQL·푸시·배포는 사용자 지시가 있을 때만.
- 옛 앱은 `title` 키를 무시하므로 SQL 을 먼저 적용해도 안전하다.
- 미커밋: 시안 파일(`compare*`, `title-compare*`, `shots/`, `verify/*mock*`).
