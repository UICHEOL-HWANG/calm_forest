# 📮 공지·답장 시스템 — 출석 모달 다음에 뜨는 소식 창

## Context

유저가 게임 안 "💬 문의하기"로 보낸 글은 `feedback` 테이블에 `user_id`와 함께 쌓이지만(14건·4명, 전부 user_id 있음), 개발자가 답을 돌려줄 경로가 없다. 공지 테이블 하나에 **받는 사람 컬럼**을 두어 전체 공지와 1:1 답장을 같은 기구로 처리하고, 하루 첫 접속 때 뜨는 출석 모달의 [알겠어요] 버튼을 누르면 이어서 **별도 소식 창**이 뜨게 한다. 토스 유저도 고정 uuid 세션이므로 동일하게 받는다. 게스트는 전체 공지만(익명 세션이 매번 바뀌어 답장 불가).

## 결정 사항 (대화에서 확정)

- 별도 창. 출석 모달과 합치지 않음.
- 출석 [알겠어요] 클릭 → 새 소식이 있을 때만 소식 창. 없으면 아무것도 안 뜸.
- 안 읽은 것만 띄움(마지막으로 본 id를 세이브에 기록 → 기기 바꿔도 두 번 안 뜸).
- 지난 소식은 ☰ 메뉴 📮 항목에서 다시 읽음.
- 발신은 관리자 UI 없이 SQL Editor / Supabase MCP insert (클라이언트 insert 정책 없음).
- 언어: `title_en`/`body_en` 선택 컬럼. 영어 모드면 있을 때만 영어, 없으면 한국어 폴백(i18n 철학과 동일).

## 1. DB — `sql/migrate_notices.sql`

```sql
create table public.notices (
  id             bigint generated always as identity primary key,
  title          text not null,
  body           text not null,
  title_en       text,
  body_en        text,
  target_user_id uuid references auth.users(id) on delete cascade,  -- null = 전체 공지
  reply_to       bigint references public.feedback(id) on delete set null,  -- 어느 문의의 답인지
  created_at     timestamptz not null default now()
);
create index notices_target_idx on public.notices (target_user_id, id);
alter table public.notices enable row level security;
create policy notices_select_visible on public.notices for select to authenticated
  using (target_user_id is null or target_user_id = (select auth.uid()));
-- feedback: 답장 창에서 원문 한 줄을 인용하려면 본인 글 읽기 허용(현재 insert만 있음)
create policy feedback_select_own on public.feedback for select to authenticated
  using (user_id = (select auth.uid()));
```

- RLS는 `(select auth.uid())` + `to authenticated` 규칙([migrate_struct_01_rls_perf.sql](sql/migrate_struct_01_rls_perf.sql) 패턴). 익명 세션도 `authenticated` 롤이라 전체 공지는 게스트에게도 보임.
- 파일 머리에 발송 예시 두 줄(전체 공지 / 답장) 주석으로 남김 → 앞으로 운영 시 복붙.

## 2. 순수 로직 — `js/notices.js` (새 파일, 테스트 대상)

```js
export function unreadNotices(list, seenId)      // id > seenId 오름차순
export function pickText(n, lang)                // {title, body}: en이면 *_en 우선, 없으면 ko
export function maxId(list)                      // 본 것으로 표시할 id
```
DOM·네트워크 없음. `tests/notices.test.mjs`를 먼저 작성(RED) → 구현(GREEN).

## 3. 조회 — `js/supabase-client.js`

`fetchNotices(sinceId)` 추가: `supabase.from('notices').select('id,title,body,title_en,body_en,target_user_id,reply_to,created_at,feedback(message)').gt('id', sinceId).order('id')`. 오프라인이면 `[]`. 기존 `listPhotos` 스타일(try/catch + 콘솔 폴백).

## 4. 세이브 — `js/game.js`

