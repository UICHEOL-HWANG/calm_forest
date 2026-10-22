"""calm forest · 클라이언트 오류 로그 하루 묶기 (매일 04:30 KST).

근거
  dev/active/client-logs/client-logs-plan.md — 기기 오류는 /api/logs 가 Supabase client_errors 에 바로 쌓고,
  이 DAG 가 하루 한 번 어제치(KST)를 파일 1개로 묶어 OCI 버킷에 올린다. OCI 무료 API 요청은 월 5만이라
  "묶음마다 파일"이 아니라 "하루에 파일 하나"로 간다.

동작 (어제 KST 하루)
  ① Supabase client_errors 에서 어제치 전부 읽기
  ② ndjson.gz 1개 → OCI client-logs/YYYY/MM/DD.ndjson.gz (같은 키로 덮어써서 재실행해도 1개) · 크기 확인
  ③ BigQuery calm_forest_raw.client_errors 의 그날 파티션을 통째로 교체(load job, WRITE_TRUNCATE — 재실행 안전)
  ④ client_error_daily 요약 upsert(날짜 × 오류 서명: 건수·유저 수·플랫폼·파일 경로)
  ⑤ ②③④ 가 전부 성공했을 때만 Supabase 원본 어제치를 지운다
  ⑥ 30일 지난 버킷 파일 1개 정리(lifecycle 대신 — 콘솔 설정 없이 코드로)
  ⑦ 어제 행 수(같은 오류 반복으로 묶인 suppressed 제외)가 직전 7일 평균의 3배 이상(최소 50건)이고
     영향받은 유저가 3명 이상이면 슬랙 #cf-data

배포
  scp infra/airflow/dags/client_logs_daily.py oracle-calmforest:/opt/airflow/dags/

사전 준비(한 번만, VM /opt/airflow/secrets, 권한 600)
  gcp_sa.json            — 이미 있음(anomaly_watch 와 공유)
  slack_kpi_bot          — 이미 있음
  supabase_service.json  — {"url": "...", "service_key": "..."}
  oci_s3.json            — {"namespace","region","bucket","access_key","secret_key"} (사진첩 Worker 와 같은 고객 비밀 키)
"""
from __future__ import annotations

import datetime as dt
import gzip
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator

KST = pendulum.timezone("Asia/Seoul")
KST_TZ = dt.timezone(dt.timedelta(hours=9))
SECRETS = os.environ.get("CF_SECRETS_DIR", "/opt/airflow/secrets")
SA_KEY = os.environ.get("GCP_SA_KEY_PATH", f"{SECRETS}/gcp_sa.json")
SLACK_TOKEN_PATH = os.environ.get("SLACK_KPI_TOKEN_PATH", f"{SECRETS}/slack_kpi_bot")
BQ_PROJECT = os.environ.get("BQ_PROJECT", "calm-forest")
BQ_DATASET = os.environ.get("BQ_DATASET", "calm_forest_raw")
BQ_LOCATION = os.environ.get("BQ_LOCATION", "asia-northeast3")
DEFAULT_CHANNEL = "C0C7FNDACJF"   # #cf-data (KPI)

PREFIX = "client-logs"
KEEP_DAYS = 30
PAGE = 1000
MAX_ROWS = 25000                  # DB 함수 하루 상한(2만) + 여유 — 넘으면 이상 상황이라 멈춘다
SPIKE_MIN, SPIKE_MULT, SPIKE_MIN_USERS = 50, 3.0, 3

BQ_SCHEMA = [
    ("day", "DATE"), ("id", "STRING"), ("received_at", "TIMESTAMP"), ("ts", "TIMESTAMP"),
    ("kind", "STRING"), ("msg", "STRING"), ("stack", "STRING"), ("url", "STRING"), ("status", "INTEGER"),
    ("platform", "STRING"), ("uid8", "STRING"), ("path", "STRING"), ("suppressed", "INTEGER"),
]


# ── 순수 함수(테스트 대상) ─────────────────────────────────────────────

