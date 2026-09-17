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

#### 실증 결과 (2026-09-16 · scratchpad 에서 실제로 받아 확인)

**three — 번들 불필요, 파일만 받으면 된다**
- `three.module.js` 1.2MB, **자기완결**(외부 import 0건)
- addons 는 실제 사용이 postprocessing 5개뿐. 의존까지 합쳐 **10개 파일**:
  `EffectComposer` `UnrealBloomPass` `OutputPass` `ShaderPass` `RenderPass`
  + `Pass.js` `MaskPass.js` + `shaders/{CopyShader,LuminosityHighPassShader,OutputShader}.js`
- 디렉터리 구조(`three/addons/...`)만 유지하면 상대 import 가 그대로 동작한다

**supabase-js — 단순 다운로드로는 불가능. 번들이 답이다**
- `esm.sh/@supabase/supabase-js@2` 는 **531B 짜리 스텁**이고 실제 코드는 다른 URL 에 있다
- jsDelivr `+esm` 도 12KB 인데 `functions-js`·`postgrest-js` 등을 다시 import 한다
- → **esbuild 번들로 해결**:
  ```
  npm i -D esbuild
  echo "export { createClient } from '@supabase/supabase-js';" > vendor/_entry.js
  npx esbuild vendor/_entry.js --bundle --format=esm --minify --outfile=vendor/supabase.js
  ```
  결과: **217KB · import 문 0 · 동적 import 0.** 남은 URL 3건은 에러 메시지 속 문자열뿐.
  실제 로드 검증: `createClient` 동작, **`signInWithIdToken` 존재**(4단계에서 쓸 함수).

#### 할 일
- [ ] `vendor/three/` — three.module.js + addons 10개 (디렉터리 구조 유지)
- [ ] `vendor/supabase.js` — esbuild 번들. **산출물을 커밋**해 빌드 때 네트워크를 타지 않게
- [ ] `package.json` 에 `build:vendor` 스크립트 + devDep `esbuild`
- [ ] `index.html` importmap 을 상대경로로 (⚠️ build-ait 치환 앵커 확인)
- [ ] `js/supabase-client.js:101` 동적 import 경로 교체
- [ ] `build-web.mjs` INCLUDE 에 `vendor` 추가
- [ ] 토스 SDK 는 토스 번들에서만 쓰므로 후순위(웹·Play 에서는 로드되지 않음)
- [ ] 검증: 3종 빌드 + 테스트 615건 + **네트워크 탭에 외부 CDN 요청 0건**

추가 용량 ~1.5MB. 현재 AAB 1.8MB → 3MB 대로, APK 크기 부담 없음.

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

## WebView 의 WebGL 성능 — 조사 결과 (2026-09-16, 2차 조사로 하향 조정)

처음엔 "최대 리스크"로 올렸으나 **근거를 직접 읽어보니 과했다.** 정황은 오히려 우호적이다.

### "느려진다"는 보고는 WebGL 이 아니었다
근거로 삼았던 Capacitor Discussion #3899 를 열어보니 문제는 **DOM/CSS UI** 였다 —
`ion-slides`, skeleton 로더 애니메이션, 페이지 전환. 원인 중 하나는 **접근성 서비스가
켜져 있으면 접근성 트리가 JS 스레드를 막는 것**이다.
DOM 이 많고 CSS 애니메이션이 많은 앱의 문제이고, **우리 게임은 canvas 하나가 주력이고
DOM 은 HUD 정도**라 구조가 다르다. WebGL 은 GPU 가 하는 일이라 JS 스레드 경합과도 성격이 다르다.

### 우호적인 근거
| 항목 | 확인 내용 |
|---|---|
| 엔진 | WebView 는 **Chrome 과 같은 Chromium 렌더링 엔진** — "rendering should be consistent between the WebView and Chrome" |
| 하드웨어 가속 | WebView 에서 **기본 활성화** |
| three.js 커뮤니티 | "If it runs well in the browser, **it will run well in a webview**(capacitor 예시)" |
| WebGL 블로커 | 보고 없음. 한 사례의 검은 화면은 **잘못된 glTF 모델** 탓이었고 Capacitor 문제가 아니었다 |
| 알려진 WebGL 이슈 | "초기 몇 프레임 janky" 수준 — 지속적 저하가 아니다 |

### 그래도 재야 하는 이유
**공개된 실측 데이터가 없다.** Capacitor 공식 게임 문서도 "broad support for WebGL…
high-performance game experiences" 한 줄이 전부이고 프레임 언급이 없다. three.js 포럼에도
"Capacitor + Three.js 를 실기기에서 재본 사람 없나"는 질문이 답 없이 남아 있다.
Chromium 쪽엔 "WebView 는 Chrome 보다 항상 성능이 떨어진다"는 일반 주장(이슈 1289741)도 있다.

→ **정황 근거는 충분하나 숫자로 증명된 건 없다.** 우리가 직접 잰다.

