-- =============================================================
--  calm forest · 🔔 푸시 알림(FCM) — 기기 토큰·발송 원장·cron RPC
--  ------------------------------------------------------------
--  사용법: pg8000 풀러로 직접 실행(1회). 멱등.
--  ⚠️ 앱(/api/push-register)·cron(functions/push-cron.js)보다 **먼저** 적용한다.
--
--  ▶ push_tokens — 기기 하나 = 토큰 하나 = 1행(token PK). 한 기기에서 계정을 바꾸면
--    같은 토큰의 user_id 가 새 계정으로 바뀐다(옛 계정에 알림이 가지 않게).
--    클라이언트는 직접 못 만진다 — RLS 켜고 정책 없음. /api/push-register 가 서비스 키로만 쓴다.
--  ▶ last_checked_on — cron 이 오늘 이 토큰을 이미 판정했는가(보냈든 안 보냈든).
--    보낼 게 없는 사람도 표시해야 다음 tick 이 같은 사람만 계속 다시 읽지 않는다.
--  ▶ push_logs — 보낸 것만 1행. id 는 알림 data.send_id 로 실려 가서
--    GA4 push_open(send_id) 과 1:1 로 조인된다. 🌱 복귀 7일 2회 상한도 여기서 센다.
-- =============================================================

create table if not exists public.push_tokens (
  token            text primary key check (char_length(token) between 20 and 4096),
  user_id          uuid not null references auth.users(id) on delete cascade,
  platform         text not null default 'android' check (platform in ('android')),
  enabled          boolean not null default true,
  lang             text not null default 'ko' check (lang in ('ko', 'en')),
  tz               text,                          -- 기기 시간대(Intl) — 1차는 KST 고정 발송, 이후 분기용
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_checked_on  date                            -- KST
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

create table if not exists public.push_logs (
  id        uuid primary key,                    -- = 알림 data.send_id
  user_id   uuid not null references auth.users(id) on delete cascade,
  kind      text not null check (kind in ('night', 'craft', 'return')),
  status    text not null check (status in ('sent', 'failed', 'dead')),
  http      smallint,
  sent_on   date not null,                       -- KST
  sent_at   timestamptz not null default now()
);
create index if not exists push_logs_user_kind_idx on public.push_logs (user_id, kind, sent_at desc);
alter table public.push_logs enable row level security;
revoke all on public.push_logs from anon, authenticated;

-- 계정당 기기 토큰 5개까지 — 익명 계정으로 가짜 토큰을 쌓아 발송 예산을 먹는 것 방지(보안 리뷰 M2).
--   새 토큰이 들어오면 그 계정의 오래된 토큰부터 지운다(폰을 바꾼 사람의 옛 토큰이 자연히 빠진다).
create or replace function public.push_tokens_cap() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.push_tokens
   where user_id = new.user_id
     and token in (select token from public.push_tokens where user_id = new.user_id
                   order by updated_at desc offset 5);
  return null;
end $$;
revoke all on function public.push_tokens_cap() from public, anon, authenticated;
drop trigger if exists push_tokens_cap on public.push_tokens;
create trigger push_tokens_cap after insert or update of user_id on public.push_tokens
  for each row execute function public.push_tokens_cap();

-- cron 이 읽을 오늘의 후보 — 판정에 필요한 세이브 조각만 꺼낸다(세이브 통째 전송 금지)
--   사람당 1행(가장 최근 등록 기기) — 폰·태블릿 둘 다 깔아도 하루 1통. 나머지 기기는 push_mark 가 같이 표시한다.
create or replace function public.push_candidates(p_today date, p_limit int default 100)
returns table (
  token text, user_id uuid, lang text, updated_at timestamptz,
  plots jsonb, outdoor jsonb, truce jsonb, night_last text, craft jsonb, returns_7d int
)
language sql stable security definer set search_path = public as $$
  select c.token, c.user_id, c.lang, c.updated_at, c.plots, c.outdoor, c.truce, c.night_last, c.craft, c.returns_7d from (
  select distinct on (t.user_id)
         t.token, t.user_id, t.lang, s.updated_at,
         s.state -> 'plots' as plots, s.state -> 'outdoor' as outdoor, s.state -> 'night' -> 'truce' as truce,
         s.state -> 'night' ->> 'lastDate' as night_last, s.state -> 'craft' as craft,
         (select count(*)::int from public.push_logs l
           where l.user_id = t.user_id and l.kind = 'return' and l.status = 'sent'
             and l.sent_at > now() - interval '7 days') as returns_7d
  from public.push_tokens t
  join public.game_saves s on s.user_id = t.user_id
  where t.enabled and (t.last_checked_on is null or t.last_checked_on < p_today)
  order by t.user_id, t.updated_at desc
  ) c
  order by c.updated_at desc
  limit least(greatest(p_limit, 1), 1000);
$$;

-- tick 끝에 한 번 — 판정한 사람의 **모든 기기** 표시 + 죽은 토큰 삭제(subrequest 1개로 묶음)
create or replace function public.push_mark(p_today date, p_checked text[], p_dead text[])
returns void
language sql security definer set search_path = public as $$
  update public.push_tokens set last_checked_on = p_today
   where user_id in (select user_id from public.push_tokens where token = any(coalesce(p_checked, '{}')));
  delete from public.push_tokens where token = any(coalesce(p_dead, '{}'));
$$;

revoke all on function public.push_candidates(date, int) from public, anon, authenticated;
revoke all on function public.push_mark(date, text[], text[]) from public, anon, authenticated;
grant execute on function public.push_candidates(date, int) to service_role;
grant execute on function public.push_mark(date, text[], text[]) to service_role;
