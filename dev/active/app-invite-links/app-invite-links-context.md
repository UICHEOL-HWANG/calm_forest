# Context — app-invite-links
Last Updated: 2026-11-12 16:05 KST

## 핵심 파일
- js/referral/rules.js — inviteUrl(/i/CODE) · readInviteParam(/i/ 경로) · inviteFromReferrer · normalizeInviteCode · canEnterCode · bindMessage(manual) · MSG 문구 6개
- js/referral/flow.js — captureNativeInvite(링크>설치기록, 이미 연결·이미 본 링크 무시) · bindWithCode(같은 코드 동시 호출 차단) · INVITE_BOUND_KEY
- js/referral/index.js — 네이티브 nativeBoot(getLaunchUrl)·linkInstallInvite·appUrlOpen 리스너·inviteCodeLine·초대 창 코드 입력
- js/referral/ui.js — 코드 입력 칸
- js/app-banner.js — captureTouch 가 ?invite= 를 첫 방문 기록에 담고 playReferrer 가 invite= 를 Play referrer 에 싣는다
- functions/invite-link.js + worker/index.js — /i/CODE 302 · AASA application/json
- assets/well-known/ — assetlinks(Play 서명 지문 3개, git 5ff8c9d1) · AASA(YW465H4L6Q.com.cheorish.lab.calmforest, /i/*)
- android AndroidManifest intent-filter autoVerify /i/ · ios App.entitlements associated-domains · @capacitor/app 8.1.2
- tests/invite-link.test.mjs

## 결정
- 사용자: 안드 Install Referrer 자동 + 전 플랫폼 코드 입력 · 설치된 앱 바로 열기도 이번에(2026-11-12)
- 설치 기록 코드는 첫 귀속 읽기(referrerFresh)일 때만 — 매 실행 재연결 방지
- 리뷰 반영: 같은 링크 재전달(최근 앱 복원) 무시 cf_invite_link_seen · 연결 완료 기기는 링크·설치 기록 무시 · 동시 bind 차단
- 리뷰 LOW 미반영: 웹 첫 방문 기록의 invite 는 만료 없음(새 ?invite= 가 덮어씀) — 설계상 허용

## 검증 결과
- npm test 5,290 통과 · build-web 에 .well-known 2개(JSON 유효)
- 웹 모바일(안드 UA): /?invite= → 배너에 코드 줄, Play 링크 referrer 에 invite=ABCD2345
- 안드 에뮬레이터 디버그 APK: /i/WXYZ2345 콜드 스타트 → cf_invite=WXYZ2345 보관 확인 · 켜진 앱 재진입은 네이티브가 appUrlOpen 리스너에 전달(로그) — 에뮬레이터 과부하로 JS 반영은 미확인
- 함정: Capacitor 8 안드 빌드는 JDK 21+ (17 이면 invalid source release: 21) — openjdk-22 사용

## 남은 것
- 문구 검수 완료(그대로 확정)
- Apple 개발자 App ID 에 Associated Domains 기능 켜기(배포 서명 전 필수)
- 배포: 웹 먼저 → 검증(digitalassetlinks API·AASA) → Play·iOS 새 빌드 → 토스·itch
- 보상 판정 시점 문제는 별도
