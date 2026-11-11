# lazy-game-boot context
Last Updated: 2026-11-10

## 핵심 파일
- `index.html`
  - 3780: game.js static import
  - 5761~: `ensureWorld` / `enterPlay`
  - ~8160: init* 등록과 인증 IIFE
- `js/game.js`: 8,411줄. import할 때 생기는 부작용은 468 `applySeasonPalette` 하나다.
- `js/boot-order.js`: `once` / `loginFirst` (login-first-boot에서 만들었고 미커밋)
- `scripts/lib/bundle-boot.mjs`: 인라인 모듈 감지(33행)와 esbuild splitting
- `scripts/build-cap.mjs`: supabase import 앵커

## 측정 스크립트(scratchpad, 재현용)
- 묶음 구성: esbuild metafile로 import마다 크기와 three/game 포함 여부를 판정한다.
- 결과 요약은 plan 문서의 표에 있다.

## 결정
- 사용자: "1번 계획 세워줘"(로그인 화면 먼저, 게임은 뒤에서). 2026-11-10.
- Input은 Proxy로 처리해 index.html 약 400곳의 호출부를 고치지 않는다(변경 범위 최소화).
- 2단계(영어 사전, 아이콘)는 1단계 측정 뒤에 진행한다.

## 의존
- login-first-boot 변경(미커밋) 위에 쌓는다. 그 변경을 먼저 커밋해야 한다.
