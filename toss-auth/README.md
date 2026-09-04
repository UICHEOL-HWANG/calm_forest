# toss-auth Worker — 앱인토스 게임 사용자 식별키 → Supabase 세션

앱인토스 웹뷰에서 받은 **게임 사용자 식별키(hash)** 를 Supabase 세션으로 바꿔주는 Cloudflare Worker.
클라이언트 흐름은 `js/supabase-client.js` 의 `signInWithToss()` 참고.

## 왜 토스 로그인(appLogin)이 아닌가

토스 로그인은 사업자 등록을 거친 **'토스로그인 약관 동의'** 가 있어야 쓸 수 있다.
게임 카테고리 미니앱은 `getUserKeyForGame()` 으로 약관 동의도, 유저 동의 화면도 없이
같은 유저에게 항상 같은 hash 를 받을 수 있고, 파트너 서버가 mTLS 로 그 hash 의 진위만
검증하면 된다. (문서: `common/authentication/hash-key`)

```
[웹뷰] getUserKeyForGame() → { type:'HASH', hash }
   └→ POST 이 Worker { anonKey }
        ── mTLS ──→ POST /api-partner/v1/apps-in-toss/users/anon-key/verify
                     헤더 x-anon-key: <hash>  →  { resultType: "SUCCESS" }
        Supabase admin: toss-{sha256(hash)[:32]} 유저 확보(파생 비밀번호)
   ←─ { access_token, refresh_token }  → supabase.auth.setSession()
```

검증 API 는 진위만 알려주고 식별자를 되돌려주지 않는다 — **검증에 통과한 hash 자체가 식별자**다.

## ⚠️ 모든 wrangler 명령에 `-c wrangler.toml` 을 붙일 것

`toss-auth/` 안에서 실행해도 wrangler 가 **저장소 루트의 `wrangler.jsonc`(게임 본체, name=`calmforest`)**
를 집어간다. 그대로 `wrangler secret put` 을 하면 시크릿이 엉뚱하게 게임 본체 Worker 에 등록되고
(출력의 `Creating the secret for the Worker "calmforest"` 로 알아챌 수 있다), `deploy` 는 루트의
커스텀 빌드(`scripts/build-web.mjs`)를 돌리려다 실패한다. 반드시 설정을 명시한다:

```bash
npx wrangler <명령> -c wrangler.toml
```

## 배포 절차

1. **mTLS 인증서 발급** — 앱인토스 콘솔에서 클라이언트 인증서를 발급받는다.
   (현재 인증서: `CN=calmforest` / 발급 Toss appsintoss Root CA / 만료 2027-09-29)
2. **인증서 업로드 + 바인딩**
   ```bash
   wrangler mtls-certificate upload --cert <공개키>.crt --key <개인키>.key --name toss-partner
   # 출력된 certificate_id 를 wrangler.toml 의 mtls_certificates 에 기입
   ```
   ⚠️ 개인키는 저장소에 두지 않는다(업로드 후 로컬 사본 폐기).
3. **시크릿 등록** — 공개값인 `SUPABASE_URL`/`SUPABASE_ANON_KEY` 는 `wrangler.toml` 의 `[vars]` 에
   있으므로 시크릿은 두 개뿐이다.
   ```bash
   wrangler secret put SUPABASE_SERVICE_KEY -c wrangler.toml   # service_role 키(비공개!)
   openssl rand -hex 32 | wrangler secret put TOSS_USER_SECRET -c wrangler.toml
   #   TOSS_USER_SECRET 은 한 번 정하면 불변 — 바꾸면 기존 토스 유저 계정이 전부 끊긴다
   ```
4. **배포 & 연결**
   ```bash
   wrangler deploy -c wrangler.toml
   # 출력된 URL 을 js/config.js 의 TOSS_AUTH_ENDPOINT 에 기입
   ```

## 실측(2026-09-04, 토스앱 5.275.0)

- 웹뷰 번들 오리진: **`https://calmforest.private-web.tossmini.com`** (테스트 번들, 2026-09-04 실측)
  토스 공지(2026-08-25~): `https://calmforest.apps.tossmini.com`(라이브) · `https://calmforest.private-apps.tossmini.com`(테스트)
  → 이 Worker 와 게임 API(worker/index.js) 모두 오리진 무관(`*`)이라 **추가 설정 불필요**. Cloudflare 쪽 요청도 없음.
- UA: `AppsInToss TossApp/5.275.0 TossColorPreference/light TossFontAccessibility/Large`
- 허용 목록 CORS 로는 프리플라이트만 오고 POST 가 막혔음 → 모든 오리진 허용으로 전환 후 통과.
  (`*.toss.im` 이 아니라 `*.tossmini.com` 이었다)

## 참고

- 토스 파트너 API 는 시크릿 헤더가 아니라 **mTLS 로 파트너를 식별**한다(공식 문서).
- Supabase 대시보드에서 Email provider 가 켜져 있어야 파생 비밀번호 로그인이 동작한다
  (합성 이메일 `toss-*@toss.calmforest.local` — 실제 메일 발송 없음, email_confirm 상태로 생성).
- 원본 hash 는 Supabase 에 저장하지 않는다 — `sha256(hash)[:32]` 파생값만 남긴다.
- `getUserKeyForGame()` 은 **토스앱 5.232.0 이상**에서만 동작한다(구버전은 `undefined` 반환).
- hash 는 **토스 계정에 묶인다** — 공식 문서: "같은 미니앱 안에서 동일한 사용자에게 항상 같은 값", "세이브 데이터는 이 사용자 키 기준으로 관리 권장".
  기기 변경 시에도 동일 유지(토스 운영진 Dylan 답변, techchat 스레드 3058) → 재설치도 같은 계정이면 유지.
  바뀌는 경우: 토스 계정 탈퇴 후 재가입, 다른 토스 계정으로 로그인, 다른 미니앱(미니앱별 고유).
