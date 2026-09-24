# 📦 game.js 분리 — 체크리스트

- [x] 설계 문서
- [x] 안전망: analyze · move-decls · verify-move · smoke · smoke-diff
- [x] 베이스라인(원본 5회, 고정 시드)
- [x] 이동 + verify-move a~h 통과 · 일부러 넣은 파손 3종 검출 확인
- [x] npm test 993/993 · i18n 빠짐 후보 목록 동일
- [x] 스모크: 원본 고정값 297개 이동 후 4회 동일 · 메시 수 동일 · 새 에러 0
- [x] build-web · build-itch 에 js/data 포함 확인
- [x] code-reviewer — APPROVE(CRITICAL·HIGH 0, MEDIUM 분석기 주석 반영)
- [ ] main 병합 → 병합 직전 verify-move 재실행
- [ ] 배포: 웹 → 토스 bundle_upload(memo) → itch zip (공지 없음 — 플레이어 변화 없음)

## 2·3단계 — 공간별 모듈 추출 (2026-09-25, 브랜치 refactor/gamejs-spaces)
설계: docs/superpowers/specs/2026-09-25-gamejs-split-phase2-design.md
- [ ] extract-module.mjs(순환 import + $w) · verify-extract.mjs(a~h) · 일부러 넣은 파손 검출 확인
- [ ] 기준 스모크(원본 main 5회)
- [ ] 반딧불 계곡 → 채집 숲 → 강 → 안개 숲 → 카페 → 집(건축) → 집 실내·꾸미기 → 과수원 → …
- [ ] 구역마다: npm test · verify-extract · smoke · 커밋
- [ ] code-reviewer · 아침에 사용자 승인 → main 병합 → 3곳 배포
