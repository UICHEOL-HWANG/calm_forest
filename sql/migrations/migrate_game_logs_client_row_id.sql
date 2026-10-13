-- =============================================================
--  🛰️ game_logs.client_row_id — 기기가 만든 행 id (dev/active/sensor-log-durability)
--  ------------------------------------------------------------
--  기기가 보낸 뒤 응답을 못 받으면(나갈 때 keepalive·크래시 뒤 재전송) 같은 행이 다시 온다.
--  unique index 로 받아 두고 클라이언트는 on_conflict=client_row_id + resolution=ignore-duplicates 로 넣는다.
--  기존 행은 null — 유니크에 걸리지 않는다. 인덱스는 CONCURRENTLY(트랜잭션 밖에서 실행할 것).
--  RLS 는 그대로(insert = auth.uid() = user_id). ON CONFLICT DO NOTHING 은 insert 정책만 본다.
-- =============================================================

alter table public.game_logs add column if not exists client_row_id uuid;

create unique index concurrently if not exists game_logs_client_row_id_key
  on public.game_logs (client_row_id);
