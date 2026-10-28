# 이웃 마을 신고·차단 (App Store 가이드라인 1.2) — 계획

배경: iOS 1.0.0 심사 2.1 정보요청 — UGC 가 있으면 "신고·차단 기능"을 녹화로 보여 달라. 이웃 마을(닉네임·집 외관)이 UGC.
시안: C 확정(2026-10-11) — 오늘의 이웃 목록 각 줄 ⋯ + 방문 중 상단 줄 ⋯ → 🚩 신고하기 / 🚫 차단하기. 문구 시안 그대로.

## DB (sql/migrations/migrate_neighbors_report_block.sql)
- village_reports(id, reporter, target, target_public_id, reason∈nick|decor|other, created_at, handled_at) — RLS on, 직접 접근 없음
- village_blocks(blocker, blocked, created_at, pk) — RLS on, 직접 접근 없음
- RPC neighbor_report(p_public_id, p_reason) · neighbor_block(p_public_id) — security definer, 로그인 계정만, 같은 대상 하루 1건·하루 20건
- 차단 양방향 제외: _nb_candidates · neighbor_react('private') · my_visitors
- admin_village_reports(p_limit) — 관리자 UUID 가드(기존 admin 함수와 같은 판정)

## 클라이언트
- js/neighbors/api.js report/block · ui.js ⋯ 메뉴·신고 모달·차단 확인·토스트 · track.js GA4 neighbor_report/neighbor_block
- 관리자 페이지 신고 목록 + 기존 숨김(admin_village_moderate)
- i18n en

## 배포
SQL(운영) → 웹·토스(memo)·itch·안드로이드(internal+alpha) → iOS 빌드 4 → Apple 회신(녹화+답변 2~6)
