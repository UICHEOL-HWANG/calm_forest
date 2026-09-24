# 📦 game.js 분리 — 핵심 파일·결정·함정

**Last Updated** 2026-09-24

## 결과
- game.js 16,664 → 15,833줄, 순수 선언 169개 → `js/data/{tools,world,catalog,places,npcs,dex,character}.js`
- 브랜치 `refactor/gamejs-data` (워크트리 `../calm_forest-split`) — 4b41cd1 · db45f46 · 452194d

## 도구 (`tools/refactor/`)
| 파일 | 역할 |
|---|---|
| `lib/analyze.mjs` | 옮겨도 되는 선언 판정 — Babel `referencePaths`/`constantViolations` 역추적 |
| `move-decls.mjs` | 원문 그대로 이동 + game.js import 생성. 자리 배정은 `PLACE` 표 |
| `verify-move.mjs <기준>` | 순수 이동 증명 a~h |
| `smoke.mjs <라벨> <서버포트> <CDP포트>` | 헤드리스 12공간 순회 지문(고정 시드) |
| `smoke-diff.mjs <기준1> <기준2> <후보>` | 기준 2회 흔들림을 잡음으로 빼고 비교 |

## 결정
- export 된 선언(ANIMALS)은 안 옮김 — `sims/bear-export.html` 이 game.js 에서 import, 테스트가 `^export const ANIMALS` 를 찾음
- `clock`·`keys` 는 런타임 객체라 제외
- 테스트는 읽는 대상만 넓힘(`tests/helpers/game-source.mjs`) — 단언 변경 0

## 함정 (겪은 것)
- ⚠️ 첫 분석기는 `ReferencedIdentifier` 만 봐서 **대입 왼쪽을 못 셌다** → `markHabitatDirty`(let 에 대입)가 "이동 가능"으로 오판. `constantViolations` 로 고침
- ⚠️ `stationLabel` 이 places→catalog 순환을 만듦 — verify-move (e) 가 잡음
- ⚠️ 드로우콜·텍스처 수는 **프레임 타이밍 잡음**이 있다(원본도 636↔664, 텍스처 54↔55, 밤 반딧불 576~578). 시드 고정으로도 안 사라짐 → "원본 N회 내내 고정이던 값"만 비교 기준으로 삼는다
- ⚠️ 스모크 기준은 main 루트를 **다른 포트**로 띄워 잰다(워크트리는 이미 옮긴 코드)
- zsh 에서 `echo ===` 는 명령으로 해석된다 — 체인이 끊긴다
