# context
Last Updated: 2026-11-16 23:05

- 브랜치 perf/mobile-lite-material (main 94c6a865), 워크트리 .claude/worktrees/mobile-lite-material
- 측정 근거: 프로브 브랜치 tmp/ios-boot-probe (커밋·푸시 금지). 첫 프레임 31 프로그램 = 효과 10 · 장면 ~18 · 그림자 2
- 비교 이미지: sims/shader-lite/bloom-compare.jpg (메인 체크아웃)
- 재질 생성 276곳/87파일 → 개별 수정 안 함
- Standard 전용 속성 사용: house/garden.js·villa.js 물 roughness 0.1 (모바일 반짝임 약해짐, 허용)
- 묶음 키에 roughness 사용: cosmetics/art.js, shop/building.js → 가벼운 재질도 roughness 값 보관·clone 유지 필요
- 테스트는 vendor/three/three.module.js 를 직접 import
- 결정: C안(블룸 유지), 데스크톱 불변, 안드로이드 측정은 범위 밖
- 화질 차이(A vs C 픽셀): 평균 2.3/255, 10단계 넘는 픽셀 4.8%, 연못 8.8·캐릭터 7.3·나무 1.6
- 묶음 크기: main 4,113,424B → 이 브랜치 4,114,618B(+1.2KB)
- build-cap ios 첫 실행 1회 실패(원인 미확인), 이후 3회 재현 안 됨
- 워크트리 로컬 서버는 .env 없어 /api 프록시 오류(무관)
