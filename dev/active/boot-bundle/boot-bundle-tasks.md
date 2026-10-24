# boot-bundle 체크리스트

- [x] 1. scripts/lib/bundle-boot.mjs + 테스트(묶음 생성·인라인 교체·https 외부 유지)
- [x] 1. 4개 빌드 스크립트 마지막 단계에 연결
- [x] 2. three·supabase vendor 묶음 포함, importmap 제거
- [x] 3. _headers /js/b/* immutable
- [x] 리뷰 반영: 옛 청크 404 시 세션당 1회 새로고침(js/stale-chunk-reload.js), i18n 진입점 필수
- [x] npm test 3,858 통과 · 로컬 dist 게스트 입장 스모크
- [x] 웹 배포(2026-10-24 main 79bac2a3) · 운영 측정 JS 250→13, DCL 3.1s→0.84s, load 3.3s→1.36s
- [x] 토스 20261024-176 업로드·테스트푸시 (검수 제출은 사용자 확인 후)
- [x] Play versionCode 104 internal + alpha·production 제출
- [ ] iOS 1.0.15 빌드 36: 아카이브 완료, export 업로드는 Xcode 계정 재로그인 후 → 심사 제출
- [ ] itch dist-itch.zip 업로드(사용자)
- [ ] 10/25 GA4 광고 유입 입구 통과율 전후 비교
- [ ] 4. (보류) i18n-en 지연 로드
