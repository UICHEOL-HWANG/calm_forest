# 애드몹 보상형 광고 바닥 (앱)

설계: docs/superpowers/specs/2026-11-09-progress-prepass-rewarded-design.md §2·§4·§5
범위: 광고를 띄우고 결과를 돌려주는 모듈까지. 프리패스 버튼·지급·prepass_* 계측은 온보딩 배포 뒤 별도 작업.

1. @capacitor-community/admob 8.3.0 설치, 앱 ID를 AndroidManifest·Info.plist에
2. js/ads/rewarded-native.js(순수, 주입) + js/ads/rewarded.js(연결): showRewarded(placement) → {result: complete|skip|fail|nofill|unavailable, valueMicros?, currencyCode?, precision?, reason?}
3. UMP 동의 → (iOS) ATT → SDK 시작, 첫 광고 직전에 한 번. 개인정보 옵션 창 진입점 showAdPrivacyOptions
4. paid event(onRewardedVideoAdImpression) 값을 결과에
5. ADS_TEST=1 빌드에만 구글 테스트 단위 + AD TEST 버튼, 에뮬레이터·시뮬레이터 검증
6. 스토어 개인정보 변경 목록: store-privacy-changes.md
