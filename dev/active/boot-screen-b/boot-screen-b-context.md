# context
Last Updated: 2026-11-17 00:05

- 브랜치 feat/boot-screen-b (main 94c6a865), 워크트리 .claude/worktrees/boot-screen-b
- 시안: sims/boot-transition/compare.html · artifact FURBkNmmp7Aoa2Rjq7Grt7 (B 선택), 문구 1안
- 색: 바탕 radial #f4f7ef→#dfe8d8→#cfdcc6, 막대 #2f6b4f, 문구 #3c5245, 마크 92px·세로 42%·모서리 26px
- 현재 레이어: OS 실행 화면(iOS 흰+Capacitor 로고) → WebView #1b2a1f → #loading.boot-bg(앱엔 login-bg.webp 없음) → 낮 attract → #sleep-fade 남색(revealVeil, warmBeforeReveal) → 마을
- 고정 테스트: boot-order(#loading.boot-bg 마크업), i18n-boot(LOADING_RE 첫 자식 load-pill), install-survey-*(순서), reveal-warm(veil 줄), shader-warm
- setLoadWait 는 #loading textContent 를 덮어쓴다 → 앱 B 에선 문구만 바꾸게
- 범위: 앱(iOS·안드로이드)만. 웹·토스·itch 불변
- 결정 추가: iOS 웹뷰 배경 투명(#dfe8d800) + SceneDelegate 창 숲색·곰 → 웹 첫 페인트 전 곰 유지. 원 시작 반경 150%→85%(앞 절반 빈 시간 제거). 설문 바탕 숲색 반투명(앱만). 단계1 뒤 nextPaint 한 번(안 하면 문구가 안 그려짐)
- 남은 LOW: iOS 재로드 시 첫 페인트 전 깜빡임 가능, 원 열기 clip-path 는 메인 스레드, 안드 12+ 시스템 스플래시 아이콘은 가운데(색만 맞춤)
- 시뮬레이터는 서명 없는 빌드라 게임센터 실패 → 자동 로그인 원 열기 경로는 실기기에서만 확인 가능