def kst_day_bounds(day: dt.date) -> tuple[str, str]:
    """KST 하루 → [시작, 끝) UTC ISO."""
    start = dt.datetime.combine(day, dt.time(0), KST_TZ).astimezone(dt.timezone.utc)
    end = start + dt.timedelta(days=1)
    return start.isoformat(), end.isoformat()


def object_key(day: dt.date) -> str:
    return f"{PREFIX}/{day:%Y/%m/%d}.ndjson.gz"


def expired_key(day: dt.date) -> str:
    return object_key(day - dt.timedelta(days=KEEP_DAYS))


def to_ndjson_gz(rows: list[dict]) -> bytes:
    text = "\n".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) for r in rows)
    return gzip.compress(text.encode("utf-8"), mtime=0)


def error_sig(row: dict) -> str:
    """같은 오류 묶음 키 — client-errors.js 의 반복 서명과 같은 모양(kind | msg 앞 200자 | status)."""
    status = "" if row.get("status") is None else str(row["status"])
    return f"{row.get('kind', '')}|{(row.get('msg') or '')[:200]}|{status}"[:300]


def summarize(rows: list[dict], day: dt.date, file_key: str) -> list[dict]:
    groups: dict[str, dict] = {}
    users: dict[str, set] = defaultdict(set)
    for r in rows:
        sig = error_sig(r)
        g = groups.setdefault(sig, {"day": day.isoformat(), "sig": sig, "kind": r.get("kind") or "",
                                    "sample_msg": (r.get("msg") or "")[:600], "n": 0, "rows": 0, "users": 0,
                                    "platforms": {}, "file_key": file_key})
        g["n"] += 1 + int(r.get("suppressed") or 0)
        g["rows"] += 1
        if r.get("uid8"):
            users[sig].add(r["uid8"])
        p = r.get("platform") or "unknown"
        g["platforms"] = {**g["platforms"], p: g["platforms"].get(p, 0) + 1}
    return [{**g, "users": len(users[g["sig"]])} for g in groups.values()]


def day_users(rows: list[dict]) -> int:
    return len({r["uid8"] for r in rows if r.get("uid8")})


def spike_total(summary: list[dict]) -> int:
    return sum(g["rows"] for g in summary)


def is_spike(today_total: int, prior_totals: list[int], users: int) -> bool:
    if today_total < SPIKE_MIN or users < SPIKE_MIN_USERS:
        return False
    if not prior_totals:
        return True
    avg = sum(prior_totals) / len(prior_totals)
    return today_total >= SPIKE_MULT * max(avg, 1)


def s3_headers(method: str, host: str, path: str, body: bytes, region: str,
               access_key: str, secret_key: str, when: dt.datetime) -> dict:
    """AWS SigV4 헤더 서명 — functions/api/photo.js s3Fetch 와 같은 방식(OCI S3 호환 API)."""
    ts = when.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    date = ts[:8]
    payload_hash = hashlib.sha256(body).hexdigest()
    headers = {"host": host, "x-amz-content-sha256": payload_hash, "x-amz-date": ts}
    names = sorted(headers)
    canon = "\n".join([method, path, "", "".join(f"{h}:{headers[h]}\n" for h in names),
                       ";".join(names), payload_hash])
    scope = f"{date}/{region}/s3/aws4_request"
    to_sign = "\n".join(["AWS4-HMAC-SHA256", ts, scope, hashlib.sha256(canon.encode()).hexdigest()])
    k = hmac.new(f"AWS4{secret_key}".encode(), date.encode(), hashlib.sha256).digest()
    for part in (region, "s3", "aws4_request"):
        k = hmac.new(k, part.encode(), hashlib.sha256).digest()
    sig = hmac.new(k, to_sign.encode(), hashlib.sha256).hexdigest()
    out = {h: v for h, v in headers.items() if h != "host"}
    out["authorization"] = (f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, "
                            f"SignedHeaders={';'.join(names)}, Signature={sig}")
    return out


# ── 외부 호출 ────────────────────────────────────────────────────────

