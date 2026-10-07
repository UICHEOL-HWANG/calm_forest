# 컨텍스트

Last Updated: 2026-10-07

## 워크트리
`/Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-coin-decor` (브랜치 worktree-halloween-coin-decor, main 9c212a6 기준)

## 핵심 파일
- `js/data/catalog.js` DECOR(l.19)·OUTDOOR(l.180)
- `js/spaces/indoor.js` decorMesh · placeDecor(l.~595) · updateDecorGhost(l.746) · floorHitFromEvent(l.807) · nearestDecor(l.844) · pickDecor(l.861) · floorBaseY(l.64)
- `js/spaces/doors.js` updateDoorInteract(근접 링·프롬프트)
- `js/game.js` outdoorMesh(l.4983) · placeOutdoor(l.5131)
- `js/shop/sale-window.js` SALE_WINDOWS · saleOpen · saleTagOf / `js/shop/premium-row.js`
- `index.html` renderDecorItems(l.4311) · renderOutdoor(l.4411)
- 참고 커밋(미병합): `e93a8a1` on `feat/capacitor` — 탁상 올려놓기 원본

## 결정 (사용자 확정 2026-10-07)
- 탁상 올려놓기를 이번에 main 에 이식·개선(다층 대응 · 순수 모듈 `js/house/surface.js` · 천장 규칙 테스트)
- 가격 B안: 실내 150/200/450 · 야외 200/280/500
- 기간 밖은 목록에서 숨김, 보관분은 계속 표시 + 신규 구매 가드
- 유령 촛불 = 탁상 소품, 미니 묘비 = 바닥 소품
- 호박 계열 제외 · 배포는 사용자 지시 시에만

## 분석 근거
Supabase 2026-10-07: 14일 저장 326건 보유 중앙값 10/p75 165, 30일 획득 비게스트 p50 57/p75 187, 활동일당 p50 20/p75 61, 700↑ 5/107명.

## 의존·함정
- 메모리: indoor-decor-v2(천장 3·0.2+(top.y+h)*1.5<3), lowpoly-surface-pitfalls, house-redesign, worktree-pitfalls(preview 는 루트), push-secret-scan(PUBLIC)
- `git commit` 과 `grep -n` 한 명령에 섞지 않기(ECC 훅 오탐)
- 워크트리 세션은 git 명령을 복합(&&)으로 묶으면 거부된다 — 한 줄씩
- 이름·설명 문구는 코드 전에 후보 검수(ui-copy-review-first)
