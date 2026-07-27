#!/usr/bin/env python3
# =============================================================
#  calm forest · Supabase → BigQuery 증분 적재 + Supabase 경량화(prune)
#  ------------------------------------------------------------
#  동작 순서(안전):
#    1) game_logs: BQ의 max(id) 이후 행만 Supabase에서 읽어 BQ에 append
#    2) game_saves: 전체 스냅샷을 BQ에 덮어쓰기(WRITE_TRUNCATE) — Supabase는 그대로 둠
#    3) prune: BQ 적재가 끝난 뒤에만, RETENTION_DAYS(기본 7일) 지난 game_logs 삭제
#  ★ game_saves 는 유저의 현재 저장 상태이므로 절대 삭제하지 않음.
#  ★ Supabase 읽기/삭제는 REST(PostgREST, HTTPS)로 → IPv6/풀러 이슈 회피.
# =============================================================
import os
import json
import tempfile
from datetime import datetime, timezone, timedelta

import requests
from google.cloud import bigquery

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_ROLE = os.environ["SUPABASE_SERVICE_ROLE"]
BQ_PROJECT = os.environ["BQ_PROJECT"]
BQ_DATASET = os.environ["BQ_DATASET"]
BQ_LOCATION = os.environ.get("BQ_LOCATION", "US")
RETENTION_DAYS = int(os.environ.get("RETENTION_DAYS", "7"))

HEADERS = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
PAGE = 1000

LOGS_SCHEMA = [
    bigquery.SchemaField("id", "INT64"),
    bigquery.SchemaField("user_id", "STRING"),
    bigquery.SchemaField("session_id", "STRING"),
    bigquery.SchemaField("mouse_x", "FLOAT"),
    bigquery.SchemaField("mouse_y", "FLOAT"),
    bigquery.SchemaField("char_x", "FLOAT"),
    bigquery.SchemaField("char_y", "FLOAT"),
    bigquery.SchemaField("char_z", "FLOAT"),
    bigquery.SchemaField("cam_yaw", "FLOAT"),
    bigquery.SchemaField("cam_pitch", "FLOAT"),
    bigquery.SchemaField("created_at", "TIMESTAMP"),
]
SAVES_SCHEMA = [
    bigquery.SchemaField("user_id", "STRING"),
    bigquery.SchemaField("state", "STRING"),        # jsonb → 문자열로 보관
    bigquery.SchemaField("updated_at", "TIMESTAMP"),
]


def bq_client():
    """GCP 서비스계정 키(JSON, env)로 BigQuery 클라이언트 생성."""
    path = os.path.join(tempfile.gettempdir(), "gcp_sa.json")
    with open(path, "w") as f:
        f.write(os.environ["GCP_SA_KEY"])
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = path
    return bigquery.Client(project=BQ_PROJECT)


def ensure_tables(client):
    ds = bigquery.Dataset(f"{BQ_PROJECT}.{BQ_DATASET}")
    ds.location = BQ_LOCATION
    client.create_dataset(ds, exists_ok=True)
    client.create_table(bigquery.Table(f"{BQ_PROJECT}.{BQ_DATASET}.game_logs", schema=LOGS_SCHEMA), exists_ok=True)
    client.create_table(bigquery.Table(f"{BQ_PROJECT}.{BQ_DATASET}.game_saves", schema=SAVES_SCHEMA), exists_ok=True)


def bq_max_log_id(client):
    q = f"SELECT MAX(id) AS m FROM `{BQ_PROJECT}.{BQ_DATASET}.game_logs`"
    for row in client.query(q, location=BQ_LOCATION).result():  # 리전 명시(서울 등 비US 대응)
        return row.m or 0
    return 0


def fetch_logs_after(after_id):
    """id > after_id 인 game_logs 를 페이지 단위로 모두 읽음."""
    rows, last = [], after_id
    while True:
        url = f"{SUPABASE_URL}/rest/v1/game_logs?select=*&id=gt.{last}&order=id.asc&limit={PAGE}"
        r = requests.get(url, headers=HEADERS, timeout=60)
        r.raise_for_status()
        batch = r.json()
        if not batch:
            break
        rows.extend(batch)
        last = batch[-1]["id"]
        if len(batch) < PAGE:
            break
    return rows


def fetch_all_saves():
    url = f"{SUPABASE_URL}/rest/v1/game_saves?select=*"
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return [
        {"user_id": s.get("user_id"), "state": json.dumps(s.get("state"), ensure_ascii=False),
         "updated_at": s.get("updated_at")}
        for s in r.json()
    ]


def load_json(client, table, rows, schema, mode):
    if not rows:
        return 0
    cfg = bigquery.LoadJobConfig(schema=schema, write_disposition=mode, ignore_unknown_values=True)
    client.load_table_from_json(rows, f"{BQ_PROJECT}.{BQ_DATASET}.{table}", job_config=cfg, location=BQ_LOCATION).result()
    return len(rows)


def prune_old_logs():
    """BQ 적재 후에만 호출 — 7일 지난 game_logs 만 Supabase에서 삭제(saves는 건드리지 않음)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat()
    url = f"{SUPABASE_URL}/rest/v1/game_logs?created_at=lt.{cutoff}"
    r = requests.delete(url, headers={**HEADERS, "Prefer": "return=minimal"}, timeout=120)
    r.raise_for_status()
    print(f"[prune] game_logs older than {cutoff} deleted from Supabase")


def main():
    client = bq_client()
    ensure_tables(client)

    after = bq_max_log_id(client)
    logs = fetch_logs_after(after)
    n_logs = load_json(client, "game_logs", logs, LOGS_SCHEMA, "WRITE_APPEND")

    saves = fetch_all_saves()
    n_saves = load_json(client, "game_saves", saves, SAVES_SCHEMA, "WRITE_TRUNCATE")

    print(f"[export] logs +{n_logs} (after id {after}) · saves snapshot {n_saves}")

    # 적재가 성공적으로 끝난 뒤에만 경량화
    prune_old_logs()
    print("[done] export + prune complete")


if __name__ == "__main__":
    main()
