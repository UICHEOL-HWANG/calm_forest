"""관리자 대시보드 롤업 백필 — BigQuery 원본 → Supabase cf_sessions / cf_heat_day / cf_econ_day.

Supabase 원본은 최근 7일만 남는다(export_to_bq.py prune). 그보다 오래된 날은 BQ 에만 있으므로
같은 정의(sql/migrations/migrate_admin_rollup.sql 의 cf_rollup)로 BQ 에서 집계해 한 번 채운다.
그 뒤로는 매일 cf_rollup 이 이어서 채운다.

    ml/.venv/bin/python ml/scripts/backfill_admin_rollup.py --to 2026-10-03

--to 이후 날짜는 건드리지 않는다(그 구간은 Supabase 원본으로 cf_rollup 이 이미 채움).
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from calm_ml import bq, db  # noqa: E402

RAW = "`calm-forest.calm_forest_raw`"
DAY_RANGE = "between cast(@from_day as date) and cast(@to_day as date)"

SESSIONS_SQL = f"""
with gl as (
  select session_id,
         min(created_at) start_ts, max(created_at) end_ts,
         array_agg(coalesce(nullif(client_id, ''), user_id) ignore nulls order by created_at limit 1)[safe_offset(0)] uid,
         array_agg(user_id ignore nulls order by created_at desc limit 1)[safe_offset(0)] user_id,
         logical_and(coalesce(is_guest, true)) is_guest,
         array_agg(platform ignore nulls order by created_at desc limit 1)[safe_offset(0)] platform,
         array_agg(nullif(variant, '') ignore nulls order by created_at desc limit 1)[safe_offset(0)] variant
  from {RAW}.game_logs where session_id is not null group by session_id
),
sl as (
  select * except(rn) from (
    select *, row_number() over (partition by session_id order by updated_at desc) rn
    from {RAW}.session_logs) where rn = 1
),
j as (
  select coalesce(g.session_id, s.session_id) session_id,
         coalesce(g.uid, nullif(s.client_id, ''), s.user_id) uid,
         coalesce(g.user_id, s.user_id) user_id,
         coalesce(g.is_guest, s.is_guest, true) is_guest,
         coalesce(g.platform, s.platform) platform,
         coalesce(g.variant, nullif(s.variant, ''), 'control') variant,
         case when g.start_ts is null then coalesce(s.started_at, s.updated_at)
              when s.session_id is null then g.start_ts
              else least(g.start_ts, coalesce(s.started_at, s.updated_at)) end start_ts,
         case when g.end_ts is null then s.updated_at
              when s.session_id is null then g.end_ts
              else greatest(g.end_ts, s.updated_at) end end_ts,
         coalesce(timestamp_diff(g.end_ts, g.start_ts, second), 0) dur_sec,
         s.play_sec, s.last_place, s.counts
  from gl g full join sl s using (session_id)
)
select * from j where uid is not null and date(start_ts, 'Asia/Seoul') {DAY_RANGE}
"""

# 맵 판정은 cf_rollup 과 같은 규칙 — 먼 구역(z ≤ -380) 방문 구간의 첫 위치가 나루터 근처(> -470)면 나룻배라 뺀다
HEAT_SQL = f"""
with g as (
  select session_id, created_at, user_id, char_x x, char_z z, (char_z <= -380 and abs(char_x) <= 45) far
  from {RAW}.game_logs
  where char_x is not null and char_z is not null and date(created_at, 'Asia/Seoul') {DAY_RANGE}
),
r as (
  select *, sum(if(far and not coalesce(prev_far, false), 1, 0))
              over (partition by session_id order by created_at rows unbounded preceding) run_no
  from (select *, lag(far) over (partition by session_id order by created_at) prev_far from g)
),
st as (
  select session_id, run_no, array_agg(z order by created_at limit 1)[offset(0)] start_z,
         max(abs(x)) max_ax, max(z) - min(z) z_span
  from r where far group by 1, 2
),
lab as (
  select r.created_at, r.user_id, r.x, r.z,
         case
           when not r.far then if(abs(r.x) <= 44 and abs(r.z) <= 44, 'main', null)
           when st.start_z > -470 or (st.max_ax <= 6.5 and st.z_span > 60) then null
           when abs(r.x) <= 40 and r.z between -590 and -510 then 'dream'
           when abs(r.x) <= 40 and r.z between -740 and -660 then 'mirror'
         end map
  from r left join st using (session_id, run_no)
)
select date(created_at, 'Asia/Seoul') day, map, user_id,
       cast(round(x / 2.0) * 2 as int64) gx,
       cast(round((z - case map when 'dream' then -550 when 'mirror' then -700 else 0 end) / 2.0) * 2 as int64) gz,
       count(*) hits
from lab where map is not null group by 1, 2, 3, 4, 5
"""

ECON_SQL = f"""
select date(created_at, 'Asia/Seoul') day, coalesce(nullif(source, ''), 'unknown') source, user_id, count(*) tx,
       sum(if(amount > 0, amount, 0)) inflow, sum(if(amount < 0, -amount, 0)) outflow
