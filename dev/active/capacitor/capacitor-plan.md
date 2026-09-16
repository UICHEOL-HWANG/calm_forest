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

### 4. 구글 OAuth — 네이티브 로그인 (표준 레시피)

**2026-09-16 수정**: 처음엔 "가장 까다로움 / 시스템 브라우저 + App Links 복귀"로 적었으나
**과대평가였다.** Capacitor + Supabase 에는 확립된 표준 경로가 있고, 그 경로에서는
WebView OAuth 차단 문제가 **애초에 발생하지 않는다.**

```
@capgo/capacitor-social-login  (대안: @codetrix-studio/capacitor-google-auth)
  → 네이티브 Google Sign-In SDK 가 계정 선택 시트를 띄운다
  → ID token 수신
  → supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })
```

WebView 안에서 구글 로그인 **페이지를 여는 게 아니라** 안드로이드 네이티브 SDK 가
처리하므로 `disallowed_useragent` 가 뜨지 않는다. 브라우저 왕복이 없어 UX 도 더 낫다.

#### ⚠️ 함정 1 — nonce 를 양쪽에 다르게 넘긴다
> "you need to provide a **hashed** version to Google and a **non-hashed** version to `signInWithIdToken`"

구글에는 **SHA-256 해시본**, Supabase 에는 **원본**. 헷갈리면 토큰이 거부된다.

#### ⚠️ 함정 2 — Google Cloud Console 에 Android 클라이언트 등록
패키지명 + **SHA-1 지문**이 필요하다. 하이브리드 서명이라 여기서도 여러 개를 넣어야 한다.

| 지문 | 용도 |
|---|---|
| `39:9F:88:91:53:BB:51:2E:E4:D4:6D:24:74:62:BF:11:A3:87:E3:0C` | 업로드 키 — 로컬 `cap run android` 개발 빌드 |
| `CB:AD:D7:D0:CA:CD:D9:BE:A3:F3:51:EB:FD:ED:7A:25:D8:AB:9A:4F` | Play 앱 서명(deployment) — Android 16 이하 |
| `EF:CD:D5:B5:C5:11:CA:AD:D3:70:80:51:82:5B:F7:89:3B:E5:A3:A0` | Play 앱 서명(hybrid classical) — Android 17+ |

셋 다 등록해야 개발·구형·신형 기기 모두에서 로그인이 된다.
`signInWithIdToken` 의 audience 는 **웹 클라이언트 ID** 를 쓰므로 그것도 함께 넘긴다.

#### 경로 분기
로그인 경로가 이미 넷이다 — 웹(리다이렉트) · 토스 · itch(팝업 `auth-popup.html`) · **앱(신규)**.
`js/platform.js` 에 플랫폼 감지가 이미 있으니 같은 패턴으로 분기를 하나 더 둔다.
게스트(익명) 로그인은 네트워크만 있으면 되므로 영향 없다.

#### 폐기한 대안
- ~~시스템 브라우저(`@capacitor/browser`) + App Links 복귀~~ — 동작은 하지만 구식 우회로다.
  브라우저 왕복이 생기고 딥링크 처리가 늘어난다. 네이티브 SDK 가 있으므로 쓸 이유가 없다.
- assetlinks.json 은 그대로 둔다(해 없음). 다만 OAuth 복귀용으로는 **쓰지 않는다.**

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
