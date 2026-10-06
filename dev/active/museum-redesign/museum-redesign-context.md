# 박물관 리디자인 — 컨텍스트

Last Updated: 2026-10-06

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
