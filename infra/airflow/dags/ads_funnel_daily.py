from __future__ import annotations

import datetime as dt
import json
import os
import re
import statistics
import urllib.request

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator

KST = pendulum.timezone("Asia/Seoul")
SA_KEY = os.environ.get("GCP_SA_KEY_PATH", "/opt/airflow/secrets/gcp_sa.json")
SLACK_TOKEN_PATH = os.environ.get("SLACK_KPI_TOKEN_PATH", "/opt/airflow/secrets/slack_kpi_bot")
SQL_PATH = os.environ.get("ADS_SQL_PATH", "/opt/airflow/dags/sql/ads_funnel.sql")
BQ_PROJECT = os.environ.get("BQ_PROJECT", "calm-forest")
BQ_LOCATION = os.environ.get("BQ_LOCATION", "asia-northeast3")
GA4_DATASET = "analytics_547127440"
DEFAULT_CHANNEL = "C0C7FNDACJF"

CAMPAIGN_DAYS = 21
STALE_DAYS = 2
FIRST_ROW = 3
SHEET_EPOCH = dt.date(1899, 12, 30)
FUNNEL_TAB = "2_일별깔때기"
PREREG_TAB = "1_사전등록"
START_CELL = "B13"
CREATIVE_TAB = "_auto_소재"
META_TAB = "_auto_meta"

WEB_COLS = ("landed", "first_play", "harvest", "shown_aos", "shown_ios", "holdout", "click_aos", "click_ios")
APP_COLS = ("open_aos", "open_ios", "app_login", "app_d1")
SOFT_PAIRS = (("harvest", "first_play"), ("click_aos", "shown_aos"), ("click_ios", "shown_ios"))
UTM_MISSING_RATIO, UTM_MIN_LANDED = 0.2, 10
SPIKE_FACTOR, SPIKE_MIN_MEDIAN = 5.0, 3

LATEST_SQL = f"""
SELECT MAX(PARSE_DATE('%Y%m%d', REGEXP_EXTRACT(table_name, r'^events_(\\d{{8}})$'))) AS latest
FROM `{BQ_PROJECT}.{GA4_DATASET}.INFORMATION_SCHEMA.TABLES`
WHERE REGEXP_CONTAINS(table_name, r'^events_\\d{{8}}$')
"""
DAILY_SQL = f"SELECT * FROM `{BQ_PROJECT}.ads.funnel_daily` ORDER BY d"
CREATIVE_SQL = f"""
SELECT campaign, content, os, SUM(landed) AS landed, SUM(first_play) AS first_play, SUM(harvest) AS harvest,
  SUM(banner_click) AS banner_click, SUM(app_open) AS app_open, SUM(app_d1) AS app_d1
FROM `{BQ_PROJECT}.ads.creative_daily` GROUP BY 1, 2, 3 ORDER BY landed DESC
"""
DEV_SQL = f"SELECT COUNTIF(dev = 1) AS n FROM `{BQ_PROJECT}.ads.funnel_user`"
SL_LATEST_SQL = f"SELECT MAX(DATE(started_at, 'Asia/Seoul')) AS latest FROM `{BQ_PROJECT}.calm_forest_raw.session_logs`"
ZERO_ROW = dict.fromkeys(WEB_COLS + APP_COLS + ("no_campaign",), 0)


def to_date(cell) -> dt.date | None:
    if cell is None or cell == "":
        return None
    if isinstance(cell, (int, float)):
        return SHEET_EPOCH + dt.timedelta(days=int(cell))
    m = re.fullmatch(r"\s*(\d{4})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})\.?\s*", str(cell))
    if not m:
        raise ValueError(f"not a date: {cell!r}")
    return dt.date(*map(int, m.groups()))


def resolve_window(start: dt.date | None, latest: dt.date) -> dict | None:
    if start is None:
        return {"start": latest - dt.timedelta(days=CAMPAIGN_DAYS - 1), "land_end": latest,
                "end": latest, "publish": False}
    if latest < start:
        return None
    land_end = min(start + dt.timedelta(days=CAMPAIGN_DAYS - 1), latest)
    return {"start": start, "land_end": land_end, "end": latest, "publish": True}


def _safe_date(cell) -> dt.date | None:
    try:
        return to_date(cell)
    except ValueError:
        return None


def sheet_updates(date_cells: list, daily: dict, end: dt.date) -> list[dict]:
    ups = []
    for i, cell in enumerate(date_cells):
        d = _safe_date(cell)
        if d is None or d > end:
            continue
        r = FIRST_ROW + i
        row = daily.get(d, ZERO_ROW)
        app = [int(row[c]) for c in APP_COLS]
        if d >= end - dt.timedelta(days=1):
            app[-1] = ""
        ups.append({"range": f"H{r}:O{r}", "values": [[int(row[c]) for c in WEB_COLS]]})
        ups.append({"range": f"T{r}:W{r}", "values": [app]})
    return ups


