# iOS 앱 — 컨텍스트
Last Updated: 2026-10-11 (커밋 a419a9f)

- 워크트리: .claude/worktrees/ios-app, 브랜치 feat/ios-app (base feat/capacitor-app 52a0d06)
- Capacitor 8.5 → iOS 는 SPM 기본(CocoaPods 불필요)
- 핵심 파일: js/platform.js, js/google-native.js, js/apple-native.js(신규), js/supabase-client.js,
  index.html(로그인·넛지·상점 분기), scripts/build-cap.mjs, capacitor.config.json
- 🚨 platform CHECK 실측(2026-10-11): retention_guidance_scores_platform_chk, star_runs_platform_chk
- CORS: worker/functions 전부 '*' → iOS 오리진(capacitor://app.calmforest.cloud) 문제 없음
- 결정: 이메일 OTP 는 안드로이드와 동일하게 앱에서 숨김
- 결정: Photo 플러그인(공유·갤러리 저장)은 안드로이드 Java 전용 → iOS 는 웹 폴백, 후속 과제
- 트래킹: 새 이벤트·키 없음. login{method} 는 app_metadata.provider → 'apple' 자동, platform 파라미터 'ios' 자동, 넛지 target 'apple'
- iOS 오리진: capacitor://app.calmforest.cloud (hostname 이 localhost 가 아니라 개발 훅 차단 유지)
- 미확인: SocialLogin initialize({apple}) 후 google 설정 유지 여부 → 시뮬레이터/실기기에서 확인
