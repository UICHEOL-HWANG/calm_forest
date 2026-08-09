# toss-auth Worker — 토스 로그인 → Supabase 세션 교환

앱인토스 웹뷰의 `appLogin()` 인가코드를 Supabase 세션으로 바꿔주는 Cloudflare Worker.
클라이언트 흐름은 `js/supabase-client.js` 의 `signInWithToss()` 참고.

```
[웹뷰] appLogin() → authorizationCode
   └→ POST 이 Worker  ── mTLS ──→ 토스 generate-token → accessToken
                                   토스 login-me      → userKey
       Supabase admin: toss-{userKey} 유저 확보(파생 비밀번호)
   ←─ { access_token, refresh_token }  → supabase.auth.setSession()
```

## 배포 절차

1. **mTLS 인증서 발급** — 앱인토스 콘솔(토스 로그인 문서의 "mTLS 인증서 발급 방법" 참조)에서
   클라이언트 인증서(cert.pem / key.pem)를 발급받는다.
2. **인증서 업로드 + 바인딩**
   ```bash
   wrangler mtls-certificate upload --cert cert.pem --key key.pem --name toss-partner
   # 출력된 certificate_id 를 wrangler.toml 의 mtls_certificates 에 기입(주석 해제)
   ```
3. **시크릿 등록** (toss-auth/ 디렉터리에서)
   ```bash
   wrangler secret put SUPABASE_URL          # https://<프로젝트>.supabase.co
   wrangler secret put SUPABASE_ANON_KEY     # publishable 키
   wrangler secret put SUPABASE_SERVICE_KEY  # service_role 키(비공개!)
   wrangler secret put TOSS_USER_SECRET      # 긴 랜덤 문자열 — 한 번 정하면 불변(변경 시 토스 유저 로그인 전부 무효)
   ```
4. **배포 & 연결**
   ```bash
   wrangler deploy
   # 출력된 URL 을 js/config.js 의 TOSS_AUTH_ENDPOINT 에 기입
   ```

## 참고

- 토스 파트너 API 는 시크릿 헤더가 아니라 **mTLS 로 파트너를 식별**한다(공식 문서).
- Supabase 대시보드에서 Email provider 가 켜져 있어야 파생 비밀번호 로그인이 동작한다
  (합성 이메일 `toss-*@toss.calmforest.local` — 실제 메일 발송 없음, email_confirm 상태로 생성).
- 응답 스키마(accessToken/userKey 래핑 여부)는 샌드박스 첫 호출 때 실물로 확인할 것
  — 코드가 `x` / `success.x` 두 형태를 모두 처리하지만 실제 스키마 확정 후 정리 권장.