def _secret_json(name: str) -> dict:
    with open(f"{SECRETS}/{name}", encoding="utf-8") as f:
        return json.load(f)


def _http(method: str, url: str, headers: dict, body: bytes | None = None) -> tuple[int, bytes, dict]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


def _sb_headers(sb: dict, extra: dict | None = None) -> dict:
    return {"apikey": sb["service_key"], "Authorization": f"Bearer {sb['service_key']}", **(extra or {})}


def _range_query(start: str, end: str) -> str:
    return f"received_at=gte.{urllib.parse.quote(start)}&received_at=lt.{urllib.parse.quote(end)}"


def fetch_day(sb: dict, start: str, end: str) -> list[dict]:
    rows: list[dict] = []
    while True:
        url = (f"{sb['url']}/rest/v1/client_errors?select=*&{_range_query(start, end)}"
               f"&order=received_at.asc,id.asc&limit={PAGE}&offset={len(rows)}")
        status, body, _ = _http("GET", url, _sb_headers(sb))
        if status != 200:
            raise RuntimeError(f"supabase read {status}: {body[:200]!r}")
        page = json.loads(body)
        rows.extend(page)
        if len(page) < PAGE:
            return rows
        if len(rows) > MAX_ROWS:
            raise RuntimeError(f"too many rows ({len(rows)}) — 하루 상한을 넘었다, 수동 확인 필요")


def oci_call(oci: dict, method: str, key: str, body: bytes = b"") -> tuple[int, bytes, dict]:
    host = f"{oci['namespace']}.compat.objectstorage.{oci['region']}.oraclecloud.com"
    path = f"/{oci['bucket']}/{key}"
    h = s3_headers(method, host, path, body, oci["region"], oci["access_key"], oci["secret_key"],
                   dt.datetime.now(dt.timezone.utc))
    if method == "PUT":
        h["content-type"] = "application/gzip"
    return _http(method, f"https://{host}{path}", h, body if method == "PUT" else None)


def load_bq(rows: list[dict], day: dt.date) -> int:
    from google.cloud import bigquery

    client = bigquery.Client.from_service_account_json(SA_KEY, project=BQ_PROJECT)
    table_id = f"{BQ_PROJECT}.{BQ_DATASET}.client_errors"
    schema = [bigquery.SchemaField(n, t) for n, t in BQ_SCHEMA]
    table = bigquery.Table(table_id, schema=schema)
    table.time_partitioning = bigquery.TimePartitioning(field="day")
    client.create_table(table, exists_ok=True)
    data = [{**{n: r.get(n) for n, _ in BQ_SCHEMA}, "day": day.isoformat()} for r in rows]
    cfg = bigquery.LoadJobConfig(schema=schema, write_disposition="WRITE_TRUNCATE",
                                 source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON)
    client.load_table_from_json(data, f"{table_id}${day:%Y%m%d}", job_config=cfg, location=BQ_LOCATION).result()
    return len(data)


def upsert_summary(sb: dict, rows: list[dict]) -> None:
    if not rows:
        return
    url = f"{sb['url']}/rest/v1/client_error_daily?on_conflict=day,sig"
    status, body, _ = _http("POST", url, _sb_headers(sb, {"Content-Type": "application/json",
                                                         "Prefer": "resolution=merge-duplicates,return=minimal"}),
                            json.dumps(rows, ensure_ascii=False).encode("utf-8"))
    if status not in (200, 201, 204):
        raise RuntimeError(f"summary upsert {status}: {body[:200]!r}")


def purge_day(sb: dict, start: str, end: str) -> None:
    url = f"{sb['url']}/rest/v1/client_errors?{_range_query(start, end)}"
    status, body, _ = _http("DELETE", url, _sb_headers(sb, {"Prefer": "return=minimal"}))
    if status not in (200, 204):
        raise RuntimeError(f"purge {status}: {body[:200]!r}")


def prior_day_value(r: dict) -> int:
    return int(r["n"] if r.get("rows") is None else r["rows"])


