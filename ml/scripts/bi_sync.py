from __future__ import annotations

import argparse
import csv
import io
import json
import ssl
import sys
from datetime import date, datetime, timezone
from pathlib import Path

import pg8000.native

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from calm_ml import bq  # noqa: E402
from calm_ml.bi_rows import PROMOTED, event_row  # noqa: E402

REPO = Path(__file__).resolve().parents[2]
SCHEMA = REPO / "tools/bi/schema.sql"
BI_ENV = REPO / "tools/bi/.env"
SECRETS_ENV = Path.home() / "calm_forest/.env"
RESYNC_DAYS = 3
COLUMNS = ("ga_day", "day", "ts", "device", "user_id", "event", "session_id", "host", "country", "os", "device_cat",
           *PROMOTED, "params", "uprops", "is_test")

DAY_SQL = f"""
select date(timestamp_micros(event_timestamp), 'Asia/Seoul') as day, event_timestamp as ts,
       user_pseudo_id as device, user_id, event_name as event,
       to_json_string(event_params) as params, to_json_string(user_properties) as uprops,
       geo.country as country, device.operating_system as os, device.category as cat
from `{bq.GA4}.events_*`
where _TABLE_SUFFIX = @suffix
"""


def env_value(path: Path, key: str) -> str:
    for line in path.read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit(f"{key} 가 {path} 에 없습니다")


def local_db() -> pg8000.native.Connection:
    return pg8000.native.Connection(user="bi", password=env_value(BI_ENV, "BI_DB_PASSWORD"),
                                    host="127.0.0.1", port=5433, database="bi")


def persona_ids() -> set[str]:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    con = pg8000.native.Connection(user="postgres.zuyxgjfihxtfdpolljzw", password=env_value(SECRETS_ENV, "SUPABASE_DB_PASSWORD"),
                                   host="aws-1-ap-northeast-2.pooler.supabase.com", port=5432, database="postgres", ssl_context=ctx)
    try:
        return {str(r[0]) for r in con.run("select * from cf_persona_user_ids()")}
    finally:
        con.close()


def ga_days() -> list[str]:
    return sorted(t.table_id[7:] for t in bq.client().list_tables(bq.GA4)
                  if t.table_id.startswith("events_") and t.table_id[7:].isdigit() and len(t.table_id) == 15)


def days_to_sync(available: list[str], loaded: set[str], resync: int) -> list[str]:
    recent = set(available[-resync:]) if resync else set()
    return [d for d in available if d not in loaded or d in recent]


def _csv_value(v):
    if v is None:
        return None
    if isinstance(v, (dict, list)):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, bool):
        return "t" if v else "f"
    return v


def load_day(con: pg8000.native.Connection, suffix: str, personas: set[str]) -> int:
    df = bq.read_sql(DAY_SQL, suffix=suffix)
    ga_day = date(int(suffix[:4]), int(suffix[4:6]), int(suffix[6:]))
    buf = io.StringIO()
    w = csv.writer(buf)
    for raw in df.to_dict("records"):
        raw = {**raw, "day": str(raw["day"]), "params": json.loads(raw["params"] or "[]"), "uprops": json.loads(raw["uprops"] or "[]")}
        row = event_row(raw, personas)
        row["ga_day"] = ga_day.isoformat()
        row["ts"] = datetime.fromtimestamp(raw["ts"] / 1_000_000, tz=timezone.utc).isoformat()
        w.writerow([_csv_value(row[c]) for c in COLUMNS])
    buf.seek(0)
    con.run("begin")
    con.run("delete from events where ga_day = :d", d=ga_day)
    con.run(f"copy events ({', '.join(COLUMNS)}) from stdin with (format csv)", stream=buf)
    con.run("insert into sync_log (day, rows) values (:d, :n) on conflict (day) do update set rows = excluded.rows, loaded_at = now()",
            d=ga_day, n=len(df))
    con.run("commit")
    return len(df)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="이 날짜(YYYYMMDD)만 다시 받기")
    ap.add_argument("--resync", type=int, default=RESYNC_DAYS, help="늦게 들어오는 이벤트 때문에 최근 며칠은 매번 다시 받는다")
    a = ap.parse_args()

    con = local_db()
    con.run(SCHEMA.read_text())
    loaded = {d.strftime("%Y%m%d") for (d,) in con.run("select day from sync_log")}
    todo = a.only or days_to_sync(ga_days(), loaded, a.resync)
    personas = persona_ids()
    for suffix in todo:
        print(f"{suffix}: {load_day(con, suffix, personas)} rows", flush=True)
    con.run("select refresh_devices()")
    n_ev, n_dev = con.run("select (select count(*) from events), (select count(*) from devices)")[0]
    print(f"done · events {n_ev} · devices {n_dev}")


if __name__ == "__main__":
    main()
