begin;

create or replace function public._auth_confirm_clears_password()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null
     and coalesce(new.email, '') not like '%.calmforest.local' then
    new.encrypted_password := '';
  end if;
  return new;
end $$;

revoke all on function public._auth_confirm_clears_password() from public, anon, authenticated;

drop trigger if exists auth_confirm_clears_password on auth.users;
create trigger auth_confirm_clears_password
  before update of email_confirmed_at on auth.users
  for each row execute function public._auth_confirm_clears_password();

update auth.users set encrypted_password = ''
 where not is_anonymous
   and coalesce(email, '') not like '%.calmforest.local'
   and coalesce(encrypted_password, '') <> '';

commit;
