# 체크리스트 — 구글 플레이 출시

## 사용자 (플레이 콘솔)
- [x] 개발자 계정 생성 · 신원 인증
- [x] Android 10+ 기기로 기기 액세스 검증
- [x] 앱 만들기 — 패키지명 **`com.cheorish.lab.calmforest`** 확정(2026-09-16)
- [x] 앱 서명 키 인증서 3장 확보 — `certificates.zip`(2026-09-16)
- [ ] ⏳ **AAB 업로드 → 내부 테스트 트랙** ← 지금 여기
- [ ] 스토어 등록정보 · IARC 설문 · 데이터 보안 양식
- [ ] 비공개 테스트 12명 · 14일 → 정식 출시

## 내 작업
- [x] Android SDK + JDK 17 툴체인 설치
- [x] TWA 프로젝트 생성 — `android/`, targetSdk **36** 확인
- [x] 업로드 서명 키 생성 · 안전 보관 (`~/.calmforest-android/`)
- [x] AAB 빌드 · 검증 — `android/app-release-bundle.aab` 1.7MB
      · 업로드 키 SHA-256 `15:39:D4:EA:…:AD:EB` · 라벨 "고요한 숲" · 사용자 권한 0건
- [x] 패키지명 `cloud.calmforest.app` → `com.cheorish.lab.calmforest` 변경·AAB 재빌드(2026-09-16)
- [x] 웹 `/privacy` · `/delete-account` 페이지 — 사진 선삭제→RPC 순서까지 구현(`e8c53ed`)
- [x] ☰ 메뉴에 🔒 개인정보 처리방침 · 🗑️ 계정 삭제 항목(2026-09-16 `5863353`)
      · 새 탭 + 팝업차단 폴백 · API_BASE 접두(토스·itch) · GA4 privacy_open·delete_account_open
- [x] `sql/migrate_delete_account.sql` 프로덕션 적용(2026-09-16, 사용자가 콘솔에서 실행)
      · 검증: security definer=true · owner=postgres · 실행권한 authenticated 만(anon 없음)
- [x] 스토어 등록정보 초안 — `docs/STORE_LISTING.md`(설명문·스크린샷 8장 선정·IARC 답안)
- [x] 피처 그래픽 1024×500 — `assets/social/play-feature.png` (`scripts/make-play-feature.mjs`)
- [x] 지문 3종 assetlinks.json 갱신 · 웹 배포(2026-09-16 `5ff8c9d`)
      · deployment `81:72:33…5E:C1` · hybrid classical `18:4F:F5…54:86` · hybrid PQC `17:F9:71…BC:A7`
      · Google digitalassetlinks API 파싱 확인
- [ ] 실기기에서 주소창 안 뜨는지 확인
