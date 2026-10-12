"""calm forest · 하루 기기 수 이상 탐지 → 슬랙 경보 (매일 05:00 KST).

근거
  이상 탐지 G2 (docs/analysis/ANALYSIS_GATES.md · dev/active/metrics-framework/anomaly-detection-prereg.md):
  원본 하루 기기 수(session_logs client_id)에 '직전 14일 평균 ± 3σ, 이미 경보 난 날은 기준선에서 제외'를 돌리면
  페르소나(봇) 유입을 첫날 잡았고 사고 밖 오경보는 30일에 0.88회였다. 같은 설정을 그대로 운영한다.
  공식 값(페르소나 대체 규칙·개발자·베타 제외)을 함께 보여 준다 — 원본만 튀면 '오염 가능성'으로 표시(음성 대조).

동작
  어제(KST) 를 포함한 최근 60일 하루 계열을 매번 다시 계산한다(상태 저장 없음, 기준선 제외 규칙도 매번 재현).
  어제가 경보면 KPI 채널에 한 번 보낸다. 경보가 없으면 보내지 않는다(로그만).

사슬
  Supabase --(GH Actions supabase-to-bq, 03:00 KST)--> BigQuery --(이 DAG, 05:00 KST)--> 슬랙 #cf-data

배포
  scp infra/airflow/dags/anomaly_watch.py oracle-calmforest:/opt/airflow/dags/

사전 준비(한 번만)
  슬랙 봇 토큰(xoxb, chat:write) 을 VM /opt/airflow/secrets/slack_kpi_bot (600) 에 둔다.
  채널은 Airflow Variable `anomaly_slack_channel` (없으면 KPI 채널 기본값).
"""
from __future__ import annotations

import datetime as dt
import json
import math
import os
import urllib.request

import pendulum
from airflow import DAG
from airflow.operators.python import PythonOperator

KST = pendulum.timezone("Asia/Seoul")
SA_KEY = os.environ.get("GCP_SA_KEY_PATH", "/opt/airflow/secrets/gcp_sa.json")
SLACK_TOKEN_PATH = os.environ.get("SLACK_KPI_TOKEN_PATH", "/opt/airflow/secrets/slack_kpi_bot")
BQ_PROJECT = os.environ.get("BQ_PROJECT", "calm-forest")
BQ_LOCATION = os.environ.get("BQ_LOCATION", "asia-northeast3")
DEFAULT_CHANNEL = "C0C7FNDACJF"   # #cf-data (KPI)

WARMUP, K, LOOKBACK_DAYS = 14, 3.0, 60   # 사전등록·G2 와 같은 설정

SERIES_SQL = """
WITH s AS (
  SELECT *, DATE(started_at, 'Asia/Seoul') AS d FROM `calm-forest.calm_forest_raw.session_logs`
  QUALIFY ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) = 1
),
dev AS (
  SELECT DISTINCT client_id FROM `calm-forest.calm_forest_raw.churn_events`
  WHERE client_id IS NOT NULL AND (origin LIKE 'http://localhost%' OR origin LIKE 'http://127.0.0.1%')
),
persona AS (  -- 이메일 목록은 VM 에 없으므로 정의서의 대체 규칙(계정 하나에 기기 4개+ · 첫 등장 9/28 이후)
  SELECT user_id FROM `calm-forest.calm_forest_raw.session_logs` WHERE user_id IS NOT NULL GROUP BY 1
  HAVING COUNT(DISTINCT client_id) >= 4 AND MIN(DATE(started_at, 'Asia/Seoul')) >= '2026-09-28'
)
SELECT d,
  COUNT(DISTINCT client_id) AS raw_devices,
  COUNT(DISTINCT IF(platform IN ('web', 'toss')
    AND IFNULL(user_id NOT IN (SELECT user_id FROM persona), TRUE)
    AND client_id NOT IN (SELECT client_id FROM dev)
    AND NOT (IFNULL(variant, '') IN ('beta_A', 'beta_B') AND d BETWEEN '2026-09-09' AND '2026-09-15'),
    client_id, NULL)) AS official_devices
FROM s
WHERE d BETWEEN @start AND @end
GROUP BY 1 ORDER BY 1
"""


def control_chart(values: list[float], warmup: int = WARMUP, k: float = K) -> list[dict]:
    """Phase II 개인값 관리도 — 직전 `warmup` 일(경보 난 날 제외) 평균 ± k·σ(표본표준편차).

    anomaly_g2.chart_alarms(method='mean') 와 같은 규칙. 반환: 날마다 center/lo/hi/alarm (준비 기간은 None).
    """
    alarm = [False] * len(values)
    out = []
    for t, x in enumerate(values):
        base = [values[i] for i in range(max(0, t - warmup), t) if not alarm[i]] if t >= warmup else []
        if len(base) < 2:
            out.append({"center": None, "lo": None, "hi": None, "alarm": False})
            continue
        c = sum(base) / len(base)
        s = math.sqrt(sum((b - c) ** 2 for b in base) / (len(base) - 1))
        lo, hi = c - k * s, c + k * s
        alarm[t] = x > hi or x < lo
        out.append({"center": c, "lo": lo, "hi": hi, "alarm": alarm[t]})
    return out


