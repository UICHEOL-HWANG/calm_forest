# 체크리스트 — TWA → Capacitor 전환

**상태**: §6 Play Games 자동 로그인 코드 완료·콘솔 설정 대기 (Last Updated 2026-09-25)

> ⚠️ 구 브랜치 `feat/capacitor` 는 다른 세션 커밋(박물관·집 다층화)이 섞여 폐기. vendor 커밋 2개만 cherry-pick 했다.
> ⚠️ `android/` 는 Capacitor 로 **교체**(사용자 결정 2026-09-23, `android-cap/` 안 씀). TWA 복구: `git checkout main -- android`
> ⚠️ DB 에 `platform in ('web','toss','itch')` CHECK 제약(sql/migrations/migrate_struct_04_checks.sql·retention_guidance_scores) — 앱 전용 platform 값을 넣으려면 마이그레이션 먼저. 지금은 앱도 'web' 으로 기록된다.

## 0. 착수 전
- [ ] 업체에 구체적 구성 확인 (Capacitor 버전 · OAuth 처리 방식 · 제출 전 점검 항목)
- [ ] 현재 TWA AAB 로 내부 테스트에 한 번 올려볼지 결정 (지문·assetlinks 검증용, 손해 없음)

## 1. CDN 자체 호스팅 ⭐ 선행 (실현성 실증 완료 2026-09-16)
- [x] `three/addons/` 실제 import 전수 조사 — postprocessing 5개 + 의존 5개 = 10개 파일
- [x] supabase-js 자체 호스팅 방법 확정 — esm.sh 는 531B 스텁이라 불가, **esbuild 번들 217KB** 로 해결(로드·signInWithIdToken 검증)
- [x] `vendor/three/` 에 three.module.js(1.2MB) + addons 10개 배치 (디렉터리 구조 유지)
- [x] `npm i -D esbuild` + `build:vendor` 스크립트, `vendor/supabase.js` 산출물 커밋
- [x] `index.html` importmap 을 상대경로로 (⚠️ build-ait 치환 앵커 확인)
- [x] `js/supabase-client.js:101` 동적 import 경로 교체
- [x] `scripts/build-web.mjs` INCLUDE 에 `vendor` 추가
- [x] 검증(앱 번들 한정): dist-cap 로컬 서빙 → three·supabase 가 vendor 12파일에서 로드, 외부는 GA 만, 콘솔 에러 0 · 웹·토스·itch 3종 빌드 + 테스트 615건 + 네트워크 탭에 외부 CDN 요청 0건

## 2. Capacitor 최소 프로토타입 ★ 성능 판단 게이트
- [ ] OAuth·빌드 정리 없이 그냥 감싸서 실기기 설치
- [ ] **FPS 측정 — Chrome(TWA) 대비 얼마나 떨어지는지**
- [ ] Android 7~9(Chrome WebView)와 10+(System WebView) 각각 확인
- [ ] 프레임이 모자라면 대응부터 — DOM HUD 최적화 · 하드웨어 가속 명시 · 접근성 서비스 영향 확인
      (2차 조사 결과 정황은 우호적 — "느려진다"는 보고는 DOM/CSS UI 문제였고 WebGL 이 아니었다)

## 3. Capacitor 정식 도입
- [ ] 🔴 **localStorage → `@capacitor/preferences` 이관** (안정성 조사에서 나온 최우선 항목)
      · 대상 5키: `DEX_NOTE_KEY`(도감 메모·사용자 작성) `cf_client_id`(분석 연속성) `cf_lang` `cf_music` `PAGE_HINT_KEY`
      · 웹은 localStorage 폴백이라 웹·토스·itch 동작 불변
      · 기존 값 1회 마이그레이션 필요(앱 첫 실행 시 localStorage 에 있으면 옮기고 지운다)
