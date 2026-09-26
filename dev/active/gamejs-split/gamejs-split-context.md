# 📦 game.js 분리 — 핵심 파일·결정·함정

**Last Updated** 2026-09-26

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

## 2단계(2026-09-25) 함정
- ⚠️ 스모크 기준·후보는 **같은 동시 실행 수**로. 5개 동시 기준은 마을 메시 1613, 2개 동시는 1599
- ⚠️ 성능 카운터(calls·tris·geoms·tex)는 로딩 타이밍에 흔들린다 — 같은 원본도 흐름에 따라 마을 드로우콜 635/647.
  모듈이 늘면 타이밍이 체계적으로 옮겨 가 거짓 경보가 된다 → 판정은 kinds(지오메트리|재질|보임별 메시 수)·세이브 상태·에러
- 알려진 잡음(근거 명시): 밤 반딧불이 수(원본 1605~1619)
- game.js 선언 앞에 export 를 붙이면 `^let indoor = false` 같은 텍스트 테스트가 깨진다 → 끝 export 목록으로
- 원본 스냅샷: `git archive 21453dd | tar -x -C <스크래치>/base-main` 후 그 폴더에서 serve.py

## 2단계 이어서(2026-09-26) 함정
- ⚠️ 앞 구역이 main 에 병합되면 기준 = game.js 만으로는 증명이 안 된다 → verify-extract 가 기준 커밋의 js/spaces 도 읽게 고침
- ⚠️ 추출 뒤 다른 커밋이 모듈에 export 없는 도우미를 넣을 수 있다(cafe.js slotHash, a8d119c) → (c)(d) 는 기준에 원문 그대로 있던 문장을 건너뜀
- ⚠️ 공용 선언(woodMat)이 구역 안에 있으면 딸려 가서 이미 옮긴 모듈의 import 가 끊긴다 → extract-module 이 그런 이름을 남김
- ⚠️ 자동 닉네임은 스모크 잡음(시드 난수 수열의 위치가 타이밍에 따름) — 기준 4회가 우연히 같아도 후보에서 갈릴 수 있다
- zsh 는 `set -- $r` 로 단어를 안 나눈다 — 스모크 라벨이 'k-base-1 2' 로 깨졌다. 함수 인자로 넘길 것
