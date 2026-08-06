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
# 익명(게스트) 계정 삭제 유예일 — 이 기간 지난 익명 계정만 정리(로그는 이미 BQ에 있음)
ANON_RETENTION_DAYS = int(os.environ.get("ANON_RETENTION_DAYS", str(RETENTION_DAYS)))

HEADERS = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
PAGE = 1000

LOGS_SCHEMA = [
    bigquery.SchemaField("id", "INT64"),
    bigquery.SchemaField("user_id", "STRING"),
    bigquery.SchemaField("session_id", "STRING"),
    bigquery.SchemaField("client_id", "STRING"),   # 분석용 영구 기기 식별자
    bigquery.SchemaField("is_guest", "BOOL"),       # 게스트(익명) 여부
    bigquery.SchemaField("variant", "STRING"),      # A/B 변형(control/A/B)
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
# [계측] 경제 원장 — 코인 증감 {source,item,amount,balance} (id 증분 append)
ECON_SCHEMA = [
    bigquery.SchemaField("id", "INT64"),
    bigquery.SchemaField("user_id", "STRING"),
    bigquery.SchemaField("session_id", "STRING"),
    bigquery.SchemaField("client_id", "STRING"),
    bigquery.SchemaField("is_guest", "BOOL"),
    bigquery.SchemaField("variant", "STRING"),
    bigquery.SchemaField("source", "STRING"),       # shop_sell/shop_buy/quest_reward/...
    bigquery.SchemaField("item", "STRING"),
    bigquery.SchemaField("currency", "STRING"),
    bigquery.SchemaField("amount", "INT64"),        # +획득 / -소비
    bigquery.SchemaField("balance", "INT64"),       # 거래 후 잔액
    bigquery.SchemaField("created_at", "TIMESTAMP"),
]
# [계측] 세션 요약 — updated_at 증분 append(같은 세션이 여러 번 적재될 수 있음 →
#   분석 시 ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) 로 최신행만 사용)
SESSIONS_SCHEMA = [
    bigquery.SchemaField("session_id", "STRING"),
    bigquery.SchemaField("user_id", "STRING"),
    bigquery.SchemaField("client_id", "STRING"),
    bigquery.SchemaField("is_guest", "BOOL"),
    bigquery.SchemaField("variant", "STRING"),
    bigquery.SchemaField("play_sec", "INT64"),
    bigquery.SchemaField("counts", "STRING"),       # jsonb → 문자열로 보관
    bigquery.SchemaField("coins", "INT64"),
    bigquery.SchemaField("last_place", "STRING"),
    bigquery.SchemaField("last_x", "FLOAT"),
    bigquery.SchemaField("last_z", "FLOAT"),
    bigquery.SchemaField("started_at", "TIMESTAMP"),
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
    client.create_table(bigquery.Table(f"{BQ_PROJECT}.{BQ_DATASET}.econ_logs", schema=ECON_SCHEMA), exists_ok=True)      # [계측] 경제 원장
    client.create_table(bigquery.Table(f"{BQ_PROJECT}.{BQ_DATASET}.session_logs", schema=SESSIONS_SCHEMA), exists_ok=True)  # [계측] 세션 요약


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


def bq_max_econ_id(client):
    q = f"SELECT MAX(id) AS m FROM `{BQ_PROJECT}.{BQ_DATASET}.econ_logs`"
    for row in client.query(q, location=BQ_LOCATION).result():
        return row.m or 0
    return 0


def fetch_econ_after(after_id):
    """id > after_id 인 econ_logs 를 페이지 단위로 모두 읽음(game_logs 와 동일 패턴)."""
    rows, last = [], after_id
    while True:
        url = f"{SUPABASE_URL}/rest/v1/econ_logs?select=*&id=gt.{last}&order=id.asc&limit={PAGE}"
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


def bq_max_session_updated(client):
    q = f"SELECT MAX(updated_at) AS m FROM `{BQ_PROJECT}.{BQ_DATASET}.session_logs`"
    for row in client.query(q, location=BQ_LOCATION).result():
        return row.m  # None 이면 전체 적재
    return None


def fetch_sessions_after(after_ts):
    """updated_at > after_ts 인 session_logs 를 읽음(upsert 갱신분 append).
       같은 세션이 여러 번 실릴 수 있음 → BQ 쿼리에서 최신행만 dedup."""
    filt = ""
    if after_ts is not None:
        iso = after_ts.isoformat().replace("+00:00", "Z")
        filt = f"&updated_at=gt.{iso}"
    url = f"{SUPABASE_URL}/rest/v1/session_logs?select=*{filt}&order=updated_at.asc"
    r = requests.get(url, headers=HEADERS, timeout=60)
    r.raise_for_status()
    return [
        {**s, "counts": json.dumps(s.get("counts"), ensure_ascii=False)}  # jsonb → 문자열
        for s in r.json()
    ]


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
    # 신규 컬럼 자동 추가(ALLOW_FIELD_ADDITION)는 WRITE_APPEND 에서만 허용됨.
    # WRITE_TRUNCATE(세이브 스냅샷)에 붙이면 400 → APPEND일 때만 설정.
    if mode == "WRITE_APPEND":
        cfg.schema_update_options = [bigquery.SchemaUpdateOption.ALLOW_FIELD_ADDITION]
    client.load_table_from_json(rows, f"{BQ_PROJECT}.{BQ_DATASET}.{table}", job_config=cfg, location=BQ_LOCATION).result()
    return len(rows)


def prune_old_logs():
    """BQ 적재 후에만 호출 — 7일 지난 로그성 테이블만 Supabase에서 삭제(saves는 건드리지 않음)."""
    # ISO의 '+00:00'는 URL에서 '+'가 공백으로 해석돼 400 → 'Z'로 치환
    cutoff = (datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)).isoformat().replace('+00:00', 'Z')
    # (테이블, 기준 컬럼) — session_logs 는 마지막 갱신(updated_at) 기준으로 보존
    for table, col in [("game_logs", "created_at"), ("econ_logs", "created_at"), ("session_logs", "updated_at")]:
        url = f"{SUPABASE_URL}/rest/v1/{table}?{col}=lt.{cutoff}"
        r = requests.delete(url, headers={**HEADERS, "Prefer": "return=minimal"}, timeout=120)
        r.raise_for_status()
        print(f"[prune] {table} older than {cutoff} deleted from Supabase")


def _parse_ts(s):
    """ISO 타임스탬프 문자열 → aware datetime (Z/마이크로초 편차 대응)."""
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return datetime.fromisoformat(s[:19] + "+00:00")  # 초 단위로 잘라 파싱


def _list_all_auth_users():
    """GoTrue Admin API로 전체 유저를 페이지 단위로 수집(삭제 전 목록 고정용)."""
    users, page = [], 1
    while True:
        url = f"{SUPABASE_URL}/auth/v1/admin/users?page={page}&per_page=200"
        r = requests.get(url, headers=HEADERS, timeout=60)
        r.raise_for_status()
        data = r.json()
        batch = data.get("users", []) if isinstance(data, dict) else data
        if not batch:
            break
        users.extend(batch)
        if len(batch) < 200:
            break
        page += 1
    return users


def delete_old_anon_users():
    """생성 N일 지난 '익명(게스트)' 계정 삭제.
       ★ 반드시 export 이후 호출 — game_logs/game_saves 는 on delete cascade 라
         계정을 지우면 Supabase 잔여행도 함께 삭제됨(단, BQ 사본은 그대로 유지)."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=ANON_RETENTION_DAYS)
    targets = [
        u for u in _list_all_auth_users()
        if u.get("is_anonymous") and (_parse_ts(u.get("created_at")) or datetime.now(timezone.utc)) < cutoff
    ]
    deleted = 0
    for u in targets:
        dr = requests.delete(f"{SUPABASE_URL}/auth/v1/admin/users/{u['id']}", headers=HEADERS, timeout=60)
        if dr.status_code in (200, 204):
            deleted += 1
        else:
            print(f"[anon-clean] delete failed {u['id']}: {dr.status_code} {dr.text[:120]}")
    print(f"[anon-clean] deleted {deleted}/{len(targets)} anonymous users older than {ANON_RETENTION_DAYS}d")


def main():
    client = bq_client()
    ensure_tables(client)

    after = bq_max_log_id(client)
    logs = fetch_logs_after(after)
    n_logs = load_json(client, "game_logs", logs, LOGS_SCHEMA, "WRITE_APPEND")

    # [계측] 경제 원장 — id 증분 append
    econ_after = bq_max_econ_id(client)
    econ = fetch_econ_after(econ_after)
    n_econ = load_json(client, "econ_logs", econ, ECON_SCHEMA, "WRITE_APPEND")

    # [계측] 세션 요약 — updated_at 증분 append(최신행 dedup 은 분석 쿼리에서)
    sess_after = bq_max_session_updated(client)
    sessions = fetch_sessions_after(sess_after)
    n_sess = load_json(client, "session_logs", sessions, SESSIONS_SCHEMA, "WRITE_APPEND")

    saves = fetch_all_saves()
    n_saves = load_json(client, "game_saves", saves, SAVES_SCHEMA, "WRITE_TRUNCATE")

    print(f"[export] logs +{n_logs} (after id {after}) · econ +{n_econ} · sessions +{n_sess} · saves snapshot {n_saves}")

    # 적재가 성공적으로 끝난 뒤에만 경량화
    prune_old_logs()

    # 로그가 BQ에 안전히 이관된 뒤에만 익명 계정 정리(7일 유예)
    delete_old_anon_users()
    print("[done] export + prune + anon-clean complete")


if __name__ == "__main__":
    main()
