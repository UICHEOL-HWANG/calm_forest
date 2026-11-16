# 모바일 가벼운 재질(C안) 계획

## 배경
iOS 첫 실행에서 첫 화면까지 셰이더 준비 10~14초(시뮬레이터). 장면 재질 몫이 가장 크고(약 5초), MeshLambertMaterial 로 바꾸면 셰이더 시간 약 24%↓(워밍업 −37%). 밤 화면 비교 뒤 사용자 선택: C안(재질만, 블룸·그림자 유지). 데스크톱 불변.

## 접근
`'three'` 를 `js/three-lite.js` 로 돌려 모바일일 때만 `MeshStandardMaterial` 이름으로 Lambert 상속 클래스를 내보낸다.
부팅 뒤 장면 순회 교체는 나중에 생기는 재질을 놓치고, 재질 참조를 쥔 코드(밤 창문 등)가 옛 재질을 바꾸게 되어 기각.

## 바꿀 곳
1. js/lite-material.js — liteMaterialOn(env), makeLiteStandard(THREE)
2. js/three-lite.js — export * from 'three-core' + MeshStandardMaterial 덮기
3. index.html importmap — three → ./js/three-lite.js, three-core → unpkg
4. scripts/lib/bundle-boot.mjs — three → <out>/js/three-lite.js, three-core → vendor
5. scripts/build-cap.mjs — importmap 치환 앵커를 three-core 줄로
6. js/spaces/prologue-set.js — 채도 낮추기 대상에 가벼운 재질 포함

## 검증
npm test · 브라우저 ?touchsim=1(Lambert)·데스크톱(Standard) · 빌드 4종 · iOS 시뮬레이터 새 설치 재측정 · code-reviewer
