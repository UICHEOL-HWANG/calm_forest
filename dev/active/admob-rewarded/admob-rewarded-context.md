# context · admob-rewarded
Last Updated: 2026-11-10

브랜치 feat/admob-rewarded (base feat/capacitor-app b42c1df1), 워크트리 .claude/worktrees/competent-lewin-309744

핵심 파일
- js/ads/rewarded-native.js · js/ads/rewarded.js · js/ads/rewarded-debug.js(테스트 빌드 전용)
- scripts/build-cap.mjs: ADS_TEST=1 → window.__ADS_TEST__ + 검증 버튼, 기본 빌드는 검증 파일 삭제
- tests/ads-rewarded.test.mjs, tests/build-cap.test.mjs
- android/app/src/main/AndroidManifest.xml(APPLICATION_ID) · ios/App/App/Info.plist(GADApplicationIdentifier·NSUserTrackingUsageDescription·SKAdNetworkItems 50) · ko/en InfoPlist.strings

결정
- 플러그인 JS 대신 cap-bridge(nativePromise) 로 'AdMob' 호출. 이벤트명 onRewardedVideoAd{Reward,Dismissed,FailedToShow,Impression}
- showRewardVideoAd 는 보상 받을 때만 resolve(일찍 닫으면 영영 안 옴) → 닫힘 이벤트로 판정, 보상 이벤트 있으면 complete
- 닫힘 뒤 400ms 동안 늦은 보상·수익 콜백을 기다림. 보상 받았으면 시간 초과·표시 실패여도 complete
- nofill: Android 코드 '3', iOS '1'
- 동의 조회 실패·canRequestAds 없음 = 요청 불가(fail/consent), 다음 호출에서 다시 조회
- ATT 문구는 후보 A로 임시 반영, 사용자 검수 대기

함정
- ADS_TEST=1 이 남은 셸에서 릴리스 빌드하면 테스트 단위·버튼이 실린다 → 릴리스 전 dist-cap/index.html 에 __ADS_TEST__ 없는지 확인
- 워크트리엔 android/app/google-services.json·local.properties 가 없다(../calm_forest-capacitor 에서 복사)
- pages/privacy.html 71행 "광고를 게재하지 않습니다" → 앱 출시 전 수정 필수

검증 결과(2026-11-10)
- iOS 18 Pro 시뮬레이터·Android API 35 에뮬레이터 모두 테스트 보상형이 뜨고 complete + valueMicros(테스트라 0) 수신
- UMP 가 'Failed to read publisher's account configuration; no form(s) configured for the input app ID' → 애드몹 콘솔에 동의 메시지가 없다. 운영 빌드는 이 경우 fail/consent(광고 안 띄움), 테스트 빌드(ADS_TEST)만 통과시킨다
- 에뮬레이터는 8GB 맥에서 창 모드·swiftshader 로는 CPU 스레드가 멈춘다 → `-no-window -gpu host -memory 3072` 로 20초 부팅
- skip: 두 플랫폼 테스트 광고 모두 보상 전 닫기가 막혀 있어 화면으로 재현 못함(단위 테스트만)