from {RAW}.econ_logs
where date(created_at, 'Asia/Seoul') {DAY_RANGE}
group by 1, 2, 3
"""

# 세션 upsert — acq·persona 판정은 cf_rollup 과 같은 SQL 함수/규칙을 쓴다(정의가 한 곳에만 있게)
INSERT_SESSIONS = """
insert into cf_sessions (session_id, uid, user_id, is_guest, platform, variant, day,
                         start_ts, end_ts, dur_sec, play_sec, last_place, counts, acq, persona, rolled_at)
select r.session_id, r.uid, nullif(r.user_id, '')::uuid, r.is_guest, r.platform, r.variant,
       (r.start_ts at time zone 'Asia/Seoul')::date, r.start_ts, r.end_ts, r.dur_sec, r.play_sec, r.last_place,
       coalesce(r.counts, '{}'::jsonb), cf_is_acq(r.counts),
       coalesce(r.user_id in (select id::text from cf_persona_user_ids() p(id)), false),
       now()
from jsonb_to_recordset(cast(:payload as jsonb)) as r(
  session_id text, uid text, user_id text, is_guest boolean, platform text, variant text,
  start_ts timestamptz, end_ts timestamptz, dur_sec int, play_sec int, last_place text, counts jsonb)
on conflict (session_id) do update set
  uid = excluded.uid, user_id = excluded.user_id, is_guest = excluded.is_guest,
  platform = excluded.platform, variant = excluded.variant, day = excluded.day,
  start_ts = excluded.start_ts, end_ts = excluded.end_ts, dur_sec = excluded.dur_sec,
  play_sec = excluded.play_sec, last_place = excluded.last_place, counts = excluded.counts,
  acq = excluded.acq, persona = excluded.persona, rolled_at = excluded.rolled_at
"""

CLEAR_HEAT = "delete from cf_heat_day where day between cast(:f as date) and cast(:t as date)"
INSERT_HEAT = """
insert into cf_heat_day (day, map, persona, gx, gz, hits)
select r.day, r.map, (pu.id is not null), r.gx, r.gz, sum(r.hits)
from jsonb_to_recordset(cast(:payload as jsonb)) as r(day date, map text, user_id text, gx smallint, gz smallint, hits int)
left join (select id::text as id from cf_persona_user_ids() p(id)) pu on pu.id = r.user_id
group by 1, 2, 3, 4, 5
"""
CLEAR_ECON = "delete from cf_econ_day where day between cast(:f as date) and cast(:t as date)"
INSERT_ECON = """
insert into cf_econ_day (day, source, persona, tx, inflow, outflow)
select r.day, r.source, (pu.id is not null), sum(r.tx), sum(r.inflow), sum(r.outflow)
from jsonb_to_recordset(cast(:payload as jsonb)) as r(day date, source text, user_id text, tx int, inflow bigint, outflow bigint)
left join (select id::text as id from cf_persona_user_ids() p(id)) pu on pu.id = r.user_id
group by 1, 2, 3
"""


def _clean(v):
    """pandas 값 → JSON 값(타임스탬프·날짜는 ISO, NaN/NaT 는 None, numpy 스칼라는 파이썬 값)."""
    if v is None:
        return None
    try:
        if v != v:  # NaN / NaT
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if hasattr(v, "item"):
        return v.item()
    return v


def _records(df) -> list[dict]:
    return [{k: _clean(v) for k, v in rec.items()} for rec in df.to_dict(orient="records")]


def _parse_counts(rows: list[dict]) -> list[dict]:
    """BQ session_logs.counts 는 JSON 문자열 — jsonb 로 넣을 수 있게 객체로 푼다."""
    out = []
    for r in rows:
        c = r.get("counts")
        try:
            obj = json.loads(c) if isinstance(c, str) and c else {}
        except json.JSONDecodeError:
            obj = {}
        out.append({**r, "counts": obj if isinstance(obj, dict) else {}})
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="from_day", default="2026-07-27")
    ap.add_argument("--to", dest="to_day", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    p = {"from_day": a.from_day, "to_day": a.to_day}
    sessions = _parse_counts(_records(bq.read_sql(SESSIONS_SQL, **p)))
    heat = _records(bq.read_sql(HEAT_SQL, **p))
    econ = _records(bq.read_sql(ECON_SQL, **p))
    print(f"[bq] sessions {len(sessions)} · heat {len(heat)} · econ {len(econ)}  ({a.from_day} ~ {a.to_day})")
    if a.dry_run:
        return

    con = db.connect()
    try:
        con.run("begin")
        con.run(INSERT_SESSIONS, payload=json.dumps(sessions))
        con.run(CLEAR_HEAT, f=a.from_day, t=a.to_day)
        con.run(INSERT_HEAT, payload=json.dumps(heat))
        con.run(CLEAR_ECON, f=a.from_day, t=a.to_day)
        con.run(INSERT_ECON, payload=json.dumps(econ))
        con.run("commit")
    except Exception:
        con.run("rollback")
        raise
    finally:
        con.close()
    print("[supabase] backfill committed")


if __name__ == "__main__":
    main()
