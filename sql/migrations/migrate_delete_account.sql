-- =============================================================
--  calm forest · 🗑️ 계정 삭제 (구글 플레이 정책 대응)
--  ------------------------------------------------------------
--  구글 플레이는 "앱에서 계정을 만들 수 있으면 계정 삭제 경로도 제공" 을 요구한다.
--  (Play Console > 앱 콘텐츠 > 데이터 보안 · 계정 삭제 URL)
--
--  왜 RPC 인가 — Worker 에 service_role 키를 두지 않기 위해서다.
--  · auth.users 삭제는 원래 service_role 권한이 필요하다. 그 키를 Cloudflare 에
--    올리면 유출 시 전체 DB 가 열린다(anon key 와 달리 RLS 를 통째로 우회).
--  · security definer 함수는 소유자 권한으로 돌면서도 auth.uid() 로
--    "호출한 본인" 만 지우므로, 권한을 이 한 가지 동작에만 가둘 수 있다.
--
--  cascade 로 함께 지워지는 것(각 테이블의 user_id references auth.users on delete cascade):
--    game_saves · game_logs · econ_logs · session_logs · boat_runs · sea_records · photos
--
--  ⚠️ cascade 가 못 지우는 것 — OCI 버킷의 사진 원본(photos 행만 지워지고 오브젝트는 남는다).
--     클라이언트가 이 함수를 부르기 전에 DELETE /api/photo 로 먼저 지워야 한다.
--     순서를 지키지 않으면 버킷에 주인 없는 개인 이미지가 남는다.
-- =============================================================

create or replace function public.delete_own_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- 익명(게스트) 계정도 지운다 — 게스트도 game_saves 를 남기므로 삭제 대상이다.
  delete from auth.users where id = uid;

  return jsonb_build_object('ok', true, 'deleted_uid', uid);
end;
$$;

-- 실행 권한은 로그인 세션에만. anon(비로그인) 은 auth.uid() 가 null 이라 어차피 막히지만,
-- 호출 자체를 못 하게 해 두는 편이 공격 표면이 작다.
revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

-- 확인용(⚠️ 되돌릴 수 없다 — 테스트 계정으로만):
--   select public.delete_own_account();
