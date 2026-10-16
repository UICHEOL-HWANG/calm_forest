# mobile-hud-wheel — context
Last Updated: 2026-10-17 03:40 KST

## 결정
- A안(반원 휠 + 가운데 카드 메뉴) + P4(근접 알약, 이모지만, 글자 없음)
- HUD 배치는 body.is-touch 만. 미니맵 실루엣화·나무 근처 자동 도끼는 PC 포함
- 좌상단: 의뢰 패널 위 → 미니맵 아래. 미니맵은 섬 실루엣 + 내 위치만
- 도구 교체: 휠 = 지금 세트만, 탭=들기, 큰 버튼=사용, 호 끝 칩=세트 순환(🌾→🏕️→✋), 세트별 바탕색, 액션 버튼 아래 도구 이름표
- 기준: origin/main 70e17b8e (로컬 main 은 1,199커밋 뒤처짐 — 쓰지 말 것)

## 핵심 위치 (origin/main)
- index.html: buildHotbar ~L2908, ui.setTool ~L3249, refreshActionIcon ~L2885, setInteractPrompt ~L3377, setDoorPrompt ~L3807, setMinimap ~L3973, drawWorldMap ~L3005 (WM_LAND/WATER/GROVE ~L2997), layoutRightColumn ~L5254, openBag ~L6479, 가로 블록 @media (orientation: landscape) and (max-height: 500px) ~L1928 (#topleft 로 시작해야 테스트 통과)
- js/game.js: setToolPage L1483, toolZoneKey L1496, selectToolAuto L1518, updateToolPageAuto L1533, Input.selectTool L1632, trees L1382, prefetchNotices L1244
- js/spaces/doors.js updateDoorInteract L134 (끝에서 updateToolPageAuto L429)
- js/spaces/fishing.js tryChop L127 (2.6 거리)
- js/controls.js inScrollable (overflow auto 요소만 터치 스크롤 허용)

## 시안
- compare.png (A·B·C), prompt-compare.png (P1~P4 + 포코피아 실제 화면)
