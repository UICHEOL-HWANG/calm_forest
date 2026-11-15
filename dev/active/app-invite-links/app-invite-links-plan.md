# 앱 초대 링크 — 플랫폼별로 초대가 끝까지 이어지게

## Context
2026-11-12 점검: 친구 추천 출시(10/9) 후 연결 0·보상 0. 서버 보상 로직은 정상(`referrals_selftest.py --live` 27/27).
토스만 `intoss://` 링크, 웹·itch·안드로이드·iOS 는 같은 웹 링크. 네이티브 앱엔 딥링크·설치 시 코드 전달이 없어 앱으로 온 친구는 연결 불가.

사용자 결정(2026-11-12): ① 안드로이드 Install Referrer 자동 + 모든 플랫폼 "초대 코드 입력" ② 설치된 앱 바로 열기(App Links·Universal Links)도 이번에.

## 링크 설계
| 보내는 곳 | 링크 | 받는 쪽 |
|---|---|---|
| 토스 | 그대로 `intoss://calmforest?invite=` 공유 링크 | 토스 앱 |
| 웹·itch·안드로이드·iOS | `https://calmforest.cloud/i/CODE` | 앱 설치됨 → OS 가 앱을 엶 · 없음 → Worker 302 `/?invite=CODE` |

웹 랜딩의 스토어 버튼: 안드로이드는 Play referrer 에 `invite=CODE` · iOS 는 배너에 코드 표시 → 앱에서 입력.

## 변경
- `js/referral/rules.js`: inviteUrl → `/i/CODE` · readInviteParam 이 `/i/CODE` 경로도 읽음 · inviteFromReferrer(raw) · 문구 추가(검수 후)
- `js/app-banner.js` playReferrer(touch, medium, invite) → invite 있으면 `invite=CODE`(값마다 인코딩 유지) · storeUrl·login-store·functions/app-link.js 가 넘김
- `js/referral/index.js`: 네이티브 memo.nativeBoot(App.getLaunchUrl + 안드 설치 귀속 raw) · appUrlOpen 리스너(켜진 앱 재진입 → 보관·로그인이면 즉시 bind) · referralOnPlay 가 기다림
- `js/referral/flow.js`: bindWithCode() 추출(수동 입력·앱 링크 공용)
- `js/referral/ui.js`: 코드 입력 칸(로그인·가입 72h 이내·이 기기 미연결)
- 로그인 화면 초대 배너: 모바일+스토어 열린 OS 면 코드 한 줄
- `js/install-referrer-boot.js`: 귀속 약속 export
- `worker/index.js` + `functions/invite-link.js`: `/i/:code` 302
- `.well-known/assetlinks.json`(git 5ff8c9d1 지문 3개 복원) · `.well-known/apple-app-site-association`(YW465H4L6Q.com.cheorish.lab.calmforest, `/i/*`, application/json) · build-web 복사 · serve.py 별칭
- Android: MainActivity intent-filter autoVerify https calmforest.cloud pathPrefix /i/ · `@capacitor/app` + cap sync
- iOS: entitlements associated-domains applinks:calmforest.cloud · App ID 기능 켜기(ASC API, 실패 시 사용자) · `@capacitor/app` + cap sync

## 문구 후보(구현 전 검수)
입력 칸 제목 "친구에게 초대받았나요?" · 안내 "초대 코드 8자리를 넣어 주세요" · 버튼 "확인" · 이미 연결 "이미 친구와 연결되어 있어요" · 배너 덧붙임 "초대 코드 {CODE} · 앱에서 입력해도 받을 수 있어요"

## 하지 않는 것
보상 판정 시점 문제(초대자 접속 시만·8일·session_logs 7일) · 토스 링크 · itch 전용 링크

## 테스트(먼저)
referral-rules(/i/ 생성·파싱·referrer) · app-banner referrer invite · referral-flow bindWithCode·덮어쓰기 금지 · ui 입력 칸 조건 · invite-link(Worker 302·405·.well-known 산출물·지문 3개·Manifest·entitlements 원문)

## 검증
npm test · build-web · 미리보기(모바일 UA `/?invite=`) · Worker 단위 테스트 · 안드 adb VIEW(기기 있으면) · iOS simctl openurl(AASA 배포 후) · 코드·보안 리뷰

## 배포(별도 승인)
웹 먼저(.well-known) → Play·iOS 새 빌드 → 토스·itch 동시. deploy-checklist 5곳.