### 프로토타입 게이트 (성격 조정)
2단계에서 최소 프로토타입으로 실기기 FPS 를 잰다. 다만 **"안 되면 중단"이 아니라 확인 절차**다.
문제가 나와도 손쓸 방법이 있다 — DOM HUD 최적화, 하드웨어 가속 명시, 접근성 서비스 영향 확인.
드로우콜·섀도맵 측정치([[draw-call-optimization]] [[shadow-subspace-optimization]])는
렌더러가 바뀌므로 어차피 한 번 다시 재야 한다.


## 안정성 조사 (2026-09-17, 성능 외 항목 전수)

성능만 보다가 놓칠 뻔한 것들. **여기서 나온 1번이 성능보다 중요하다.**

### 🔴 1. localStorage — 반드시 손봐야 한다
Capacitor 공식 문서가 못 박는다:
> "mobile OSs **may periodically clear data** set in window.localStorage, so this API
> (Preferences) should be used instead"

보고된 증상: **앱을 강제 종료하면 localStorage 가 비워지고**, 기기 저장공간이 부족하면
OS 가 WebView 의 로컬 저장소를 회수한다(Capacitor 이슈 #636, Closed).

우리가 쓰는 키 5개와 유실 시 피해:

| 키 | 용도 | 날아가면 |
|---|---|---|
| `DEX_NOTE_KEY` | **도감 메모** | 🔴 **사용자가 쓴 글이 사라진다** |
| `cf_client_id` | 클라이언트 식별자 | 🟠 분석 연속성 파괴 — 같은 사람이 새 사용자로 잡힌다([[feature-tracking-checklist]] [[churn-intervention-pipeline]] 에 영향) |
| `cf_lang` | 언어 | 🟡 기본값으로 되돌아감 |
| `cf_music` | 배경음악 on/off | 🟡 설정 초기화 |
| `PAGE_HINT_KEY` | 안내 본 적 있는지 | 🟡 안내가 다시 뜸 |

게임 세이브 본체는 Supabase 라 **안전하다**. 그러나 도감 메모는 로컬에만 있고,
`cf_client_id` 유실은 분석을 조용히 오염시킨다(에러가 안 나서 더 위험).

→ **`@capacitor/preferences` 로 이관한다.** 웹에서는 localStorage 로 폴백되므로
   웹·토스·itch 는 동작이 그대로다. 기존 값 마이그레이션(localStorage → Preferences) 1회 필요.

### 🟡 2. minSdk 21 → 23
Capacitor 최소는 **API 23(Android 6)**, 우리 TWA 는 21(Android 5)이라 Android 5 기기가 빠진다.
2026년 점유율이 사실상 0 이고 Three.js 3D 가 그 기기에서 돌 리도 없어 **실질 영향 없음**.

### 🟡 3. targetSdk 가 Capacitor 버전에 묶인다
> "Capacitor Android does not support custom target SDK versions."

| Capacitor | targetSdk |
|---|---|
| 8.x | **36** ← 우리 TWA 와 일치 ✅ |
| 7.x | 35 |

지금은 맞지만, **Play 가 37 을 요구하면 Capacitor 9 를 기다려야 한다.** TWA 처럼 우리가
숫자만 올릴 수 없다. 출시 주기에 외부 의존이 하나 생긴다는 뜻.

### 🟡 4. 백그라운드 오디오
Android WebView 는 백그라운드에서 신뢰성 있게 돌지 않고 Media Session Web API 도 미지원이다.
**게임이라 앱이 내려가면 소리가 꺼지는 게 정상**이므로 문제는 아니다.
다만 복귀 시 AudioContext 가 suspended 로 남을 수 있는데, `js/sound.js` 의 resume 이
pointerdown·keydown·touchstart 에 `once:false` 로 걸려 있어 **첫 입력에 자동 복구된다.**
→ 개선 여지: `visibilitychange` 에도 resume 을 걸면 복귀 직후의 정적이 사라진다(선택).

### 🟢 문제 없는 것
- **사진** — `renderer.domElement.toDataURL()` → 서버 업로드. 파일 다운로드 API 를 안 쓴다
- **CORS** — Worker 가 `Access-Control-Allow-Origin: *`
- **WebGL/Three.js** — 위 성능 절 참고

## 확실한 것 / 아직 모르는 것

**확실**: CDN 자체 호스팅 가능(실증) · Capacitor 에서 Three.js 동작 · 패키지명·서명 키 재사용 ·
기존 `android/` TWA 로 롤백 가능

**미검증**: ① WebView 에서 우리 게임이 몇 FPS 나오는지(정황상 통과 가능성 높음, 실측 공개 데이터가 없어 직접 잰다) ② 네이티브 로그인이
4갈래 로그인 구조(웹·토스·itch·앱)에 깔끔히 붙는지 ③ **이 전환이 실제로 반려를 피하게
해주는지** — 업체 주장은 공식 문서 근거가 아니라 14일 돌려봐야 안다

## 열린 질문
1. 업체가 권하는 구체적 구성(Capacitor 버전·OAuth 처리)을 받아둘 것인가
2. APK 에 `dashboards/`·`beta/` 를 넣을 것인가 (크기 vs 단순함)
3. 오프라인에서 API 가 죽었을 때의 UX — 지금은 저장 실패 안내뿐
