# 계획 — TWA → Capacitor 전환

**작성**: 2026-09-16 · **상태**: 계획 승인 대기 (구현 미착수)

## 왜 바꾸나

테스트 대행 업체가 "웹앱은 Capacitor 로 패키징해야 통과 가능"이라고 요구했다.
추가 설명은 **"TWA 는 비공개 테스트 참여가 집계되지 않아 '테스트에 참여하지 않았다'로
반려되는 경우가 대부분"**.

메커니즘은 기술적으로 타당하다 — TWA 의 `LauncherActivity` 는 앱이 뜨자마자 Chrome
Custom Tabs 로 넘긴다. 테스터가 한 시간을 플레이해도 **우리 앱 프로세스의 포그라운드
시간은 거의 0** 이고, 활동은 전부 Chrome 에 기록된다. Play 눈에는 "설치만 하고 아무도
안 쓴 앱"이라 프로덕션 접근 신청이 참여 부족으로 반려된다.
Capacitor·WebView 는 **우리 앱 프로세스 안에서** WebView 가 돌아 그 시간이 우리 앱에 잡힌다.

### 근거의 성격 (정직하게)
- 출처는 대부분 테스트 대행 업체 가이드(testerscommunity · 12Testers14Days · primetestlab)로
  **이해관계가 있다.** 구글 공식 문서에 명시된 내용은 아니다.
- 다만 세 곳이 독립적으로 같은 메커니즘을 설명하고, 구글 개발자 커뮤니티에도 같은 증상
  스레드("My TWA app keeps on getting rejected after closed testing")가 있다.
- **결정은 비용 구조로 한다**: TWA 로 밀어붙였다 반려되면 14일을 통째로 날린다.
  전환 비용보다 훨씬 비싸다.
- 빌드 방식을 바꿔도 **14일 시계는 초기화되지 않는다** — 지금 전환해도 손해가 없다.

## 바뀌는 것 / 안 바뀌는 것

| | 그대로 | 바뀜 |
|---|---|---|
| 패키지명 | `com.cheorish.lab.calmforest` | — |
| 업로드 서명 키 | `~/.calmforest-android/android.keystore` | — |
| 앱 서명 키(Play 생성) | 지문 3종 그대로 | — |
| 웹 배포(calmforest.cloud) | 영향 없음 | — |
| 토스·itch 번들 | 영향 없음 | — |
| 콘텐츠 위치 | | 원격 URL → **앱에 번들** |
| 렌더러 | | Chrome Custom Tabs → System WebView |
| assetlinks.json | 남겨 둔다(해 없음) | 역할이 도메인 증명 → **App Links 딥링크** 로 바뀜 |

## 단계

### 1. CDN 자체 호스팅 ⭐ 선행 필수
현재 핵심 라이브러리가 전부 외부 CDN 이다.
```
three@0.160.0          → unpkg.com          (index.html importmap)
@supabase/supabase-js  → esm.sh             (js/supabase-client.js)
@apps-in-toss/web-framework → esm.sh        (js/platform.js · 토스 전용)
```
**Capacitor 로 감싸도 이걸 두면 오프라인에서 빈 화면이다** — 앱에 웹 파일을 넣어봤자
정작 Three.js 를 네트워크로 받으러 가기 때문. TWA 로 가든 말든 어차피 해야 하는 숙제다
([[google-play-pwa]] 에 "미완"으로 기록돼 있던 항목).

- `vendor/` 에 three.module.js · three/addons 필요분 · supabase-js 를 받아 커밋
- `index.html` importmap 을 상대경로로
- 토스 SDK 는 토스 번들에서만 쓰므로 후순위(웹·Play 에서는 로드되지 않음)
- `build-web.mjs` INCLUDE 에 `vendor` 추가
- ⚠️ three/addons 는 필요한 모듈만 — 전부 받으면 번들이 커진다. 실제 import 를 전수 조사할 것

