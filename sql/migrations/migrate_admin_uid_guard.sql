-- =============================================================
--  🔐 관리자·본인 판정 이중 잠금 — 2026-09-30 (보안 리뷰 방어 심화, 지금 뚫리는 구멍은 아님)
--  ------------------------------------------------------------
--  지금까지 관리자 판정은 JWT 의 email 클레임 하나에만 기댔다. 이메일 코드 로그인(ce01d55)이 열리며
--  "이메일 = 신원" 경로가 하나 더 생겼으니, 서버가 정하는 값으로 두 번째 조건을 건다.
--
--  ① cf_is_admin(): email 허용목록 AND auth.uid() 허용목록(관리자 UUID) AND 익명 아님.
--  ② cf_admin_overview / cf_beta_overview: 관리자 분기에 같은 UUID 조건 추가.
--       본문 400줄을 복사하면 라이브와 어긋날 수 있어(이미 주석 경로가 다르다) **라이브 정의에서
--       가드 한 줄만 바꿔 끼운다**. 바꿀 줄을 못 찾으면 예외로 멈춘다(트랜잭션 전체 롤백).
--  ③ beta_testers / beta_diary 본인 정책: email 일치 AND 익명 아님 AND provider ∈ (google, email).
--       provider 는 app_metadata(서버 전용). (select auth.jwt()) 로 감싸 InitPlan 1회 평가.
--
--  관리자 UUID(auth.users, 2026-09-30 조회):
--    17bb08c7-c4bc-4870-b464-1b131e67aff8  icuchoel@gmail.com
--    4cab8ea4-c27f-4ef5-b350-cf55f0f993b5  cheorish.hw@gmail.com
--  관리자를 바꿀 땐 이 파일·admin_analytics.sql·migrate_notices_admin.sql·migrate_beta_diary_q7.sql 의
--  이메일·UUID 명단을 함께 고칠 것.
--
--  적용: Supabase SQL Editor 에서 1회 실행. 두 번 실행해도 안전(이미 바뀐 가드는 건너뛴다).
--  검증: 맨 아래 확인 쿼리 · 관리자 계정으로 dashboards/notices_admin.html·대시보드 열기 → 그대로 통과.
-- =============================================================

begin;

-- ① 공지 관리자 판정
create or replace function public.cf_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select lower(coalesce((select auth.jwt()) ->> 'email', ''))
           = any (array['icuchoel@gmail.com', 'cheorish.hw@gmail.com'])        -- ★ 관리자 이메일(소문자)
     and coalesce((select auth.uid()) = any (array[
           '17bb08c7-c4bc-4870-b464-1b131e67aff8',
           '4cab8ea4-c27f-4ef5-b350-cf55f0f993b5']::uuid[]), false)              -- ★ 관리자 UUID
     and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false);
$$;
grant execute on function public.cf_is_admin() to authenticated;

-- ② 대시보드 RPC 두 개 — 관리자 분기 가드만 교체
do $$
declare
  fn  text;
  def text;
  old_guard constant text := 'if caller_email = any (admins) then';
  new_guard constant text := 'if caller_email = any (admins) and coalesce(auth.uid() = any (admin_ids), false) then';
  ids_decl  constant text := E'  admin_ids uuid[] := array[''17bb08c7-c4bc-4870-b464-1b131e67aff8'', ''4cab8ea4-c27f-4ef5-b350-cf55f0f993b5'']::uuid[];  -- ★ 관리자 UUID\n';
begin
  foreach fn in array array['cf_admin_overview(integer,text)', 'cf_beta_overview(integer,text)'] loop
    def := pg_get_functiondef(('public.' || fn)::regprocedure);
    if position(new_guard in def) > 0 then
      raise notice '% — 이미 적용됨, 건너뜀', fn;
      continue;
    end if;
    if position(old_guard in def) = 0 or position(E'\nbegin\n' in def) = 0 then
      raise exception '% — 바꿀 관리자 가드를 찾지 못했습니다. 라이브 정의를 확인하세요.', fn;
    end if;
    def := replace(def, old_guard, new_guard);
    def := regexp_replace(def, E'\nbegin\n', E'\n' || ids_decl || E'begin\n');   -- 첫 begin(선언부 끝) 앞에 선언 추가
    execute def;
    raise notice '% — 가드 교체 완료', fn;
  end loop;
end $$;

-- ③ 베타 본인 정책(라이브 이름 *_self_* · struct_01 이름 *_own 둘 다 정리)
drop policy if exists beta_testers_self_read  on public.beta_testers;
drop policy if exists beta_testers_select_own on public.beta_testers;
drop policy if exists beta_diary_self_rw      on public.beta_diary;
drop policy if exists beta_diary_all_own      on public.beta_diary;

create policy beta_testers_select_own on public.beta_testers
  for select to authenticated
  using (
    email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
    and ((select auth.jwt()) -> 'app_metadata' ->> 'provider') in ('google', 'email')
  );

create policy beta_diary_all_own on public.beta_diary
  for all to authenticated
  using (
    email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
    and ((select auth.jwt()) -> 'app_metadata' ->> 'provider') in ('google', 'email')
  )
  with check (
    email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
    and ((select auth.jwt()) -> 'app_metadata' ->> 'provider') in ('google', 'email')
  );

commit;

-- 확인(실행 후):
--   select proname,
--          pg_get_functiondef(oid) like '%admin_ids%' or pg_get_functiondef(oid) like '%auth.uid()%' as guarded
--     from pg_proc where proname in ('cf_is_admin','cf_admin_overview','cf_beta_overview');   -- 전부 true
--   select tablename, policyname from pg_policies where tablename in ('beta_testers','beta_diary');  -- *_own 두 개
