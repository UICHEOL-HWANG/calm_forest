# 1장 시작 연출 — 맥락

Last Updated: 2026-10-17

## 핵심 파일

| 파일 | 역할 |
|---|---|
| `index.html` endCoach | 튜토리얼 종료 지점. 후속 안내(nudgeGuideOnce·orchardQuestAfterTutorial·offerPush)를 연출 뒤로 |
| `index.html` renderCoachGoal / #coach-goal | 코치 카드 머리 줄 — 제거 |
| `js/spaces/world-tree.js` | 조망샷 줄·오버레이. kind 'chapter' 추가 |
| `js/world/tree-shot.js` | createShotRig(hold) — 그대로 사용 |
| `js/story/chapters.js` STORY_REWORLD.home | 제목·대사 출처 |
| `js/game.js` Input | queueChapterShot 노출 |

## 결정

- 건너뛰기로 끝내도 연출을 보여 준다(1장 시작은 튜토리얼 완주와 무관).
- 연출 중 HUD·칩·토스트는 숨긴다(body.cine-open).
- 조망샷은 모달·코치가 없을 때만 돈다(shotReady). 0.6초 한가하면 시작.

## 함정

- 조망샷 오버레이는 id 가 -modal 로 끝나 anyModalOpen 에 걸린다 → 걷기·다른 모달이 기다린다(의도).
- treeShotBusy 는 intro 외 kind 를 바쁨으로 본다 → 1장 완료 등 이야기 모달이 연출 뒤로 선다.