def shrinking_days(date_cells: list, published: list, daily: dict) -> list[str]:
    msgs = []
    for cell, old in zip(date_cells, published):
        d = _safe_date(cell)
        if d is None or not isinstance(old, (int, float)):
            continue
        new = int(daily.get(d, ZERO_ROW)["landed"])
        if new < old:
            msgs.append(f"{d} 랜딩이 시트 {int(old)}명 → 새 계산 {new}명으로 줄어듦 (utm source·GA4 변경 확인)")
    return msgs


def _dense(rows: list[dict], start: dt.date, land_end: dt.date) -> list[dict]:
    by_day = {r["d"]: r for r in rows}
    days = [start + dt.timedelta(days=i) for i in range((land_end - start).days + 1)]
    return [by_day.get(d, {**ZERO_ROW, "d": d}) for d in days]


def quality(rows: list[dict], *, start: dt.date, land_end: dt.date, latest: dt.date, today: dt.date,
            sl_latest: dt.date | None) -> tuple[list[str], list[str]]:
    hard, soft = [], []
    lag = (today - latest).days
    if lag > STALE_DAYS:
        hard.append(f"GA4 내보내기 {lag}일째 멈춤 (마지막 events_{latest:%Y%m%d})")
    if sl_latest is None or sl_latest < latest:
        hard.append(f"session_logs 동기화 지연 (마지막 {sl_latest}, GA4 {latest}) — 앱 열이 덜 세짐")
    dense = _dense(rows, start, land_end)
    for row in dense:
        odd = [f"{a}({row[a]})>{b}({row[b]})" for a, b in SOFT_PAIRS if row[a] > row[b]]
        if odd:
            soft.append(f"{row['d']} 순서가 뒤바뀐 단계: {', '.join(odd)}")
    if dense:
        last = dense[-1]
        if last["landed"] >= UTM_MIN_LANDED and last["no_campaign"] / last["landed"] > UTM_MISSING_RATIO:
            soft.append(f"{last['d']} 랜딩 {last['landed']}명 중 {last['no_campaign']}명이 utm_campaign 없음")
        prev = [r["landed"] for r in dense[-8:-1]]
        if len(prev) >= 3:
            med = statistics.median(prev)
            if med >= SPIKE_MIN_MEDIAN and last["landed"] > SPIKE_FACTOR * med:
                soft.append(f"{last['d']} 랜딩 {last['landed']}명 — 직전 중앙값 {med:g}의 {SPIKE_FACTOR:g}배 초과 (봇·소재 변경 확인)")
    return hard, soft


