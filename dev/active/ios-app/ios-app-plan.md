# iOS 앱 (Capacitor) — 계획

## 목표
기존 Capacitor 안드로이드 앱(feat/capacitor-app)에 iOS 플랫폼을 더해 App Store 심사를 통과할 수 있는 빌드를 만든다.
Apple Developer Program 결제·Xcode 설치를 기다리는 동안 코드부터 진행한다.

## 설계
- `platform.js`: `'ios'` 추가(`window.__IOS__`), `IS_IOS`, `IS_NATIVE = android || ios`.
  - "네이티브 앱이라서" 분기(결제 숨김·이메일 로그인 차단·게스트 이관·구글 네이티브)는 `IS_NATIVE`.
  - Play Games·안드로이드 전용 플러그인(Photo 공유/저장, perf)은 `IS_ANDROID` 유지 → iOS 는 웹 폴백.
- 로그인(iOS): 🍎 Apple(가이드라인 4.8) + 구글 네이티브 + 게스트. Play Games 버튼(#toss-btn) 숨김, 자동 연결 없음 → 로그인 화면.
  - `js/apple-native.js`: SocialLogin apple → ID 토큰(nonce: 플러그인엔 해시, Supabase 엔 원본).
  - 넛지 출구: iOS 는 Apple.
- 결제: Paddle 상점 `IS_NATIVE` 에서 닫힘(3.1.1).
- 빌드: `build-cap.mjs` 에 타깃 인자(android|ios) → 플래그 주입. `build:cap:ios`.
- DB: platform CHECK 2곳(retention_guidance_scores, star_runs)에 'ios' 추가 — **앱보다 먼저**.
- 계정 삭제: 기존 설정 → /delete-account 링크 유지(5.1.1(v) 충족, 실기기 확인).

## 사용자 몫 (코드 밖)
- Apple Developer 승인, Xcode 설치·xcode-select
- App ID(Sign in with Apple capability), Supabase Apple 공급자(Client IDs=번들 ID)
- GCP iOS OAuth 클라이언트 → CONFIG.GOOGLE_IOS_CLIENT_ID + Info.plist URL scheme
- App Store Connect 등록(스크린샷·개인정보 라벨·등급)

## 🔄 변경(2026-10-11): 로그인 = 게임센터 + Apple (구글 iOS 제외) — 사용자 결정
- 4.8 은 외부 소셜 로그인에만 해당 → 구글을 빼면 Apple 은 필수 아님. 그래도 게임센터를 꺼 둔 유저용으로 Apple 버튼 유지.
- 안드로이드 PGS 구조 복제:
  1. `ios/App/App/GameCenterPlugin.swift` — GKLocalPlayer 자동 인증 + fetchItems(forIdentityVerificationSignature:)
     → { publicKeyUrl, signature, salt, timestamp, teamPlayerID, bundleID }. `MainViewController`(CAPBridgeViewController)에서 registerPluginInstance.
  2. `gc-auth/` Worker — publicKeyUrl 호스트(*.apple.com, https) 검사 → 인증서 DER → SPKI → RSA-SHA256 검증
     (teamPlayerID‖bundleID‖timestamp(u64 BE)‖salt) · bundleID=env · timestamp 신선도 · IP 속도 제한
     → gc-{sha256(teamPlayerID)[:32]}@gc.calmforest.local + HMAC 파생 비밀번호 → 세션.
  3. `js/gc-native.js` + supabase-client `signInWithGameCenter` · account-kind 'gc' · provider 'gc'
  4. index.html: iOS 시작 시 조용히 GC 연결(안드로이드 PGS 자리) → 실패 시 로그인 화면(바로 플레이하기=GC 재시도→게스트, Apple)
  5. 구글 iOS 코드(GOOGLE_IOS_CLIENT_ID·iOSClientId) 제거
- 트래킹: gc_connect{mode,result,reason}(pgs_connect 와 같은 3키), login{method:'gc'}, 넛지 target 'gc'
