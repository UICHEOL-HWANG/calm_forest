# 박물관 리디자인 — 컨텍스트

Last Updated: 2026-10-06 (구현·검증 완료, 배포 대기)

## 핵심 파일
- js/museum.js — MUSEUM_FLOORS(layout·theme 추가)
- js/museum/layout.js(신규, 순수) — 배치·방 크기·계단·충돌 반경
- js/museum/exhibit-parts.js(신규, 순수) — 전시물 도형 데이터
- js/museum/exhibit-build.js(신규) — 도형 → THREE 병합(메시 ≤3)
- js/spaces/cafe.js — buildMuseumHall·museumExhibitMesh·museumDims
- js/spaces/doors.js — 나가기 1층 조건 · js/game.js — 이동 제한·미니맵
- tests/museum.test.mjs · museum-layout.test.mjs · museum-exhibits.test.mjs · helpers/real-dex.mjs

## 실측 사실
- 실제 층별 칸 수: 1층 17 · 2층 17 · 3층 31 · 특별전 11
- 옛 문제: doors.js 나가기가 museumFloor 를 안 봄 / 방 15×13 하나에 섬 5열 / 10개 카테고리가 색 20면체

## 함정
- three 는 Node 에 없다 → 순수 데이터(parts·layout)로 나눠 테스트, 빌더는 THREE 주입
- disposeTree 가 재질까지 dispose → 전시물마다 재질 새로 생성
- Box3 측정 전 updateWorldMatrix(true,true) (museum-view-worldspace)
- glow 색 채널 ≤0xd9 (블룸 임계)
- 작업 트리에 타 작업 미커밋 파일 다수 → git add 는 파일 지정만

## 결과·결정 (구현 후)
- 사용자 선택: 층 테마 **C 푸른 저녁**(2층 floor 0xc9b496/wall 0xe6e3dc → 특별전 0x9a99a6/0xd5d9e6), 특별전은 **방 크기를 칸 수에 맞춤**.
- 배치: 벽 16×14(최대 17) · 회랑 20×14(최대 **33** — 34 부터 탁자 끝~옆벽 유리장 통로가 1.6m 아래), 탁자 한 줄 ≤5칸이면 16×14, 한 줄이면 탁자는 z=-0.4(가운데쪽).
- 3층은 31칸 → 한도까지 2칸 여유. 주민/레시피가 늘면 layout.js GALLERY_MAX·방 폭을 다시 본다(테스트가 먼저 터진다).
- 전시물: 시안 모델을 tools 변환기(시안 함수를 가짜 헬퍼로 실행→p(...) 코드 생성)로 이식. 스케일 유리장 1.15 · 탁자 1.3.
- 계획 대비 달라진 점: 벽 방 15×13→16×14(코너 계단 충돌) · Task 7~9 한 커밋 · museumDims 는 층을 지을 때 정해 둔 값 캐시(프레임마다 읽음) · tests/museum-orchard-minimap.test.mjs 도 museumDims 로 갱신.
- 드로우콜 A/B(같은 조건, 옛 main vs 새): 1층 98→98 · 2층 79→90 · 3층 93→106 · 특별전 70→71. 삼각형 3층 17.6k→26.9k.
- 검증 스크립트(스크래치패드, 필요 시 재작성): 헤드리스 CDP(tools/store-shots/cdp.mjs) — 게스트 로그인 버튼은 헤드리스에서 ~23초 뒤에 나타난다(조건 대기 필수).