def _post_slack(text: str, channel: str) -> None:
    with open(SLACK_TOKEN_PATH, encoding="utf-8") as f:
        token = f.read().strip()
    req = urllib.request.Request(
        "https://slack.com/api/chat.postMessage",
        data=json.dumps({"channel": channel, "text": text}).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8", "Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        body = json.loads(r.read().decode("utf-8"))
    if not body.get("ok"):
        raise RuntimeError(f"slack error: {body.get('error')}")


def _notify(text: str) -> None:
    from airflow.models import Variable
    try:
        _post_slack(text, Variable.get("ads_slack_channel", default_var=DEFAULT_CHANNEL))
    except Exception as e:
        print(f"slack post failed: {e!r}")


def _bq():
    from google.cloud import bigquery
    return bigquery.Client.from_service_account_json(SA_KEY, project=BQ_PROJECT)


def _sheet():
    import gspread
    from airflow.models import Variable
    return gspread.service_account(filename=SA_KEY).open_by_key(Variable.get("ads_sheet_id"))


def _resolve(**_) -> dict | None:
    from gspread.utils import ValueRenderOption
    latest = list(_bq().query(LATEST_SQL, location=BQ_LOCATION).result())[0]["latest"]
    cell = _sheet().worksheet(PREREG_TAB).get(START_CELL, value_render_option=ValueRenderOption.unformatted)
    start = to_date(cell[0][0] if cell and cell[0] else None)
    w = resolve_window(start, latest)
    print(json.dumps({"latest": str(latest), "start": str(start), "window": w}, default=str, ensure_ascii=False))
    return None if w is None else {k: (v.isoformat() if isinstance(v, dt.date) else v) for k, v in w.items()}


def _build(ti, **_) -> None:
    from airflow.exceptions import AirflowSkipException
    from airflow.models import Variable
    from google.cloud import bigquery
    w = ti.xcom_pull(task_ids="resolve_window")
    if not w:
        raise AirflowSkipException("campaign start date is after the latest GA4 table")
    with open(SQL_PATH, encoding="utf-8") as f:
        script = f.read()
    params = [bigquery.ScalarQueryParameter(k, "DATE", dt.date.fromisoformat(w[k])) for k in ("start", "end", "land_end")]
    params.append(bigquery.ScalarQueryParameter("src", "STRING", Variable.get("ads_utm_source", default_var="meta")))
    _bq().query(script, job_config=bigquery.QueryJobConfig(query_parameters=params), location=BQ_LOCATION).result()


def _check(ti, **_) -> None:
    w = ti.xcom_pull(task_ids="resolve_window")
    client = _bq()
    rows = [dict(r) for r in client.query(DAILY_SQL, location=BQ_LOCATION).result()]
    dev = list(client.query(DEV_SQL, location=BQ_LOCATION).result())[0]["n"]
    sl_latest = list(client.query(SL_LATEST_SQL, location=BQ_LOCATION).result())[0]["latest"]
    today = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()
    hard, soft = quality(rows, start=dt.date.fromisoformat(w["start"]), land_end=dt.date.fromisoformat(w["land_end"]),
                         latest=dt.date.fromisoformat(w["end"]), today=today, sl_latest=sl_latest)
    print(json.dumps({"hard": hard, "soft": soft, "days": len(rows), "dev_users": dev}, ensure_ascii=False))
    if hard or soft:
        head = ":no_entry: *광고 깔때기 품질 체크 실패 — 시트 갱신 중단*" if hard else ":warning: *광고 깔때기 품질 경고*"
        _notify("\n".join([head] + [f"• {x}" for x in hard + soft]))
    if hard:
        raise RuntimeError("; ".join(hard))


def _publish(ti, **_) -> None:
    from airflow.exceptions import AirflowSkipException
    from gspread.utils import ValueRenderOption
    w = ti.xcom_pull(task_ids="resolve_window")
    if not w["publish"]:
        raise AirflowSkipException(f"{PREREG_TAB}!{START_CELL} is empty — preview only")
    client = _bq()
    daily = {r["d"]: dict(r) for r in client.query(DAILY_SQL, location=BQ_LOCATION).result()}
    creative = list(client.query(CREATIVE_SQL, location=BQ_LOCATION).result())
    sh = _sheet()
    ws = sh.worksheet(FUNNEL_TAB)
    last_row = FIRST_ROW + CAMPAIGN_DAYS - 1
    grid = ws.get(f"A{FIRST_ROW}:H{last_row}", value_render_option=ValueRenderOption.unformatted)
    grid = grid + [[]] * (CAMPAIGN_DAYS - len(grid))
    dates = [r[0] if r else "" for r in grid]
    published = [r[7] if len(r) > 7 else "" for r in grid]
    shrunk = shrinking_days(dates, published, daily)
    if shrunk:
        _notify("\n".join([":no_entry: *광고 깔때기 — 이미 게시된 숫자가 줄어 시트 갱신 중단*"] + [f"• {x}" for x in shrunk]))
        raise RuntimeError("; ".join(shrunk))
    ups = sheet_updates(dates, daily, dt.date.fromisoformat(w["end"]))
    if ups:
        ws.batch_update(ups, value_input_option="RAW")
    _replace_tab(sh, CREATIVE_TAB, [["campaign", "content", "os", "landed", "first_play", "harvest",
                                     "banner_click", "app_open", "app_d1"]] + [list(r.values()) for r in creative])
    now = pendulum.now(KST).format("YYYY-MM-DD HH:mm")
    _replace_tab(sh, META_TAB, [["generated_at_kst", "ga4_latest", "landing_window"],
                                [now, w["end"], f"{w['start']} ~ {w['land_end']}"]])


def _replace_tab(sh, title: str, values: list[list]) -> None:
    import gspread
    try:
        ws = sh.worksheet(title)
    except gspread.WorksheetNotFound:
        ws = sh.add_worksheet(title=title, rows=len(values) + 10, cols=len(values[0]))
    ws.clear()
    ws.resize(rows=max(len(values) + 10, 10), cols=len(values[0]))
    ws.update(values=values, range_name="A1", value_input_option="RAW")


with DAG(
    dag_id="ads_funnel_daily",
    description="메타 광고 유입 깔때기(GA4·session_logs) → ads 마트 → 기록 시트 자동 열",
    start_date=pendulum.datetime(2026, 10, 15, tz=KST),
    schedule="0 10,20 * * *",
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 2, "retry_delay": dt.timedelta(minutes=20)},
    tags=["ads", "funnel"],
) as dag_ads:
    resolve = PythonOperator(task_id="resolve_window", python_callable=_resolve)
    build = PythonOperator(task_id="build_mart", python_callable=_build)
    check = PythonOperator(task_id="check_quality", python_callable=_check, retries=0)
    publish = PythonOperator(task_id="publish_sheet", python_callable=_publish)
    resolve >> build >> check >> publish
