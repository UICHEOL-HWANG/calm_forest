# context — Last Updated: 2026-10-20

- 시트: `UTM Source` (시트 ID 는 Worker Secret UTM_SHEET_ID 에만)
  - `Links`: A4:A source, D4:D medium (허용값), 아래쪽 Play 규칙 메모
  - `링크내역`: A 날짜 · B source · C medium · D campaign · E content · F 랜딩 · G 최종 URL · H 메모 · I 짧은 링크(신설)
- 관리자 판정: `_cards-auth.js` getUserId(UID 허용목록 + 비익명) 재사용
- 워크트리 `../calm_forest-utm` 브랜치 feat/utm-link-builder (origin/main d371a26b 기준)
- 로컬 main 은 히스토리 정리 이전 브랜치 — 쓰지 않는다
- 결정: 시트 기록 실패 시 KV 를 지우고 502 (장부 누락 방지)
