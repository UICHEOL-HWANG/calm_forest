# 1부 탁상 올려놓기 실측 보고 (Task 4, Steps 1–5·7)

실측 환경: 워크트리 `scripts/serve.py 8123`(포트 충돌 없음, 끝나고 종료) · Playwright · `?give=crop:99,fish:20,coins:2000` · 게스트 → 여우 → `#intro-skip` → `#tut-skip`. 코드는 수정하지 않았다.

## 1. 시나리오 (Step 2) — 기대 vs 실측

`__decorY()` = `[id, y, 충돌체?, 상판 위?]`. 집에는 기본 침대(`bed`)가 먼저 들어 있어 `__decorPick(0)` 은 침대를 든다 → 브리프의 `0` 대신 `table` 의 실제 인덱스(1)를 썼다.

| 단계 | 기대 | 실측 | 결과 |
|---|---|---|---|
| table 놓기 | `[table, 0.2, true, false]` | `["table",0.2,true,false]` | PASS |
| deskLamp 같은 자리 | `[deskLamp, 1.19, false, true]` | `["deskLamp",1.19,false,true]` | PASS |
| plant (3,3) | `[plant, 0.2, true, false]` | `["plant",0.2,true,false]` | PASS |
| table 들기 | 목록에서 빠지고 lamp `0.2,true,false` | table 빠짐, `["deskLamp",0.2,true,false]` | PASS |
| `__decorBack()` | table 복귀, lamp `1.19,false,true` | table 맨 뒤로 복귀, `["deskLamp",1.19,false,true]` | PASS |
| bigtable 같은 자리 추가 | lamp 1.235 | `["deskLamp",1.23,false,true]` | PASS (주석 1) |

주석 1: `__decorY` 가 `toFixed(2)` 로 찍어 1.235 가 부동소수 오차로 1.23 으로 보인다(훅의 반올림 한계). 상판 1.19 → 1.23 으로 더 높은 상판을 고른 것은 확인. 정확한 1.235 는 이 훅으로는 못 읽었다(단위 테스트가 담당).

## 2. 화면 (Step 3)

| 항목 | 결과 | 파일 |
|---|---|---|
| 탁자 위 등불 PC(1280x800) | PASS — 상판 위에 놓임 | `look/part1-lamp-on-table-pc.png` |
| 탁자 위 등불 모바일(390x844) | PASS — 뷰포트는 데스크톱으로 복귀 | `look/part1-lamp-on-table-mobile.png` |
| 소품을 든 채 탁자 조준 → 고스트가 상판 높이 | PASS — 실제 UI(꾸미기 → 탁상 등불)로 들고 마우스를 탁자 위로: 고스트가 상판 위에 뜨고 링이 탁자를 감쌈. 바닥 조준 땐 바닥에 뜸 | `look/part1-held-aim-table.png`, `look/part1-held-aim-floor.png` |
| 실제 클릭으로 놓기 | PASS — 등불 y 1.19, 충돌체 없음, 상판 위 true, 작물 99→96 차감 | `look/part1-placed-by-click.png` |
| 가까이 서면 프롬프트 링이 상판에 | PASS — "탁상 등불 · 옮기기" 프롬프트와 링이 상판 높이에 그려짐 | `look/part1-near-ring.png` |
| 힌트 배너 1회 | PASS(부분) — "올려둔 소품" 배너가 가까이 섰을 때 1회 떴고, 멀어졌다 다시 접근했을 때는 배너 요소가 opacity 0(재표시 안 됨). 코드상 `hintsSeen['decorStack']` 가드. 재접근은 1회만 시험 | — |
| 어항을 스툴 위에 | PASS — `__decor('stool',-3,3)` 후 같은 자리 `aquarium`: `["aquarium",0.2,true,false]` (바닥) | — |
| 세이브 왕복 직전 상태 | 참고 화면 | `look/part1-roundtrip-before.png` |

## 3. 다층 (Step 4) — 실측하지 못함

`__gs().houseStage = 4` 로 올리고 `__goFloor(1)` 호출 후 `__decor('table',-5,-3,0,0)` + `__decor('deskLamp',-5,-3,0,1)` 을 시도했다. 결과 lamp `["deskLamp",0.2,true,false]` — 1층 탁자 위로 올라가지 않았지만, 훅으로 stage 를 직접 바꾼 것이라 2층 바닥이 실제로 지어졌는지·`floorBaseY(1)` 이 기대값인지 확인하지 못했다(y 가 0.2 로 읽혀 2층 높이가 적용된 것 같지도 않다). 따라서 **실제 다층 환경은 검증하지 못했다.** 규칙은 `tests/house-surface.test.mjs` 의 "다른 층 상판은 무시한다" 로 갈음한다. 이 시도는 버려진 게스트 세션에서 했고 이후 새 게스트로 초기화했다.

## 4. 세이브 왕복 (Step 5) — 부분 검증

- 실제 UI 로 탁자 구입·배치 → 등불 구입·배치(비무료 배치는 `requestSave()` 호출). 콘솔에 `[Supabase] 저장 완료` 가 찍혔고 `__gs().house.decor` 에 `bed, table(x0,z-1.107), deskLamp(x0,z-0.630), rot 0, f 0` 이 직렬화됨 → 저장 쪽 PASS. 이 때 등불은 1.19/충돌체 없음.
- 새로고침 후 복원은 **재현하지 못했다**: 게스트 로그인은 새로고침마다 새 익명 계정을 만들어(로그인 화면이 다시 뜨고 집에 침대만 있음) 이전 세이브가 로드되지 않는다. 로그인 계정이 없어 실로드는 검증 못 함.
- 대체 검증: 복원 경로(`applySave` → `placeDecor(..., silent=true)`)와 같은 호출을 저장된 좌표로 재생(table → lamp)해 lamp 1.19/충돌체 없음/상판 위 확인. 역순(lamp 가 table 보다 앞) 은 시나리오 단계 `__decorBack` 직후에 이미 확인(배열이 `lamp, plant, table` 순인데 lamp 1.19).
- 부작용: 실제 Supabase 에 익명 게스트 계정/세이브가 몇 개 생겼다(일반 게스트 플레이와 동일한 경로). 그 중 하나는 `houseStage=4` 를 직접 넣은 세이브가 포함된다(버려진 익명 계정).

## 5. 콘솔

- 에러 5건(전부 동일): `Failed to load resource: net::ERR_EMPTY_RESPONSE @ /api/plaza?season=harvest-2026` — 로컬 정적 서버(`serve.py`)에 `/api/plaza` 라우트가 없어서 생기는 것. 탁상 기능과 무관.
- 경고 0건. 탁상 코드에서 나온 에러/예외 없음.

## 못 한 것

- 실제 다층 환경(위 3).
- 새로고침을 통한 실로드 복원(위 4).
- `bigtable` 의 정확한 1.235 값(훅 반올림).
- 모바일에서 실제 터치로 든 채 조준하는 흐름(모바일은 정지 화면만 캡처).
