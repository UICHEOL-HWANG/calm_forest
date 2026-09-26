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
- [x] 🛶 강(9a946da) · 🌫️ 안개 숲(a49ba5d) · 집 건축(8ebbce0) — 기준 9d54d68 로 다시 잼(k-base 4회, 고정값 577) · game.js 14,463 → 12,914줄 (2026-09-26)
- [x] 도구: verify-extract 가 기준 커밋의 js/spaces 까지 기준에 넣음(3e304f3) · 닉네임 잡음(cfda40d) · extract-module 공용 이름 남김(woodMat)
- [x] 바다터 뒤 4,100줄에 구역 머리말 11개(주석만, b2b5035) → 22구역 일괄 이동(sea … npc, d52eaa1~eed8ed8) — game.js 12,913 → 6,933줄 · spaces 28개
- [x] i18n_check 가 js/spaces 를 읽게(7345d94) — 누락 90건 집합 원본과 동일
- [x] 흐름 점검 tools/refactor/flows.mjs — 프롤로그·요리·조각·상점·선물·밭일·낚시·배·안개·건축·실내·야외·밤손님·서리·바다·사진 33단계 원본과 차이 0 · 에러 0
- [x] code-reviewer 2회 APPROVE(CRITICAL·HIGH·MEDIUM 0, 앞 회차 MEDIUM 반영)
- [ ] 남은 game.js(6,933줄): 진입점·렌더러·월드 구성·입력·메인 루프·UI 유틸 — 분리 대상 아님(설계상 뼈대)
- [x] (옛 순서) 다음: 강 → 안개 숲 → 집(건축) → 집 실내·꾸미기 → 밤손님 → 날씨 이벤트 → 낚시 → 농사 계열 → 파티클 → NPC (진입점·렌더러·메인 루프는 남긴다)
      이어서: 원본 스냅샷 서버(8881) + 워크트리 서버(8882) 띄우고 `tools/refactor/step.sh <이름> "<시작>" "<끝>" 9d54d68 8882 k-base-` (기준 스냅샷 = git archive 9d54d68, main 이 바뀌면 다시 잴 것)
- [x] 구역마다: npm test · verify-extract · smoke · 커밋
- [ ] code-reviewer · 아침에 사용자 승인 → main 병합 → 3곳 배포
