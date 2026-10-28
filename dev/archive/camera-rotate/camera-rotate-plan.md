# 카메라 좌우 회전 (A안: 두 손가락 비틀기) — 계획

승인: 2026-10-20 사용자 "A가 나은듯~ A로 진행하고, 그 음영 튜토리얼에도 추가해줘"
시안: sims/camera-rotate-compare.html (루트 체크아웃)

1. camera-user.js: 상태에 yaw(도, -180~180, 기본 0) 추가 · camOffsetFor 가 yaw 만큼 수평 회전 · isDefaultCam 에 yaw 포함 · 저장/불러오기 · withYaw · 비틀기 판정(classifyTwoFinger 'rotate') · yawFromTwist · moveToWorld(이동 벡터 회전)
2. camera-gestures.js: 두 손가락 비틀기 → yaw, PC Q/E 키 → yaw(Q=왼쪽)
3. game.js: 이동 입력을 yaw 만큼 회전(userCamOn 일 때만) · 회전 커밋 시 ui.act('camrotate') · GA4 camera_adjust 에 yaw · 미니맵에 시야 부채꼴(camYaw)
4. 🧭 되돌리기: 기존 #cam-reset-btn 을 미니맵 오른쪽으로 옮기고(새 HUD 가 #topleft 를 숨겨 안 보이던 버튼) 아이콘 🧭
5. 음영 튜토리얼: 새 유저 full 투어에 'cam' 단계, 기존 유저는 야외에서 1회 'cam' 투어(터치=비틀기 손 애니, PC=Q/E)
6. 검증: node --test · 브라우저(세로 폰·PC) 회전·이동 방향·리셋·투어 · 코드 리뷰