- [x] minSdk 21 → 23 확인 (Android 5 탈락 — 실질 영향 없음)
- [x] Capacitor **8.x** 고정 (targetSdk 36, 우리 TWA 와 일치)
- [x] `@capacitor/cli` · `core` · `android` 설치
- [x] `capacitor.config.json` — appId `com.cheorish.lab.calmforest`, webDir `dist`
- [x] `npx cap add android` → `android/` 교체 · versionCode 2 · TWA 아이콘·스플래시 이식
- [x] 기존 업로드 키로 서명 설정 — ⚠️ 지금 release 에 signingConfig 없음(리뷰 MEDIUM). minifyEnabled 는 Capacitor 기본 false(TWA 는 true) — Java 코드가 거의 없어 false 유지 예정
- [ ] 앱 번들 화이트리스트 결정 — `dashboards/`·`beta/` 제외 여부, 안내서는 웹 오리진 유지
- [x] `.gitignore` 정리 (`android-cap/` 산출물)

- [x] 🛡️ `server.hostname = app.calmforest.cloud` — 기본 오리진 localhost 면 게임의 localhost 전용 개발 훅 6곳(?give·__nightForce·carveDebug·?betaDay·?forceVariant·index.html 미니게임 훅)이 정식 앱에서 열린다(리뷰 HIGH). 테스트로 고정

## 4. 구글 OAuth — 네이티브 로그인
- [x] `@capgo/capacitor-social-login` 설치 (대안: `@codetrix-studio/capacitor-google-auth`)
- [x] Google Cloud Console — Android 클라이언트 생성, SHA-1 **3개** 등록
      · 업로드 `39:9F:88…E3:0C` · deployment `CB:AD:D7…9A:4F` · hybrid `EF:CD:D5…A3:A0`
- [x] 웹 클라이언트 ID 를 `signInWithIdToken` audience 로 전달
- [x] ⚠️ nonce — 구글에 SHA-256 해시본 / Supabase 에 원본
- [x] 🔴 **출시 차단** — 지금 앱에서 구글 버튼을 누르면 WebView 안에서 OAuth 리다이렉트 → `disallowed_useragent`(리뷰 HIGH). `supabase-client.js` signInWithGoogle 에 IS_ANDROID 분기 필요
- [x] `js/platform.js` 패턴으로 앱 경로 분기 추가 (웹·토스·itch·앱 4경로)
- [ ] 게스트 로그인 동작 확인(영향 없을 것으로 예상)

## 4.5 (2026-09-23 추가)
- [x] 📱 perf_sample — android 앱 기기별 FPS(USB 측정 대체). 다음 날 BQ 에서 재검증할 것
- [x] 🔥 Firebase `calmforest-app` Android 앱 등록(google-services.json 커밋)
- [ ] FCM 푸시 · Remote Config+A/B — 계획 먼저(서버·DB·웹 GA ID 전환 수반)
- ⚠️ Android OAuth 클라이언트 3개는 **GCP agriquant**(웹 클라이언트 calm_forest 가 있는 곳)에 만들었다. calm-forest GCP 프로젝트엔 OAuth 없음

## 5. 검증
- [ ] 🏠 사용자 집에서: 내부 테스트 설치 → 구글 로그인 → 마을 이어짐 (AAB ~/Downloads/calmforest-v2-capacitor.aab)
- [ ] 실기기 설치 — `npx cap run android`
- [ ] **비행기 모드에서 게임이 뜨는지** (CDN 자체 호스팅 효과 확인)
- [ ] 구글 로그인 → 저장 → 재실행 이어짐
- [ ] **포그라운드 사용 시간이 우리 앱에 기록되는지** ← 이번 전환의 목적
- [ ] 웹·토스·itch 무영향 재확인

