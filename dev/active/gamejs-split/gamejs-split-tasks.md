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
- [x] extract-module.mjs(순환 import + $w · game.js 선언 원문 보존 + 끝 export 목록) · verify-extract.mjs(a~h) · 파손 3종 검출 확인
- [x] 기준 스모크 — 원본 스냅샷(21453dd)을 스크래치에서 서빙, 2개 동시 4회(k-base-*)
- [x] 반딧불 계곡(13f48bc) · 채집 숲(c09b5f7) · 카페(7ae9ba5) — game.js 15,995 → 14,459줄
- [ ] 다음: 강 → 안개 숲 → 집(건축) → 집 실내·꾸미기 → 밤손님 → 날씨 이벤트 → 낚시 → 농사 계열 → 파티클 → NPC (진입점·렌더러·메인 루프는 남긴다)
      이어서: 원본 스냅샷 서버(8881) + 워크트리 서버(8882) 띄우고 `tools/refactor/step.sh <이름> "<시작>" "<끝>" 21453dd 8882 k-base-`
- [ ] 구역마다: npm test · verify-extract · smoke · 커밋
- [ ] code-reviewer · 아침에 사용자 승인 → main 병합 → 3곳 배포
