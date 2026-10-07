# 할로윈 코인 장식 — 한계점 실측 (Part 3)

실측일 2026-10-07 · main (b61eb2b) · 코드 변경 없음(검증 전용)

## 방법 (운영 DB 보호)
- `tools/store-shots/cdp.mjs` 헤드리스 Chrome(CDP) + `Network.setBlockedURLs` (`*supabase.co*`, `*googletagmanager*`, `*google-analytics*`), 오프라인 게스트로 진입.
- `python3 scripts/serve.py 8793` → `http://127.0.0.1:8793/?dbg=1&weather=clear&time=0.32&house=6` (끝나고 서버·Chrome 종료).
- 페이지는 supabase.co 의 `/auth/v1/signup` 을 시도했지만 네트워크 층에서 차단(`Failed to fetch`, size 0) → 게스트가 "오프라인(콘솔 폴백)" 으로만 동작. 운영 DB 로 나간 요청 없음. (supabase-js 라이브러리는 esm.sh 에서 받아오며 이는 백엔드가 아님.)
- 드라이버는 git 무시된 `.scratch/part3/*.mjs` (커밋 안 함).

## 1. 진짜 다층(`?house=6`) — PASS

| 상황 | 기대 | 실측 `[id, y, collider, onSurface]` |
|---|---|---|
| f0 table + f1 deskLamp 같은 x,z | 램프가 f0 탁자에 안 얹힘, y=0.2, onSurface false | deskLamp `0.2, true(콜라이더), false` |
| + f1 table 같은 자리 | 램프 상승 = 0.2 + 0.66×1.5 = 1.19 | deskLamp `1.19, false, true` (탁자 `0.2, true, false`) |
| f0 램프 + f0 탁자 | 1.19 | `1.19, false, true` |
| 루프탑(f2) table → ghostCandle | table = ROOF_Y 3.4 + 0.2 = 3.6, 소품 = 3.6 + 0.99 = 4.59 | table `3.6, true, false`, ghostCandle `4.59, false, true` |

- 저장 레코드는 `{id,x,z,rot,f}` (f=층) — 같은 x,z 라도 층이 다르면 서로 받치지 않음을 확인.
- 참고: 1층(f0)과 위층(f1)의 `floorBaseY` 는 둘 다 0 이고(지붕만 `elevated`), 층 분리는 y 가 아니라 `rec.f` 로 이뤄진다. `__goFloor(0/1/2)` 를 오가도 모든 y 값 불변.
- `__decor(id,x,z,rot,f)` 의 f 인자가 정상 동작(안 보이는 층에도 배치됨).

## 2. 저장/복원 — PASS (경로 명시)

- 직렬화: `getGameState()` → `gameState.house.decor` = `[{id,x,z,rot,f}]` (배치 순서 그대로). y·콜라이더·onSurface 는 저장하지 않고 복원 시 `placeDecor` → `reseatDecor` 가 다시 계산.
- 오프라인 게스트 영속: **없음**. `saveGame` 은 오프라인이면 콘솔에 row 를 찍고 `{ok:true, offline:true}` 만 반환. localStorage 는 `cf_client_id` 하나뿐(세이브 아님), sessionStorage 비어 있음, IndexedDB 없음. 따라서 "새 페이지 로드 후 복원"은 네트워크 없이 그대로 재현 불가.
- 실행한 복원 경로: **실제 `applySave`**. dev 훅 `__pet.roundTrip()` 이 `applySave(JSON.parse(JSON.stringify(getGameState())))` 를 호출 → `saved.house.decor.forEach(placeDecor(..., silent=true, ..., normalizeFloor(d.f, houseStage)))` 루프를 그대로 탄다. 새 페이지에서 `__gs().house.decor` 를 기록한 레코드로 채운 뒤 이 훅을 호출했다. 레코드 8개: f0 table+lamp, f1 table+lamp, f2 table+ghostCandle, f1 단독 lamp(아래엔 f0 탁자만), f0 table.

| 순서 | 결과 `__decorY()` (bed 제외) | 기대 대비 |
|---|---|---|
| 저장 순서(탁자 → 소품) | table 0.2 / lamp(f0) 1.19 / table(f1) 0.2 / lamp(f1) 1.19 / table(f2) 3.6 / candle(f2) 4.59 / lamp(f1 단독) 0.2 콜라이더 / table(f0) 0.2 | 복원 전과 완전 동일 |
| 역순(소품 → 탁자) | 메시 순서만 뒤집힘. lamp(f1 단독) 0.2 콜라이더, candle 4.59, table(f2) 3.6, lamp(f1) 1.19, lamp(f0) 1.19, 탁자들 0.2 | 전부 올바른 높이/콜라이더 |

- 역순에서도 `reseatDecor` 가 매 `placeDecor` 마다 돌아 소품이 뒤늦게 놓인 탁자 위로 올라간다.
- 미검증: 실제 Supabase 왕복(저장 → 다른 세션 로드), `loadGame` 판정 경로, `houseStage` 가 가구보다 나중에 복원되는 상황(여기서는 `?house=6` 이라 단계가 이미 6). DB 없이 재현 불가.
- 메모: `applySave` 는 기존 가구 메시를 지우지 않는다(실부팅에선 메시가 없는 상태에서 호출되므로 무해). 훅은 새 페이지에서만 호출했다.

