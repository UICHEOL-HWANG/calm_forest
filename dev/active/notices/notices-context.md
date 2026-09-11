# 📮 소식함 — Context

**Last Updated:** 2026-09-11 (착수)
**Branch:** feat/notices (main 에서 분기)

## 핵심 파일
- `sql/migrate_notices.sql` — notices 테이블 + RLS + feedback select-own 정책 (신규)
- `js/notices.js` — 순수 로직 unreadNotices / pickText / maxId (신규, 테스트 대상)
- `tests/notices.test.mjs` — node --test (신규)
- `js/supabase-client.js` — `fetchNotices(sinceId)` (listPhotos 패턴)
- `js/game.js` — 세이브 `noticeSeenId`, `checkDailyBonus()` ok 콜백, 접속 시 선조회, `markNoticesSeen`
- `index.html` — `#notice-modal`, `ui.showNotices`, ☰ 메뉴 `#inbox-btn`
- `js/i18n-en.js` — 새 문구 7종

## 의사결정
- 공지와 1:1 답장을 **한 테이블**(`target_user_id` null=전체)로. 관리자 UI 없음 → SQL/MCP insert.
- 출석 모달 [알겠어요] → 안 읽은 소식 있을 때만 별도 창. 읽음 기준은 세이브의 `noticeSeenId`(서버 세이브라 기기 무관).
- 게스트: 익명 세션도 `authenticated` 롤 → 전체 공지 보임. 답장은 불가(매 방문 새 uuid).
- 영어: `title_en/body_en` 있을 때만 영어, 없으면 한국어 폴백.
- 문구 검수 완료(plan 표 참고): 📮 소식함 / 📮 새 소식 / 💌 개발자의 답장 / 내 문의: {0} / 아직 온 소식이 없어요 🌱

## 의존성·함정
- RLS는 `(select auth.uid())` + `to authenticated` (migrate_struct_01 규칙).
- PostgREST 임베드 `feedback(message)`는 feedback 에 select 정책이 있어야 값이 옴(없으면 null, 에러 아님).
- `hint-ok` 클릭 리스너(index.html)가 닫기를 담당 — `ok.onClick` 은 닫힌 뒤 실행되는 추가 콜백.
- index.html 콜백 파라미터명 `t` 금지(i18n 셰도잉).
- 토스 번들은 웹 배포 후 별도 번들 제출 필요.
