# 🚀 calm forest 연동 & 배포 가이드

오프라인 폴백 상태를 "실제 온라인"으로 바꾸고 웹에 올리는 전체 순서입니다.
아래 3단계만 따라 하면 됩니다: **Supabase 연결 → GA4 켜기 → GitHub Pages 배포**.

---

## 1. Supabase 연결 (저장 + 로그 전송 켜기)

1. https://supabase.com 에서 프로젝트 생성 (무료 플랜 OK).
2. 좌측 **SQL Editor → New query** 에 `sql/supabase_setup.sql` 내용을 통째로 붙여넣고 **Run**.
   (관리자 대시보드까지 쓰려면 `sql/admin_analytics.sql` 도 실행)
   → `game_saves`, `game_logs` 테이블 + RLS + 분석 뷰가 만들어집니다.
3. **구글 로그인 설정** (Authentication → Providers → **Google** 켜기):
   - Google Cloud Console → **API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID(웹)** 생성
   - **승인된 리디렉션 URI** 에 아래를 추가:
     `https://zuyxgjfihxtfdpolljzw.supabase.co/auth/v1/callback`
   - 발급된 **클라이언트 ID/보안 비밀** 을 Supabase Google provider 칸에 붙여넣고 저장
   - Supabase **Authentication → URL Configuration → Site URL / Redirect URLs** 에
     게임 주소(예: `http://localhost:8000`, 배포 후 `https://<아이디>.github.io/calm-forest/`)를 추가
   - (선택) 게스트 폴백까지 쓰려면 **Anonymous sign-ins** 도 켜기
4. **Settings → API** 에서 anon key를 복사해 `js/config.js` 에 붙여넣기 (URL은 이미 채워져 있음):

   ```js
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',             // anon public key만 넣으면 됨
   ```

5. 새로고침하면 **로그인 화면**이 뜹니다. **Google로 로그인** → 계정 선택 → 게임 복귀 시
   좌측 상단에 계정 이메일 + 초록 점(온라인)이 보이면 성공. 💾 저장이 실제 DB에 upsert 되고,
   1.5초마다 `game_logs`에 센서 배치가 쌓입니다. (키 없으면 "게스트로 둘러보기"만 가능)

> anon key는 브라우저에 공개돼도 되는 키입니다(RLS로 본인 데이터만 접근). service_role 키는 절대 프론트에 넣지 마세요.

---

## 2. GA4 트래킹 켜기 (선택)

1. https://analytics.google.com → 관리 → 데이터 스트림 → 웹 스트림 생성 → **측정 ID**(G-XXXXXXXXXX) 복사.
2. `js/config.js` 에 넣기 (끝! HTML은 손댈 것 없음 — `analytics.js`가 gtag를 자동 로딩):
   ```js
   GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX',
   ```
3. GA4 **실시간 보고서**에서 `login`, `first_chop`, `harvest_crop`, `house_complete`, `quest_complete` 이벤트가 뜨는지 확인.
   자세한 탐색/퍼널 구성은 `docs/GA4_GUIDE.md` 참고.

---

## 3. GitHub Pages 배포 (GitHub Actions 자동 배포)

`.github/workflows/deploy.yml` 이 포함돼 있어 **main에 push하면 자동 배포**됩니다.

1. 저장소 만들고 push:
   ```bash
   cd /Users/uicheol_hwang/calm_forest
   git init
   git add .
   git commit -m "calm forest"
   git branch -M main
   git remote add origin https://github.com/<본인아이디>/calm-forest.git
   git push -u origin main
   ```
2. GitHub 저장소 → **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 변경 (한 번만).
3. 이후 main에 push할 때마다 **Actions 탭**에서 배포가 돌고, 끝나면
   `https://<본인아이디>.github.io/calm-forest/` 로 접속.

> **비밀값 주의**: `.env`(DB 비밀번호)는 `.gitignore`로 제외되어 커밋·배포되지 않습니다.
> `config.js`의 Supabase URL / publishable key / GA4 ID는 공개돼도 되는 값이라 그대로 배포됩니다.
> 커밋조차 하기 싫다면 workflow의 "Inject config (optional)" 블록을 켜고 저장소 Variables에서 주입하세요.

> 파일 경로가 전부 상대경로라 서브폴더 배포도 그대로 동작합니다.
> Jekyll 처리가 필요 없으니, 혹시 파일이 무시되면 빈 파일 `.nojekyll` 를 루트에 추가하세요.

---

## 배포 후 체크리스트

- [ ] 좌측 상단 로그인 점 초록색(온라인)
- [ ] 💾 저장 → 새로고침 → 인벤토리/집/밭 복원됨
- [ ] Supabase **Table Editor → game_logs** 에 행이 쌓임
- [ ] GA4 실시간에 이벤트 표시
- [ ] `dashboards/analytics.html` 열어서 히트맵/세션 차트 표시 (아래 참고)

## 데이터 분석 대시보드

배포 주소 뒤에 `/dashboards/analytics.html` 로 접속하면 본인 `game_logs` 로 이동 히트맵·세션 지표를,
`/dashboards/admin_analytics.html` 로는 관리자 전체통계를 볼 수 있습니다. (Supabase 로그인 필요)