### 2. 서비스워커 캐시 범위 (선택)
`sw.js` 는 `offline.html` 하나만 캐시한다. 게임 코드는 **의도적으로** 캐시하지 않는다
([[cache-version-cleanup]] 사고 재발 방지). Capacitor 는 앱 자산으로 로드하므로
**SW 캐시 확대는 불필요하다** — 웹 쪽 오프라인을 개선하고 싶을 때만 별건으로 다룬다.

### 3. Capacitor 도입
- `npm i -D @capacitor/cli @capacitor/core @capacitor/android`
- `capacitor.config.json` — `webDir` 를 `dist`(build-web 산출물)로, `appId` 는 기존 패키지명
- `npx cap add android` → `android-cap/` (기존 `android/` TWA 는 **지우지 말고 남긴다** — 롤백용)
- 기존 업로드 키로 서명하도록 `signingConfig` 설정
- ⚠️ `dist/` 에는 `dashboards/` · `beta/` 등 앱에 불필요한 것도 들어간다.
  앱 번들용 화이트리스트를 따로 둘지 검토(APK 크기)

### 4. 구글 OAuth 재설계 ⚠️ 가장 까다로움
구글은 **WebView 안에서의 OAuth 를 차단한다**(`disallowed_useragent`). 시스템 브라우저로
열고 앱으로 돌아와야 한다.

**유리한 점**: 팝업 로그인 경로가 이미 있다 — `auth-popup.html` + `postMessage`
(itch.io iframe 대응으로 만들어 둔 것, `js/supabase-client.js`). 구조를 재활용할 수 있다.

방향 두 가지:
- **A. `@capacitor/browser` + App Links** — 시스템 브라우저(Custom Tabs)로 구글 로그인 →
  `https://calmforest.cloud/auth-callback` 로 리다이렉트 → **오늘 넣은 assetlinks 덕분에**
  앱이 그 URL 을 가로챈다 → 토큰 전달. assetlinks 가 여기서 다시 쓸모를 얻는다.
- **B. 커스텀 스킴 딥링크** — `com.cheorish.lab.calmforest://auth` 로 돌아오게. 단순하지만
  Supabase 리다이렉트 허용 목록에 스킴을 등록해야 하고 웹과 경로가 갈린다.

→ **A 안 우선 검토.** 웹/토스/itch 와 리다이렉트 URL 을 공유할 수 있다.
게스트(익명) 로그인은 네트워크만 있으면 되므로 영향 없다.

### 5. CORS·네트워크
- Worker 는 `Access-Control-Allow-Origin: '*'` 라 **오리진 추가 작업이 없다**(확인 완료)
- Supabase 는 Auth 리다이렉트 허용 목록에만 새 URL 추가 필요
- Capacitor 기본 오리진은 `https://localhost` — 혼합 콘텐츠 이슈 없음(API 가 전부 https)

### 6. 검증
- `npx cap run android` 로 실기기 설치 → 오프라인(비행기 모드)에서 게임이 뜨는지
- 구글 로그인 → 저장 → 재실행 시 이어지는지
- **포그라운드 사용 시간이 우리 앱에 잡히는지** (이번 전환의 목적)
- 기존 테스트 615건 유지 + 웹/토스/itch 빌드 무영향 확인

## 하지 않을 것
- 기존 `android/` TWA 프로젝트 삭제 — 롤백 경로로 남긴다
- 웹 배포 방식 변경 — calmforest.cloud 는 그대로
- 토스·itch 번들 구조 변경
- React Native 재작성 — 이미 기각([[google-play-pwa]])

## 열린 질문
1. 업체가 권하는 구체적 구성(Capacitor 버전·OAuth 처리)을 받아둘 것인가
2. APK 에 `dashboards/`·`beta/` 를 넣을 것인가 (크기 vs 단순함)
3. 오프라인에서 API 가 죽었을 때의 UX — 지금은 저장 실패 안내뿐
