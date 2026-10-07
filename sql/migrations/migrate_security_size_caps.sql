-- =============================================================
--  🛡️ 클라이언트가 쓰는 jsonb 컬럼 크기 상한 (2026-10-08, 보안 감사 LOW)
--  ------------------------------------------------------------
--  anon 키 + 본인 JWT 로 PostgREST 에 직접 쓰면 크기 제한이 없어 한 행에 수 MB 를 넣을 수 있었다(저장소·egress 남용).
--  상한은 실측 최대의 25배 이상 — 정상 플레이로는 닿지 않는다(2026-10-08 실측):
--    game_saves.state 최대 21KB → 512KiB · 나머지 최대 2KB → 64KiB
--  ⚠️ 상한을 넘는 저장은 23514(check_violation)로 실패한다 — 세이브가 정말 커지는 기능을 넣으면 여기부터 늘릴 것.
--  적용: 1회(멱등) → sql/tests/security_hardening_selftest.py
-- =============================================================
begin;

alter table public.game_saves drop constraint if exists game_saves_state_size;
alter table public.game_saves add constraint game_saves_state_size
  check (octet_length(state::text) <= 524288);

alter table public.boat_runs drop constraint if exists boat_runs_json_size;
alter table public.boat_runs add constraint boat_runs_json_size
  check (coalesce(octet_length(hit_points::text), 0) + coalesce(octet_length(upgrades::text), 0)
         + coalesce(octet_length(picks::text), 0) <= 65536);

alter table public.cafe_guests drop constraint if exists cafe_guests_guests_size;
alter table public.cafe_guests add constraint cafe_guests_guests_size
  check (octet_length(guests::text) <= 65536);

alter table public.feedback drop constraint if exists feedback_meta_size;
alter table public.feedback add constraint feedback_meta_size
  check (octet_length(meta::text) <= 65536);

alter table public.retention_guidance_scores drop constraint if exists retention_guidance_scores_raw_size;
alter table public.retention_guidance_scores add constraint retention_guidance_scores_raw_size
  check (octet_length(raw_features::text) <= 65536);

alter table public.session_logs drop constraint if exists session_logs_counts_size;
alter table public.session_logs add constraint session_logs_counts_size
  check (octet_length(counts::text) <= 65536);

alter table public.star_runs drop constraint if exists star_runs_json_size;
alter table public.star_runs add constraint star_runs_json_size
  check (coalesce(octet_length(judges::text), 0) + coalesce(octet_length(offsets::text), 0) <= 65536);

commit;