- 기본값(704행 부근) `noticeSeenId: 0`, 복원 블록(1742행 부근) `if (saved.noticeSeenId) gameState.noticeSeenId = saved.noticeSeenId`.
- `markNoticesSeen(id)` export: 세이브 갱신 + `requestSave()`.

## 5. 흐름 연결 — `js/game.js` + `index.html`

- `checkDailyBonus()`([game.js:998](js/game.js:998))의 `ui.showHintModal` 호출에 `ok: { label: '알겠어요 🌱', onClick: () => ui.showNotices?.() }` 전달. 기존 `hint-ok` 리스너가 닫기를 맡으므로 콜백만 얹는다.
- 접속 직후(1700행 `checkDailyBonus` 전에) `fetchNotices(gameState.noticeSeenId)`를 await 없이 시작해 결과를 `pendingNotices`에 보관. 출석 모달을 닫을 때 아직 안 왔으면 skip(다음 접속에 다시 뜸 — 부팅 지연 없음).
- 오늘 출석을 이미 받은 두 번째 접속: 모달이 안 뜨므로 소식 창도 안 뜸(요구사항 "그날 첫 접속").
- 신규 유저(튜토리얼 전)는 출석이 토스트라 소식 창도 skip.
- `index.html` `ui.showNotices(list)`: 새 `#notice-modal`(`tut-card` 스타일 재사용, 본문 스크롤). 항목 = 날짜 · 제목 · 본문. `reply_to`가 있으면 위에 "💬 내 문의: {원문 60자}" 인용. 닫으면 `markNoticesSeen(maxId)`. `-modal` 접미사라 `anyModalOpen()`에 자동 포함.
- ☰ 메뉴 `#util-btns`에 📮 버튼 추가 → `fetchNotices(0)`로 전체 목록(최근 20건) 열기. 읽음 처리 동일.

## 6. i18n — `js/i18n-en.js`

새 문자열(모달 제목·메뉴 라벨·인용 접두·빈 상태 문구) 엔트리 추가. `node scripts/i18n_check.mjs`로 점검.

## 7. 문서·메모리

- `dev/active/notices/` plan·context·tasks 3종.
- `docs/DEPLOY.md` 또는 새 `docs/NOTICES_OPS.md`에 발송 SQL 예시(전체/답장/영어 병기).

## 문구 (검수 완료 — 2026-09-11)

| 자리 | 한국어(사전 키) | 영어 |
|---|---|---|
| ☰ 메뉴 버튼 | 📮 소식함 | 📮 Inbox |
| 출석 직후 모달 제목 | 📮 새 소식 | 📮 What's new |
| 메뉴에서 열 때 모달 제목 | 📮 소식함 | 📮 Inbox |
| 1:1 답장 항목 머리말 | 💌 개발자의 답장 | 💌 A reply from the developer |
| 답장 인용 접두어 | 내 문의: {0} | My message: {0} |
| 빈 상태(메뉴에서 열었는데 없음) | 아직 온 소식이 없어요 🌱 | No news yet 🌱 |
| 닫기 버튼 | 알겠어요 🌱 (기존 키 재사용) | — |

## 검증

1. `npm test` — notices.test.mjs 포함 전부 통과.
2. Supabase MCP로 마이그레이션 적용 후 테스트 공지 1건 + 내 계정 대상 답장 1건 insert.
3. 브라우저 프리뷰(`?dbg`): 출석 모달 → [알겠어요] → 소식 창 2건 표시 → 닫기 → 새로고침해도 다시 안 뜸(`noticeSeenId` 저장 확인 SQL).
4. 다른 계정(게스트)으로 접속: 전체 공지만 보이고 답장은 안 보임(RLS).
5. `?lang=en`: `title_en` 있는 건 영어, 없는 건 한국어.
6. 375px 모바일 뷰포트에서 모달이 조이스틱과 안 겹치는지 스크린샷.
7. 토스 번들은 웹 배포 후 다음 번들 때 포함(Supabase 직접 호출이라 CORS 이슈 없음).
