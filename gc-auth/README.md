# gc-auth Worker — 게임센터 신원 서명 → Supabase 세션

iOS 앱(Capacitor)이 켜질 때 **게임센터 자동 로그인**으로 받은 신원 서명을 Supabase 세션으로 바꿔주는
Cloudflare Worker. 안드로이드 `pgs-auth/` 와 같은 자리·같은 구조다.
클라이언트 흐름은 `js/supabase-client.js` 의 `signInWithGameCenter()`, 네이티브는
`ios/App/App/GameCenterPlugin.swift`.

```
[앱] GKLocalPlayer 자동 인증 → fetchItems(forIdentityVerificationSignature:)
   └→ POST 이 Worker { publicKeyUrl, signature, salt, timestamp, teamPlayerID, bundleID }
        publicKeyUrl 검사(https · *.apple.com) → 인증서 DER → SPKI → RSA-SHA256 검증
        bundleID == GC_BUNDLE_ID · timestamp 10분 이내
        Supabase admin: gc-{sha256(teamPlayerID)[:32]}@gc.calmforest.local 유저 확보(파생 비밀번호)
   ←─ { access_token, refresh_token }  → supabase.auth.setSession()
```

## ⚠️ 모든 wrangler 명령에 `-c wrangler.toml`

## 배포 절차

1. **App Store Connect → 앱 → Game Center 활성화** (번들 `com.cheorish.lab.calmforest`)
2. **시크릿 등록**
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_KEY -c wrangler.toml
   openssl rand -hex 32 | npx wrangler secret put GC_USER_SECRET -c wrangler.toml   # 불변!
   ```
3. **배포** — `npx wrangler deploy -c wrangler.toml` → URL 을 `js/config.js` 의 `GC_AUTH_ENDPOINT` 에
4. **확인** — 가짜 본문으로 400 이 나오면 경로·시크릿이 살아 있다:
   ```bash
   curl -s -X POST <URL> -H 'Content-Type: application/json' -d '{"teamPlayerID":"x"}'
   # → {"error":"요청 형식 오류"}
   ```
   실패 원인은 `npx wrangler tail calmforest-gc-auth -c wrangler.toml` 의 `gcAuthFail` 로그.

## 테스트

`tests/gc-auth.test.mjs` — openssl 자체 서명 인증서로 서명 검증, fetch 주입으로 Apple·Supabase 를 흉내 낸다.
