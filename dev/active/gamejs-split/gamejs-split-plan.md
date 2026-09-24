# 📦 game.js 분리 — 계획

승인 범위(2026-09-24): **① 0단계(안전망) + 1단계(데이터 표)**. 사용자 지시 "계획 말고 바로 실행해" — 별도 구현 계획 문서 없이 설계 문서대로 진행.

설계 전문: `docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md`

다음 단계(미승인, 별도 세션):
- 2단계 — 공유 상태 모듈(`js/world-state.js`): scene·player·gameState 등 재대입되는 `let` 을 한 객체로
- 3단계 — 공간별 분리(`js/<기능>/`): 계곡·채집 숲·카페·강·안개 숲·집 실내·바다
- 두 단계 모두 `tools/refactor/` 증명 도구 위에서 돈다(verify-move 는 "원문 동일" 대신 "기계적 치환" 검사로 확장 필요)