def prior_totals(sb: dict, day: dt.date) -> list[int]:
    since = (day - dt.timedelta(days=7)).isoformat()
    url = (f"{sb['url']}/rest/v1/client_error_daily?select=day,n,rows"
           f"&day=gte.{since}&day=lt.{day.isoformat()}")
    status, body, _ = _http("GET", url, _sb_headers(sb))
    if status != 200:
        return []
    by_day: dict[str, int] = defaultdict(int)
    for r in json.loads(body):
        by_day[r["day"]] += prior_day_value(r)
    return list(by_day.values())


def _post_slack(text: str, channel: str) -> None:
    with open(SLACK_TOKEN_PATH, encoding="utf-8") as f:
        token = f.read().strip()
    status, body, _ = _http("POST", "https://slack.com/api/chat.postMessage",
                            {"Content-Type": "application/json; charset=utf-8", "Authorization": f"Bearer {token}"},
                            json.dumps({"channel": channel, "text": text}).encode("utf-8"))
    if status != 200 or not json.loads(body).get("ok"):
        raise RuntimeError(f"slack error: {body[:200]!r}")


def _target_day(context: dict) -> dt.date:
    dis = context.get("data_interval_start")
    if dis is not None:
        return dis.in_timezone("Asia/Seoul").date()
    return (dt.datetime.now(KST_TZ) - dt.timedelta(days=1)).date()


def _run(**context) -> dict:
    day = _target_day(context)
    start, end = kst_day_bounds(day)
    sb, oci = _secret_json("supabase_service.json"), _secret_json("oci_s3.json")

    rows = fetch_day(sb, start, end)
    key = object_key(day)
    summary = summarize(rows, day, key)
    if rows:
        blob = to_ndjson_gz(rows)
        status, body, _ = oci_call(oci, "PUT", key, blob)
        if status not in (200, 201):
            raise RuntimeError(f"oci put {status}: {body[:200]!r}")
        status, _, head = oci_call(oci, "HEAD", key)
        size = {k.lower(): v for k, v in head.items()}.get("content-length")
        if status != 200 or int(size or -1) != len(blob):
            raise RuntimeError(f"oci verify failed ({status}, {size} != {len(blob)}) — 원본을 지우지 않는다")
        load_bq(rows, day)
        upsert_summary(sb, summary)
        purge_day(sb, start, end)                                   # ⑤ 위가 전부 성공했을 때만

    old_status, _, _ = oci_call(oci, "DELETE", expired_key(day))    # ⑥ 없으면 404 — 무시
    total = spike_total(summary)
    users = day_users(rows)
    result = {"day": day.isoformat(), "rows": len(rows), "total": total, "users": users, "sigs": len(summary),
              "file": key if rows else None, "expired_delete": old_status}
    print(json.dumps(result, ensure_ascii=False))

    if is_spike(total, prior_totals(sb, day), users):
        from airflow.models import Variable

        top = sorted(summary, key=lambda g: -g["rows"])[:3]
        lines = [f"🧯 클라이언트 오류 급증 · {day} · {total}건 · 유저 {users}명 (직전 7일 평균의 {SPIKE_MULT:g}배 이상)"]
        lines += [f"• {g['rows']}건 · 유저 {g['users']}명 · {g['sample_msg'][:120]}" for g in top]
        lines.append(f"원본: OCI {key}")
        _post_slack("\n".join(lines), Variable.get("anomaly_slack_channel", default_var=DEFAULT_CHANNEL))
    return result


with DAG(
    dag_id="client_logs_daily",
    description="어제(KST) 클라이언트 오류 → OCI 버킷 파일 1개 + BigQuery + 요약, 원본 정리, 급증 시 슬랙",
    start_date=pendulum.datetime(2026, 10, 13, tz=KST),
    schedule="30 4 * * *",          # 04:30 KST — 저트래픽 · anomaly_watch(05:00) 앞
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 3, "retry_delay": dt.timedelta(minutes=20)},
    tags=["client-logs", "alert"],
) as dag_client_logs:
    PythonOperator(task_id="bundle_client_errors", python_callable=_run)
