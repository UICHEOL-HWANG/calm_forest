# 식당 + 포구 섬 컨텍스트

Last Updated: 2026-11-10 01:30 KST

## 핵심 파일
- 기획: `docs/superpowers/specs/2026-10-31-restaurant-quest-design.md`
- 분리 보관: `docs/superpowers/specs/2026-10-31-plaza-concert-draft.md` (광장 모닥불·리듬 연주회)
- 시안: `sims/port-entry-compare.html`(진입 위치 3안), `sims/restaurant-kitchen-sim.html`, `sims/port-island-sim.html`, `sims/port-shop-compare.html`
- 조형 단일 소스: `sims/port-shop-models.js` (`tubBoat`, `yatai`, `dockHouse`, `C_VARIANTS`), 섬 주민 `sims/port-npc-models.js` (`buildIslandNPC`, 마을 주민과 같은 몸 규격)
- 캡처: `sims/restaurant-kitchen/`, `sims/port-island/`, `sims/port-shop/`
- 길 안내 겹침 점검(2026-11-10): `js/guide/` 화살표·경유점 모듈은 없음(`js/house-guide-rules.js`는 집 짓기 실험 규칙), 온보딩 화살표 시안 `sims/onboarding-cine/arrow-compare.html`은 이 체크아웃에 없고 `cranky-boyd-5fbb89` 워크트리에만 있어 계획대로 `js/guide/` 신설

## 사용자 결정 (2026-11-09)
- 식당은 카페와 별도 건물, 직접 걷기 조작, 홀+주방+배식대
- 조리는 썰기(누르고 있기) + 자동 익힘(꺼내는 타이밍)
- 평판은 별 단계형(조건+보상), 난이도는 별(콘텐츠)과 DDA(여유) 분리
- 식재료는 배 타고 가는 새 맵 포구 섬
- 배는 레퍼런스의 빨간 둥근 통배, 노 젓기 없이 조이스틱으로 그냥 이동
- 바다는 직접 몰며 낚시하는 곳(자동 항해 아님)
- 섬 가게 C안(포장마차+기둥집), C2 붉은 지붕 밤장으로 확정
- 섬을 넓히고 주민 의뢰로 식재료 지급
- 통배 아이콘 T2(비스듬히 위, `sims/icon-set/tub-boat.svg`). ⛵ 이모지는 강 나룻배가 써서 일괄 치환 금지, 전용 키로
- 섬 주민 대화는 광부 아저씨와 같은 아래 대사 박스(`#mirror-talk`, `js/mirror/talk-box.js` 의 showTalk/hideTalk, `js/delve/miner-talk.js` 패턴)를 쓴다. 대사를 문장 단위로 넘기고(탭·Space), 마지막 줄을 넘기면 의뢰가 자동 수락된다. 진행·보상도 같은 박스. 화면을 어둡게 하지 않고, 박스가 떠 있는 동안 길 안내 카드는 숨긴다. (의뢰 창 `#npc-modal` 은 쓰지 않기로 11/10 결정)
- 대화 박스 얼굴·의뢰 칩의 주민 얼굴은 시스템 이모지(🦦 등, 누운 수달이라 어색)가 아니라 3D 주민 모형을 찍은 초상(`npcPortrait(id)`, port-npc-models.js)을 쓴다
- 부표 의뢰 물건은 `icon-set/buoy.svg` + `netBuoy()`(port-npc-models.js)로 아이콘·월드 모양을 맞췄다. 해변 부표는 게임 카메라에서 빨강·흰 반반이 보이게 기울여 둔다
- 해금: 식당·포구 섬 모두 부엌 서식지 완성 때(카페와 같은 조건)
- 진입은 A안: 마을 바다터 후미 물가에 통배 부두 따로(바다터와 잠금 분리)
- 첫 방문 길 안내를 섬세하게: 화살표로 위치를 안 알려 주면 이탈이 크다는 분석 결론

## 시뮬에서 밟은 함정
- 원기둥 일부(thetaStart)로 지붕을 만들 때, z축 90도 회전 후 위쪽은 theta=π/2 기준
- 기울어진 벽(사다리꼴 원기둥)에 반듯한 창·문 판을 붙이면 반쯤 박힌다 → 벽은 상자로
- 길 안내 화살표가 건물을 관통하면 직선 추종 유저가 막힌다 → 경유점
- 장애물 판정이 "안쪽이면 전부 막기"면 경계에 낀 캐릭터가 못 빠져나온다 → 깊어지는 이동만 막기
- 안내 중 무관한 버튼·말풍선이 뜨면 손가락이 엉뚱한 버튼을 가리킨다 → 단계의 expect 행동에만 👆
- 시뮬 window 훅에 배열을 그대로 노출하면 reset 후 옛 배열을 본다 → getter로

## 구현 구조 결정 (2026-11-10)
- 섬은 새 공간 플래그(atPort) 대신 잠수·갯벌처럼 바다 공간(atSea) 안 하위 모드 `port.active`. game.js 공간 등록 17곳을 건드리지 않기 위해
- 후미 바탕(모래·물·등대)은 해금 id `cove`(바다터 또는 포구), 바다터 입구는 `sea`, 통배 부두는 `port`(부엌 서식지)로 나눈다
- 섬 공간 원점 PORT = (700, 0, 0)
- 저장은 game_saves.state.port(jsonb, 키 CHECK 없음, 크기 제한만) → 1단계는 마이그레이션 없음
- 아이콘은 GAME_IDS 에 tub_boat·buoy 추가 후 tools/icons/build-game-icons.mjs 재생성(⛵ 는 그대로)
- 새 이벤트 3개는 docs/analysis/event-taxonomy.csv 에 행 추가해야 테스트 통과

## 성능 측정 (2026-11-10, Task 14)
- 방법: ?dbg&e2=skip_login&unlocks=on&weather=clear&time=0.32(낮) / time=0.8(밤), __perf() 로 드로우콜·삼각형. 바다는 빠른 이동 중간(wp 3), 섬은 도착 1초 뒤
- 드로우콜(낮/밤): 마을 475/465, 바다 한가운데 75/91, 섬 도착 128/164. 삼각형 약 8.9만 / 1.4만 / 1.7만
- 섬이 마을보다 훨씬 낮아 병합은 하지 않음. shadow-scope 의 atSea 는 이미 OUT_OF_REACH_FLAGS 에 있음
- 점광원(포구 진입 시): 이전 8개(마을 3 + 포구 5) → 이후 5개(마을 3 + 통배 등 1 + 부엉이 손등불 1). 종이등 3개는 발광 재질만 남김
- 🐛 통배 등불은 setPortNight 가 shops 만 훑어 한 번도 켜지지 않았음 → boat 를 훑도록 고침
- 포구 첫 진입 첫 프레임 약 126~150ms(건물 생성 + 광원 수 변화 재컴파일), 밤 첫 측정 한 번은 약 1초(콜드). 재진입은 약 30ms. 광원을 부팅 때 상시 추가하면 마을이 늘 비용을 내므로 완화는 하지 않음
- npcPortrait: 임시 렌더러에 forceContextLoss 추가, 초상 씬의 부엉이 광원은 visible=false
