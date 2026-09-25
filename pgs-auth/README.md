# pgs-auth Worker — Play Games authCode → Supabase 세션

구글 플레이 앱(Capacitor)이 켜질 때 **Play Games v2 자동 로그인**으로 받은 1회용 authCode 를
Supabase 세션으로 바꿔주는 Cloudflare Worker. 토스 식별키 Worker(`toss-auth/`)와 같은 자리·같은 구조다.
클라이언트 흐름은 `js/supabase-client.js` 의 `signInWithPlayGames()`, 네이티브는
`android/app/src/main/java/com/cheorish/lab/calmforest/PlayGamesPlugin.java`.

```
[앱] PGS v2 자동 로그인 → requestServerSideAccess(게임 서버 클라이언트 ID) → authCode
   └→ POST 이 Worker { authCode }
        → POST oauth2.googleapis.com/token (client_id·secret·code, redirect_uri="")
        → GET  games.googleapis.com/games/v1/players/me → { id: playerId }
        Supabase admin: pgs-{sha256(playerId)[:32]} 유저 확보(파생 비밀번호, user_metadata.pgs=true)
   ←─ { access_token, refresh_token }  → supabase.auth.setSession()
```

authCode 는 1회용이고 구글이 발급한 access_token 으로만 playerId 를 얻으므로 위조할 수 없다.
원본 playerId 는 Supabase 에 저장하지 않는다(해시 파생값만).

## ⚠️ 모든 wrangler 명령에 `-c wrangler.toml`

`pgs-auth/` 안에서도 wrangler 가 저장소 루트의 `wrangler.jsonc`(게임 본체)를 집어간다(toss-auth 와 같은 함정).

## 배포 절차

1. **Play Console → Play Games Services → 설정 및 관리 → 구성**
   - 게임 프로젝트 생성 → **프로젝트 ID**(숫자)를 `android/app/src/main/res/values/games-ids.xml` 에
   - 사용자 인증 정보 **Android**: 패키지 `com.cheorish.lab.calmforest` + 앱 서명 키 SHA-1
     (`2F:7E:FB:85:01:E2:B8:E1:DC:82:1D:8B:05:9B:0C:BF:01:5F:69:1F`). 로컬 설치 테스트를 하려면 업로드 키 SHA-1 도.
   - 사용자 인증 정보 **게임 서버**: OAuth 웹 클라이언트 → client_id 는 `wrangler.toml` `PGS_CLIENT_ID`·`js/config.js` `PGS_SERVER_CLIENT_ID`, secret 은 아래 시크릿
   - ⚠️ 구성을 **게시하기 전엔 '테스터'로 등록한 계정만** 로그인된다 — 비공개 테스트 테스터를 여기에도 추가하거나 구성을 게시할 것
2. **시크릿 등록**
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_KEY -c wrangler.toml
   npx wrangler secret put PGS_CLIENT_SECRET -c wrangler.toml
   openssl rand -hex 32 | npx wrangler secret put PGS_USER_SECRET -c wrangler.toml   # 불변!
   ```
3. **배포** — `npx wrangler deploy -c wrangler.toml` → URL 을 `js/config.js` 의 `PGS_AUTH_ENDPOINT` 에
4. **확인** — 가짜 코드로 401 이 나오면 경로·시크릿이 살아 있다:
   ```bash
   curl -s -X POST <URL> -H 'Content-Type: application/json' -d '{"authCode":"fake"}'
   # → {"error":"authCode 교환 실패 HTTP 400 ... invalid_grant ..."}
   ```
   실패 원인은 `npx wrangler tail calmforest-pgs-auth -c wrangler.toml` 의 `pgsAuthFail` 로그.

## 테스트

`tests/pgs-auth.test.mjs` — fetch 주입(`worker.handle(req, env, { fetch })`)으로 구글·Supabase 를 흉내 낸다.