## 3. 소품 그림자 흔들림 — 흔들림 없음 (실내에는 실시간 그림자 자체가 없음)

설정: 낮(`time=0.32`), 실내, table+ghostCandle(왼쪽), table+deskLamp(오른쪽). 프레임 12장(정지) + 14장(걷기, `KeyD` 70 ms 펄스).

핵심 사실
- `__perf()` → `shadow:true, shadowAuto:false`: 실내에서는 섀도맵 갱신이 꺼져 있다(`js/shadow-scope.js` 의 `MEASURED_SHADOWLESS_FLAGS` 에 `indoor`).
- 해 그림자 상자 중심은 `(-5, 0, 18)`(플레이어 z 가 ±18 로 클램프), 방은 z≈47~52 → 상자 밖. 소품 메시는 `castShadow=true` 지만 받아 줄 맵이 없다.
- 소품 on/off 비교(고정 카메라): 탁자 구역에서 소품 박스 밖 최대 픽셀 차이 5(촛불) / 12(등불, 점광 글로우), 바닥 대조 1. 단단한 그림자(수십 이상 어두워짐)는 없음.

실측(휘도 평균 절대차, 0~255)

| 조건 | 구역 | 연속 프레임 MAD |
|---|---|---|
| 정지 카메라 12프레임 | 촛불 탁자 / 등불 탁자 / 바닥 대조 | 전 쌍 정확히 0.00 (프레임 동일) |
| 걷기 14프레임, 이동분(−14~+5 px) 정렬 후 잔차 | 촛불 탁자 구역 | 평균 0.72 (0.35~1.37) |
| 〃 | 등불 탁자 구역 | 평균 0.51 (0.19~0.76) |
| 〃 | 빈 바닥 대조 | 평균 0.03 |
| 정렬 전(영 이동) | 탁자 구역 | 2~9 (카메라 이동 때문) |

- 정렬 후 잔차는 탁자·소품 윤곽의 서브픽셀/원근 오차(대비 큰 가장자리)이며, 대조구역(바닥)은 0.03. 차이 영상(×8)에서도 얇은 윤곽선만 보이고 바닥에 번지는 덩어리·깜빡임 없음.
- 판정: **흔들림 없음**. 단 "그림자가 안정적"이 아니라 "실내에서는 그림자가 아예 안 그려진다"가 정확한 이유.
- 한계: ① 소프트웨어 렌더(SwiftShader)라 캡처 간격이 목표 100 ms 가 아니라 약 0.7~1.3 s. ② 걷는 동안 카메라가 따라와 프레임마다 0~14 px 이동 → 평행이동 정렬 가정이라 잔차에 원근 오차가 섞임. ③ 야외(마을) 실시간 섀도맵 환경의 소품은 측정하지 않음(ghostCandle/deskLamp 는 실내 가구). ④ 섀도맵을 켰을 때 모습은 소스 변경 없이는 못 봐서 미검증.

산출: `look/part3-shadow-strip.png` (걷기 14프레임, 정렬 크롭 + 차이×8; 위 2행 촛불, 아래 2행 등불).

## 4. 리팩터(planSeats/buyBlocked) 회귀 — PASS

| 시나리오 | 기대 | 실측 |
|---|---|---|
| table + deskLamp 같은 자리 | lamp 1.19, 콜라이더 없음, onSurface true | `deskLamp 1.19, false, true` |
| `__decorPick(table)` | lamp 0.2 + 콜라이더 | `deskLamp 0.2, true, false` |
| `__decorBack()` | lamp 1.19 | `deskLamp 1.19, false, true` |
| + bigtable 같은 자리 | 더 높은 상판 | `deskLamp 1.23` (0.2 + 0.69×1.5 = 1.235) |
| stool 위 aquarium(발자국 0.66×0.42 > 받침 0.44) | 바닥 | `aquarium 0.2, true, false` |
| 근접 프롬프트(램프 0.7 앞) | `🪔 탁상 등불 · 옮기기` | `#door-prompt` = "🪔 탁상 등불 · 옮기기", `nearDoor="decor"`, 호박색 링 표시 |

산출: `look/part3-regression-near.png`.

## 5. 콘솔
- 에러(예상된 소음): `[게스트] 익명 로그인 실패 → 오프라인(콘솔 폴백)으로만 동작합니다 ... (원인: Failed to fetch)` — supabase 차단 때문. 이 외 에러/예외 0건.
- 경고(`console.warn`/`error` 후킹): 배치·층 이동·pick/back·applySave 왕복 구간에서 0건. (`/api/*` 404 는 리소스 오류라 콘솔 에러로는 잡히지 않음.)

## 스크린샷
- `dev/active/halloween-coin-decor/look/part3-regression-near.png`
- `dev/active/halloween-coin-decor/look/part3-shadow-strip.png`

## 미검증 요약
- 실제 DB 저장/로드 왕복, 야외 실시간 그림자 환경의 소품, 섀도맵을 켰을 때의 모습, 모바일 뷰포트.
