# 체크리스트 — 구글 플레이 출시

## 사용자 (플레이 콘솔)
- [x] 개발자 계정 생성 · 신원 인증
- [x] Android 10+ 기기로 기기 액세스 검증
- [x] 앱 만들기 — 패키지명 **`com.cheorish.lab.calmforest`** 확정(2026-09-16)
- [ ] ⏳ **AAB 업로드 → 앱 서명 키 SHA-256 지문 전달** ← 지금 여기
- [ ] 스토어 등록정보 · IARC 설문 · 데이터 보안 양식
- [ ] 비공개 테스트 12명 · 14일 → 정식 출시

## 내 작업
- [x] Android SDK + JDK 17 툴체인 설치
- [x] TWA 프로젝트 생성 — `android/`, targetSdk **36** 확인
- [x] 업로드 서명 키 생성 · 안전 보관 (`~/.calmforest-android/`)
- [x] AAB 빌드 · 검증 — `android/app-release-bundle.aab` 1.7MB
      · 업로드 키 SHA-256 `15:39:D4:EA:…:AD:EB` · 라벨 "고요한 숲" · 사용자 권한 0건
- [x] 패키지명 `cloud.calmforest.app` → `com.cheorish.lab.calmforest` 변경·AAB 재빌드(2026-09-16)
- [ ] 🗑️ 계정 삭제 — SQL RPC 작성 완료(`sql/migrate_delete_account.sql`, 미적용)
      · 남은 것: 게임 내 버튼 · 웹 `/delete-account` 페이지 · 사진 선삭제 연동
- [ ] 개인정보처리방침 `/privacy` 작성 · 배포
- [ ] 스토어 스크린샷(폰) · 피처 그래픽 1024×500
- [ ] 스토어 설명문 (짧은 80자 / 자세한)
- [ ] 지문 받아 assetlinks.json 갱신 · 재배포
- [ ] 실기기에서 주소창 안 뜨는지 확인
