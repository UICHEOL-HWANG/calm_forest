# 📮 소식함 운영 — 공지·문의 답장 보내기

관리자 UI 없이 Supabase SQL Editor 에서 `notices` 테이블에 insert 한다. 클라이언트는 select 만 가능(RLS).

## 유저에게 어떻게 보이나
- **하루 첫 접속**: 출석 보상 모달 → [알겠어요] → 안 읽은 소식이 있으면 "📮 새 소식" 창이 이어서 뜬다.
- **다시 읽기**: ☰ 메뉴 → 📮 소식함 (최근 20건).
- 읽은 기준은 세이브의 `noticeSeenId`(마지막으로 본 id). 기기를 바꿔도 두 번 안 뜬다.
- 게스트는 전체 공지만 받는다. 1:1 답장은 구글·토스 로그인 유저(고정 uuid)에게만 간다.
- 영어 모드: `title_en`/`body_en` 이 있으면 그걸, 없으면 한국어 그대로.

## 1) 전체 공지

```sql
insert into public.notices (title, body, title_en, body_en) values
  ('🌧️ 비 오는 날 안내',
   E'비 오는 날엔 밭에 물을 안 줘도 돼요.\n대신 낚시 입질이 빨라져요!',
   'Rainy days',
   E'No need to water on rainy days.\nFish bite faster instead!');
```

- 줄바꿈은 `E'...\n...'` 로. 일반 `'...\n...'` 은 백슬래시가 글자 그대로 들어간다.
- 영어를 안 쓰면 `title_en, body_en` 을 빼도 된다.

## 2) 문의 답장

먼저 문의를 찾는다.

```sql
select id, user_id, category, left(message, 60) as msg, created_at
  from public.feedback order by id desc limit 20;
```

그 `id` 로 답장을 넣으면 작성자에게만 보인다(`user_id` 는 자동으로 따라간다).

```sql
insert into public.notices (title, body, target_user_id, reply_to)
  select '밤 밭 가시성', E'밤에 밭 주변 램프를 밝게 했어요.\n알려주셔서 고마워요!', user_id, id
    from public.feedback where id = 12;
```

- 답장 창에는 "💌 개발자의 답장" 머리말과 "내 문의: (원문 앞 60자)" 인용이 자동으로 붙는다.
- 게스트(익명)가 보낸 문의는 다음 방문 때 uuid 가 바뀌어 답장이 닿지 않는다. 그런 건 전체 공지로 답한다.

## 3) 확인·정정

```sql
select id, title, target_user_id is null as is_global, reply_to, created_at
  from public.notices order by id desc limit 20;

update public.notices set body = E'수정한 본문' where id = 3;
delete from public.notices where id = 3;   -- 이미 읽은 유저의 noticeSeenId 는 그대로(문제 없음)
```

## 스키마
`sql/migrate_notices.sql` — `notices(id, title, body, title_en, body_en, target_user_id, reply_to, created_at)` + RLS 두 정책(`notices_select_visible`, `feedback_select_own`).
