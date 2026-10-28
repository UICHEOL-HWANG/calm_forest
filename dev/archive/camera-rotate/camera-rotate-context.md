# camera-rotate context
Last Updated: 2026-10-20

- 워크트리: .claude/worktrees/camera-rotate (feat/camera-rotate, origin/main 기준)
- 핵심 파일: js/camera-user.js(순수 모델) · js/camera-gestures.js(입력) · js/game.js(followOffset ~6397, updatePlayer 이동 ~6166, 미니맵 데이터 ~5995, initCameraGestures ~5804) · index.html(setMinimap drawPlayer ~4388, 투어 maybeHudTour ~4799) · js/onboarding/spot-steps.js · js/hud/spotlight.js · js/hud/hud-shell.js
- 결정: 회전 부호 = 시계 방향 비틀기 → 장면이 손가락 따라 시계 방향(구글 지도식) = yaw += Δ. Q = 왼쪽으로 돌기(yaw +), E = 오른쪽
- 결정: 실내·동굴·카페·박물관·천문대·바다·나룻배·이웃 실내는 회전 없음(userCamOn 재사용)
- 함정: dim-only(target null) 스포트라이트는 화면 전체를 막아 두 손가락이 캔버스에 안 닿는다 → 가운데 투명 존(#cam-spot-zone)을 target 으로
- 함정: 새 HUD(hud-shell)가 #topleft 를 display:none — #cam-reset-btn 이 그 안에 있어 줌·기울기 되돌리기가 이미 안 보이던 상태