def assemble(rows: dict, start: dt.date, end: dt.date) -> tuple[list[float], list[float]]:
    """날짜별 계열. 어제(end) 행이 없으면 Supabase→BQ 동기화가 늦은 것 — 0 으로 채우면 '급감' 오경보가 나므로 실패시켜 재시도.
    기간 중간에 빠진 날은 실제로 접속 0 일 수 있어 0 으로 둔다."""
    if end not in rows:
        raise RuntimeError(f"no session_logs rows for {end} — BQ sync late? (will retry)")
    days = [start + dt.timedelta(days=i) for i in range((end - start).days + 1)]
    raw = [float(rows[d]["raw_devices"]) if d in rows else 0.0 for d in days]
    off = [float(rows[d]["official_devices"]) if d in rows else 0.0 for d in days]
    return raw, off


def build_message(day: str, raw: float, raw_chart: dict, official: float, official_chart: dict) -> str:
    """경보 한 건의 슬랙 문구. 원본만 튀면 오염 가능성, 둘 다 튀면 실제 변화 가능성."""
    direction = "급증" if raw > raw_chart["center"] else "급감"
    lines = [
        f":rotating_light: *하루 기기 수 이상 ({day})* — 원본 {raw:.0f}대 · {direction}",
        f"• 관리 한계(직전 14일 평균±3σ): {raw_chart['lo']:.1f} ~ {raw_chart['hi']:.1f} (평균 {raw_chart['center']:.1f})",
    ]
    if official_chart["center"] is None:
        lines.append(f"• 공식 값(웹·토스) {official:.0f}대 (기준선 준비 중)")
    elif official_chart["alarm"]:
        lines.append(f"• 공식 값(웹·토스) {official:.0f}대 도 한계 밖 → *실제 유입 변화 가능성* (배포·이벤트·광고 확인)")
    else:
        lines.append(f"• 공식 값(웹·토스) {official:.0f}대 는 정상 범위 → *봇·개발 기기·테스트 같은 오염 가능성* (페르소나·자동 접속 확인 · 안드로이드·iOS 앱 유입이면 정상)")
    lines.append("_근거: 이상 탐지 G2 — 봇 유입 첫날 탐지 · 오경보 30일에 0.9회_")
    return "\n".join(lines)


def _post_slack(text: str, channel: str) -> None:
    """실패하면 예외 → 태스크 재시도. 슬랙이 받았는데 응답만 끊긴 드문 경우엔 같은 경보가 두 번 갈 수 있다(감수)."""
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
        raise RuntimeError(f"slack error: {body.get('error')}")   # not_in_channel 이면 봇을 채널에 초대


def _check(**context) -> dict:
    from airflow.models import Variable
    from google.cloud import bigquery

    # 대상일 = 이 실행 회차의 데이터 구간 시작일(KST). 05:00 cron 이라 D-1 — 수동 재실행·자정 넘긴 재시도에도 같은 날
    dis = context.get("data_interval_start")
    end = dis.in_timezone("Asia/Seoul").date() if dis is not None else \
        (dt.datetime.now(dt.timezone(dt.timedelta(hours=9))) - dt.timedelta(days=1)).date()
    start = end - dt.timedelta(days=LOOKBACK_DAYS - 1)
    client = bigquery.Client.from_service_account_json(SA_KEY, project=BQ_PROJECT)
    cfg = bigquery.QueryJobConfig(query_parameters=[
        bigquery.ScalarQueryParameter("start", "DATE", start),
        bigquery.ScalarQueryParameter("end", "DATE", end)])
    rows = list(client.query(SERIES_SQL, job_config=cfg, location=BQ_LOCATION).result())
    raw, off = assemble({r["d"]: r for r in rows}, start, end)
    rc, oc = control_chart(raw)[-1], control_chart(off)[-1]
    summary = {"day": str(end), "raw": raw[-1], "official": off[-1], "raw_alarm": rc["alarm"], "official_alarm": oc["alarm"]}
    print(json.dumps(summary, ensure_ascii=False))
    if rc["alarm"]:
        _post_slack(build_message(str(end), raw[-1], rc, off[-1], oc),
                    Variable.get("anomaly_slack_channel", default_var=DEFAULT_CHANNEL))
    return summary


with DAG(
    dag_id="anomaly_watch",
    description="원본 하루 기기 수 관리도(평균±3σ) → 이상 시 슬랙 KPI 채널",
    start_date=pendulum.datetime(2026, 10, 12, tz=KST),
    schedule="0 5 * * *",           # 05:00 KST — Supabase→BQ(03:00 KST) 다음
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 3, "retry_delay": dt.timedelta(minutes=30)},   # 동기화 지연 대비
    tags=["anomaly", "alert"],
) as dag_anomaly:
    PythonOperator(task_id="check_daily_devices", python_callable=_check)