## 5.5 Play 콘솔 (2026-09-23 저녁 기준) — ⏭️ 다음 세션은 여기부터
- [x] 새 앱 `com.cheorish.lab.calmforest` (오타 앱 camforest 는 사용자가 삭제)
- [x] internal 트랙 versionCode 2 업로드(`npm run upload:play`) — 하지만 **앱 미게시라 링크 비활성**
- [x] 앱 설정 11개 + 광고 ID(아니요) + 스토어 등록정보(ko-KR, 스크린샷 8·아이콘·피처) — Aside 로 저장
- [ ] 🔴 **"검토를 위해 앱 전송" 잠김** — 대시보드 필수 단계가 **비공개 테스트 5단계**(국가·테스터·버전·확인·전송). 신규 개인 계정은 이걸 해야 첫 게시가 풀린다
- [ ] 사용자 결정 대기: 테스터 모집 방식(이메일 목록 12명+ vs Google 그룹 — 대행 업체면 보통 그룹)
- [ ] 그다음: `npm run upload:play -- --track alpha` → Aside 로 국가(대한민국)·테스터 연결 → **전송은 사용자 확인 후**
- [ ] OAuth: agriquant `android.calmforest.play` → SHA-1 `2F:7E:FB:…:5F:69:1F`, `play17` → `06:1B:8A:…:B7:F4` 로 교체했는지 사용자 확인 필요
- [ ] (선택) 태블릿 스크린샷·고해상도 폰 스크린샷 — `dashboards/screenshots/` 2880×1620 원본 사용. 현재 폰샷은 PC 화면(WASD 안내 보임)
- [ ] (선택) 런처 이름이 "calm forest" — 콘솔 이름 "고요한숲"과 맞출지 결정(android strings app_name)
- [ ] FCM 푸시 · Remote Config+A/B — 계획 문서 먼저

## 6. 출시
- [ ] AAB 빌드 · 내부 테스트 업로드
- [ ] 비공개 테스트 12명 · 연속 14일
- [ ] 프로덕션 접근 신청

## 6. 📱 Play Games 자동 로그인 (2026-09-25 결정 — 토스 식별키 방식 이식)
> 사용자 결정: 앱은 구글 로그인 버튼 대신 **켜면 조용히 연결**(토스처럼). 안드로이드 대응물 = PGS v2 자동 로그인 + 서버 검증.
> 계획: `~/.claude/plans/partitioned-purring-flask.md`. iOS Game Center·웹 구글 계정 연결은 범위 밖.
- [x] main 병합(a0fd942 나가기 루프 수정 → exit-flag 재사용)
- [x] `js/pgs-native.js` + 테스트 7 · `pgs-auth/` Worker + 테스트 8 (fetch 주입)
- [x] `supabase-client.js` signInWithPlayGames · provider 'pgs' · 게스트 이관 대상에 pgs 포함
- [x] `index.html` 부팅 자동 연결(나가기 직후 건너뜀) · body.platform-android 한 버튼 · 넛지 출구 pgs · GA4 `pgs_connect{mode:auto|button|nudge}`
- [x] 네이티브 `PlayGamesPlugin.java`(로컬 플러그인) · MainActivity 등록 · play-services-games-v2 22.1.0 · APP_ID 비면 SDK 미초기화(크래시 방지)
- [x] ⚠️ 빌드는 **JDK 21+** 필요(Capacitor 8) — `JAVA_HOME=~/Library/Java/JavaVirtualMachines/openjdk-22.0.1/Contents/Home` (corretto-17 은 `invalid source release: 21`)
- [ ] 🧑 **콘솔(사용자)**: Play Games Services 프로젝트 생성 → 프로젝트 ID · Android 사용자 인증 정보(SHA-1 2F:7E:FB…69:1F) · 게임 서버 클라이언트 id/secret · 테스터 추가 또는 구성 게시
- [ ] 값 반영: `games-ids.xml` · `js/config.js` PGS_SERVER_CLIENT_ID · `pgs-auth/wrangler.toml` PGS_CLIENT_ID
- [~] 🧑 시크릿 3종 등록(✅ Worker 배포·PGS_USER_SECRET 2026-09-25, SUPABASE_SERVICE_KEY 사용자 입력 중, PGS_CLIENT_SECRET 콘솔 대기)(`-c wrangler.toml`) → `wrangler deploy` → config.js PGS_AUTH_ENDPOINT → 가짜 코드 curl 401
- [ ] 📝 새 문구 검수(넛지 '🎮 플레이 게임즈…' 4종 + 실패 토스트)
- [ ] versionCode 5 → build:cap → bundleRelease → upload:play internal → 실기기: 무화면 입장 · 재시작 이어짐 · 나가기→바로 플레이하기 · 비행기 모드 게스트
