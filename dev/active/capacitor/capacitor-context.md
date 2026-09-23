# 컨텍스트 — TWA → Capacitor 전환

**Last Updated**: 2026-09-23 18:40

## 핵심 파일

| 파일 | 역할 | 전환 시 |
|---|---|---|
| `index.html:1942` | importmap — three 를 unpkg 에서 받는다 | **상대경로로 교체** |
| `js/supabase-client.js:101` | supabase-js 를 esm.sh 에서 동적 import | **상대경로로 교체** |
| `js/supabase-client.js:47` | 기본 OAuth — `redirectTo = 현재 오리진` | 딥링크 대응 필요 |
| `js/supabase-client.js:59~80` | **팝업 OAuth** — `auth-popup.html` + postMessage (itch 대응) | **재활용 후보** |
| `js/platform.js:48` | 토스 SDK esm.sh | 토스 전용, 후순위 |
| `scripts/build-web.mjs` | dist/ 화이트리스트 | `vendor` 추가 · Capacitor `webDir` 소스 |
| `worker/index.js:154` | `Access-Control-Allow-Origin: '*'` | **작업 없음** |
| `sw.js` | offline.html 만 캐시 | Capacitor 에선 불필요 |
| `android/` | 기존 TWA 프로젝트 | **남긴다**(롤백) |

## 결정 사항

- **패키지명·서명 키는 그대로** — `com.cheorish.lab.calmforest`,
  `~/.calmforest-android/android.keystore`(alias `android`). 업로드 키 SHA-256
  `15:39:D4:EA:…:AD:EB`. Play 앱 서명 키 지문 3종은 assetlinks 에 이미 반영됨.
- **기존 TWA 프로젝트를 지우지 않는다** — 전환이 막히면 되돌아갈 경로.
- **CDN 자체 호스팅이 선행 필수** — 이걸 안 하면 Capacitor 로 감싸도 오프라인에서 빈 화면.
- **SW 캐시는 건드리지 않는다** — [[cache-version-cleanup]] 사고 재발 방지 원칙 유지.
  Capacitor 는 앱 자산으로 로드하므로 SW 확대가 필요 없다.
- **OAuth 는 네이티브 SDK** — `@capgo/capacitor-social-login` + `signInWithIdToken`.
  App Links 복귀는 구식 우회로라 폐기. assetlinks 는 남기되 OAuth 에는 쓰지 않는다.

## 함정

- ✅ **OAuth 는 표준 레시피가 있다**(2026-09-16 수정 — 처음엔 최대 난관으로 봤으나 과대평가).
  네이티브 Google Sign-In SDK → ID token → `signInWithIdToken` 이면 WebView 차단이
  애초에 발생하지 않는다. 함정은 nonce(구글=해시본/Supabase=원본)와 SHA-1 3개 등록.
- ⚠️ **three/addons 는 필요한 모듈만 받을 것.** 전부 받으면 번들이 불필요하게 커진다.
  실제 import 를 전수 조사해야 한다.
- ⚠️ `dist/` 에는 `dashboards/`·`beta/`·`guide/` 가 함께 들어간다. 앱 번들에 그대로 넣으면
  APK 가 커지고, 안 넣으면 안내서(`CONFIG.GUIDE_BASE`)가 깨진다 — 안내서는 fetch 주입이라
  **웹 오리진에서 받아오게 두는 편이 안전**하다([[in-game-guide]] 와 같은 처리).
- ⚠️ 토스 빌드(`build-ait.mjs`)는 `index.html` 을 문자열 치환한다. importmap 을 바꿀 때
  앵커가 깨지지 않는지 확인할 것(앵커가 바뀌면 빌드가 실패하도록 되어 있음).

## 전환 근거 요약

업체 요구: "웹앱은 Capacitor 로 패키징해야 통과 가능 / TWA 는 비공개 테스트 참여가
집계되지 않아 반려된다". TWA 는 Chrome Custom Tabs 로 넘겨 **우리 앱의 포그라운드 시간이
0 에 가깝게 잡히는** 구조라 설명이 타당하다. 출처는 테스트 대행 업체 가이드가 주라
공식 문서 근거는 아니지만, 반려 시 14일을 날리는 비용이 전환 비용보다 크다.
빌드 방식을 바꿔도 14일 시계는 초기화되지 않는다.

## 관련 메모리
[[google-play-pwa]] [[cache-version-cleanup]] [[in-game-guide]] [[apps-in-toss-integration]] [[itch-deploy]]
