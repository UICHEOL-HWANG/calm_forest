# tool-skins — context
Last Updated: 2026-10-02

## 위치
- 워크트리 `.claude/worktrees/tool-skins` · 브랜치 `feat/tool-skins` (main 4e3853e 위)
- 미리보기 서버: 루트 launch.json 에 `tool-skins` 설정(워크트리 --directory)

## 핵심 파일
- js/cosmetics/catalog.js(SLOTS·RAW) · js/cosmetics/tool-skin-rules.js(신규, 순수) · js/cosmetics/tool-skins.js(신규, 조형)
- js/game.js toolMesh/setHeldTool/refreshHeldTool/applyCosmetics · js/spaces/cafe.js COS_TABS·drawCosMenu·onGranted
- js/spaces/wardrobe.js SLOT_TABS · js/cosmetics/wardrobe.js wardrobeTabVisible · js/shop/reveal-pose.js
- functions/api/_paddle.js 는 카탈로그 역조회라 수정 불필요 · scripts/paddle-seed.mjs 가 priceId 채움

## 결정
- 테마 > 등급 외형(금빛 도구 들고 있어도 테마 입으면 테마)
- 우산은 비+바깥에서만, 펼침은 스케일 팝(경첩 애니 대신 — 병합 메시 유지)
- 입자 FX v1 제외

## 함정(기존 메모)
- node 테스트는 three import 불가 → 순수 파일 분리·소스 검사(gameSource)
- clayMat 캐시 없음 → 도구 교체 시 disposeTree
- 정적 서버 휴리스틱 캐시 → fetch(cache:'reload')
