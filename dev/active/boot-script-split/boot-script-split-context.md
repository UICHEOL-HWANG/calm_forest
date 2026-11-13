# Context — boot-script-split
Last Updated: 2026-11-13 02:38

- 브랜치 perf/lazy-en-dict (워크트리 .claude/worktrees/lazy-en, origin/main a12fd337 기반). 앞 커밋 6afaf921 = 영어 사전 지연 로드(646→411KB).
- 첫 화면 상한: tests/lazy-game-boot.test.mjs BOOT_KB_LIMIT 650.
- 번들: scripts/lib/bundle-boot.mjs(esbuild esm splitting). 모든 빌드(web/ait/itch/cap)가 거친다.
- 시작 스크립트 = index.html 의 `<script type="module">\n    import { hasStoredAuthSession` 블록.
- 1단계 구역(index.html 줄, 착수 시점):
  - 요리 코스 6970–7414: 바깥 참조 $, Input, LANG, Sound, layoutBuffs, ui / 바깥에서 부름 startCookCourse(renderKitchen·냄비 탭), 개발 훅 MG·mgTap
  - 조각 공방 7416–7494: 바깥 참조 $, Input, layoutBuffs, ui / 바깥에서 부름 ui.carveProgress·carveDone·carveGem, openCarveHud
  - 상점 7513–7734: 바깥 참조 $, Input, t, ui, lastInv(바뀌는 let → getter), SELL_ICO_G, clampQty, iconById, itemName, sellList / 바깥에서 부름 renderShop, openHomi, showShopTab
- 결정: 모듈 폴더 js/game-ui/, 게임 모듈과 같이 로드(화면 열 때 기다림 없음).

## 1단계 결과
- 첫 화면 411.0KB → 387.6KB, 인라인 시작 스크립트 152KB → 129KB. 전체 테스트 5,262 통과.
- 영향 테스트 5개 파일(free-pot-wiring·forage-items·homi-stall·prepass-repeat·shop-menu-fit)이 새 모듈을 읽게 갱신.
- 브라우저(배포 빌드): 요리 코스 끝까지(실제 Space 키 포함)·결과 카드, 조각 진행·결과·포장, 상점 팔기·시트·사기, 호미 가판대 확인.
- 따로 볼 것: 영어 모드 요리 결과 제목 '아쉬운 맛!' 미번역(사전엔 느낌표 없는 키만, 이번 변경 전부터).

## 2단계 결과
- 388KB → 337KB, 인라인 129KB → 100KB. 모듈 7개 추가(workbench-menu·kitchen-menu·boat-menu·leaderboard·dex·photos·bag).
- ctx 추가: TOUCH, spot, refreshActionIcon, escapeHtml, isGuestNow, shell getter, setPlacingDecorItem.
- 검사 스크립트(scratchpad): tdz.cjs(인라인 TDZ·미정의), modcheck.cjs(모듈 미정의), unused.cjs(안 쓰는 import).
- 발견(기존 버그, 미수정): photos.js frameActionShot 의 `const t = new Date()` 가 i18n t 를 가려 TDZ → 공유 카드 합성이 늘 실패, 원본만 나감. origin/main 에도 있음.
- 리뷰 LOW: installGameUi 안에서 패널 하나가 id 를 못 찾으면 월드 전체가 실패 화면으로 감(지금은 모든 id 존재).

## 3단계 결과
- 337KB → 330KB, 인라인 100KB → 93KB. 모듈 2개(guide-panel·house-exterior).
- 함정: 모듈 최상위 선언이 $(...) 를 부르면 import 시점에 터진다(guide 의 guidePanel 등) → let 으로 두고 install 에서 대입. scratchpad evalcheck.cjs 로 전 모듈 검사.
- 전체: 646KB(시작) → 330KB. 인라인 시작 스크립트 152KB → 93KB.
