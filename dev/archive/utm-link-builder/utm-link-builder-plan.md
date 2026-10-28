# UTM 링크 생성기 · 짧은 링크 — 계획

## 목표
매번 Claude 에게 UTM 링크를 부탁하지 않고, 관리자 페이지에서 바로 만들고 구글 시트 `UTM Source` 에 자동 기록한다.

## 구성
- `dashboards/utm.html` + `dashboards/js/admin-utm.js` — 관리자 로그인 후 생성 폼
  - source·medium 은 시트 `Links` 탭 허용값 드롭다운만, campaign·content 는 슬러그(a-z0-9_)
  - 랜딩 다중 선택: 🌐 웹 · 📖 위키 · 📱 Play · 🍎 App Store → 줄마다 짧은 링크
  - 결과 복사 버튼 + QR, 최근 링크 목록과 클릭 수
- `functions/api/_utm.js` — 순수 함수(검증·최종 URL·코드 생성)
- `functions/api/_gsheets.js` — 서비스 계정 JWT(RS256, WebCrypto) → Sheets API
- `functions/api/utm-links.js` — GET(허용값·최근 목록) / POST(생성) · 관리자 UID 만
- `functions/go-redirect.js` — `/go/<code>` 302 + 클릭 수(KV)
- `worker/index.js` 라우트, `wrangler.jsonc` KV `UTM_LINKS` · `UTM_SHEET_ID`

## 최종 URL 규칙 (시트 기존 줄과 동일)
- 웹/위키: `?utm_source=..&utm_medium=..&utm_campaign=..&utm_content=..`
- Play: `&referrer=` + encodeURIComponent(utm 쿼리)
- App Store: `?pt=129595134&ct=<source>_<campaign>[_<content>]&mt=8` (ct ≤ 100자)

## 사용자 몫
- 서비스 계정 JSON 을 `GOOGLE_SA_JSON` Worker Secret 으로 등록
- 시트를 서비스 계정 client_email 에 편집자로 공유
