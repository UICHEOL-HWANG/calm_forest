# 🎮 itch.io 배포 — 빌드·업로드·주의점

itch 는 게임 zip 을 받아 `https://html-classic.itch.zone/html/<id>/` 오리진의 **iframe** 안에서 서빙한다.
토스 번들과 같은 이유로 그대로 올리면 `/api/*` 가 전부 404 가 되고, 구글 OAuth 전체 페이지 리다이렉트는 iframe 안에서 막힌다.
그래서 전용 빌드(`scripts/build-itch.mjs`)와 팝업 로그인(`auth-popup.html`)을 둔다.

## 빌드

```bash
npm run build:itch
```

- `dist-itch/` + `dist-itch.zip` 생성(둘 다 .gitignore). index.html 이 zip 루트에 있어야 itch 가 실행한다.
- 빌드가 하는 일: `window.__ITCH__` 플래그 주입(js/platform.js → `'itch'`) · `API_BASE` 를 `https://calmforest.cloud` 로 치환 · 루트 절대경로 파비콘 `<link>` 제거 · zip.
- 안내서(guide)·구글 팝업 복귀 페이지는 번들에 넣지 않고 웹 오리진에서 받아온다(`_headers` 의 `/guide/*` CORS 허용).

## 처음 한 번만 — 웹 쪽 준비 (itch 업로드 전에)

1. **`auth-popup.html` 웹 배포** — `scripts/build-web.mjs` INCLUDE 에 들어 있으니 main 병합 후 `node scripts/build-web.mjs && npx wrangler deploy`.
   `https://calmforest.cloud/auth-popup.html` 이 200 으로 열려야 한다.
2. **Supabase 리다이렉트 허용** — 대시보드 Authentication › URL Configuration › Redirect URLs 에
   `https://calmforest.cloud/auth-popup.html` 추가. 없으면 구글 로그인 뒤 Site URL 로 튕겨서 팝업이 토큰을 못 받는다.
3. (선택) 구글 클라우드 콘솔 OAuth 동의 화면은 바뀔 것 없음 — 리다이렉트는 여전히 Supabase 콜백이다.

## itch 업로드

- 웹 대시보드: 프로젝트 › Uploads › `dist-itch.zip` 올리고 **"This file will be played in the browser"** 체크.
- 또는 butler: `butler push dist-itch <user>/<game>:html`
- Embed 옵션 권장: **Click to launch in fullscreen** 또는 Embed in page + **Fullscreen button** 켜기, **Mobile friendly** 켜기.
  게임이 뷰포트에 맞춰 자체 반응형이라 크기 고정은 필요 없음. SharedArrayBuffer 는 쓰지 않으니 관련 옵션은 끈 채로.

## 로그인 동작

| 플랫폼 | 구글 | 게스트 |
|---|---|---|
| 웹 | 전체 페이지 리다이렉트 | 익명 로그인 |
| 토스 | 없음(토스 식별키) | 폴백 |
| itch | **팝업**(`signInWithGooglePopup`) → `auth-popup.html` 이 토큰을 `postMessage` | 익명 로그인 |

팝업 흐름: 클릭 즉시 `about:blank` 팝업을 동기적으로 연다(차단 방지) → `signInWithOAuth({ skipBrowserRedirect: true })` 로 받은 URL 을 팝업에 넣는다 → 구글 → Supabase → `auth-popup.html` → 해시의 토큰을 opener 에 `postMessage`(targetOrigin 화이트리스트: itch.zone·hwcdn·웹·localhost) → 게임 창이 `origin`·`source` 를 검증하고 `setSession`.

## 알려진 한계

- 활동 기록(📊) 버튼은 itch 에서 숨김 — 대시보드가 웹 오리진 새 탭이라 세션이 안 넘어간다.
- Safari 등은 iframe 저장소를 최상위 사이트별로 분할한다. 세션은 itch.io 안에서만 유지되고 웹(calmforest.cloud)과 공유되지 않는다(같은 구글 계정이면 저장 데이터는 공유됨 — user id 가 같다).
- 로컬 검증: `.claude/launch.json` 의 `calm-forest-itch`(포트 8010, dist-itch 정적 서빙). 구글 팝업 끝까지는 1·2번 완료 뒤에만 실제로 통과한다.
