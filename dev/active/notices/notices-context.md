# 📮 소식함 — Context

**Last Updated:** 2026-09-11 17:40 (구현 완료 · ⏸️ 배포 보류 — 사용자가 새 세션에서 추가 수정 예정)
**Branch:** feat/notices (main 에서 분기, 커밋 139c1d8 feat · 1f492ad docs) — main 미병합

## 현재 상태 (새 세션이 이어받을 때)
- DB: `sql/migrate_notices.sql` 사용자가 SQL Editor 로 적용 완료. 테스트 행 id 1(전체 공지)·2(문의 14번 답장). 행 1 본문 `\n` 정정 완료.
- 검증 완료: npm test 112 통과 · node --check · 게스트 RLS(공지만 보임) · `?lang=en` 영어 폴백 · 375px 배치 · 빈 상태 문구.
- 검증 미완: **로그인 계정의 출석 [알겠어요] → 📮 새 소식 체인**(구글 로그인은 자동화 불가 → 사용자 계정으로 확인 필요).
- code-reviewer 결과: 도착하면 아래 "리뷰 메모"에 추가. 아직 미반영.
- 다음: 사용자 추가 수정 → 리뷰 반영 → main 병합 → `npx wrangler deploy` → 토스 번들은 다음 제출 때 포함.
- 참고: 🖱️ 우클릭 키 고착·🎉 클로즈업 이동 차단 fix(12e5583)는 이미 main 에 커밋·웹 배포됨(feat/notices 에도 병합돼 있음).

## 리뷰 메모
(대기)

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
