# 세계수 꽃피우기 — 맥락

Last Updated: 2026-10-17 16:10

## 위치

- 워크트리 `.claude/worktrees/keller-unlocks`, 브랜치 `fix/keller-owl-defer` (원격 `claude/intelligent-keller-hfl7kk` 위 로컬 커밋 2개, 미푸시)
- 미리보기: launch.json `keller-unlocks` (포트 8819), `?unlocks=on` 으로 새 세이브 검증

## 핵심 파일

| 파일 | 역할 |
|---|---|
| `js/world/tree-board.js` | 기존 판 규칙(빈터·꾸러미). 해금 플래그 habitat/bundles 의 단일 출처. **건드리지 않는다** |
| `js/world/tree-bloom.js` (새) | 꽃피우기 순수 규칙: 단계 꾸러미·돌보기·손님·꽃핌·저장 복원 |
| `js/spaces/world-tree.js` | 게임 상태와 판 화면을 잇는 층. 뷰·액션·이벤트 추가 |
| `js/world/tree-board-ui.js` | 판 DOM. 꽃피우기 섹션 추가 |
| `js/habitat.js` | `meets`·`whenOk` 재사용(손님 판정) |
| `js/game.js` | `gameState.treeBloom` 기본값·복원(2841 부근), `habitatCtx` 로 낮밤 |
| `sims/tree-bloom-sim.py` | 수치 시뮬레이션 |

## 결정

- 꽃피우기 상태는 `gameState.treeBloom` 에 따로 둔다. `restoreTree`·`cloneTree` 가 모르는 필드를 버려서 tree 안에 넣으면 지워진다.
- 해금은 기존 habitat/bundles 플래그만 본다. 꽃피우기는 해금을 막지 않는다.
- 돌보기는 연속일이 아니라 누적 7일(코지 문법, 결석해도 리셋 없음).
- 손님은 낮·밤 슬롯마다 1번. 슬롯 키 = `날짜:day|night`. 어떤 손님이 오는지는 그 순간 빈터 태그로 정하고 시드로 고른다(장식을 바꾸면 다른 손님이 올 수 있음 = 수집 고리).
- 꽃핌 보상 = 그 가지 전용 장식 해금 + 보석 1. 코인은 새로 주지 않는다.
- 나무 모습: 기존 bloom(꽃)은 꽃피우기 완료로 옮기고, 기존 꾸러미 완료 문구는 "잎이 무성해졌어요"로 바꾼다.
- 해금 꺼짐·레거시: 나무는 늘 다 살아 있음(기존). 판의 꽃피우기는 선택 콘텐츠로 똑같이 동작.

## 의존·주의

- 사용자 규칙: 새 코드에 주석 금지, 문구에 엠대시 금지, 새 UI 문구는 검수 먼저, 월드 말풍선은 이모지만.
- `feat/mobile-hud-wheel` 와 index.html 이 겹칠 수 있음(판 CSS 추가 시 최소로).
