# =============================================================
#  calm forest · 이탈 예측 — 주 1회 학습 + 야간 적립 업로드
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §5·§9
#
#  두 스케줄이 한 파일에 있다:
#    upload_events  매일 03:00  API 가 적립한 JSONL → BQ
#    train          매주 월 04:00  BQ → 학습 → coef.json (API 가 mtime 보고 핫리로드)
#
#  ⚠️ 학습 표본은 BQ 의 game_logs 에서 뽑는다. 적립 JSONL 은 '실제로 판정에 쓴 피처'의
#     기록이고, 다음 단계에서 학습 원천으로 옮길 예정이다(지금은 표본이 부족하다).
#     적립 행 중 session_id 가 game_logs 에 실재하는 것만 신뢰한다 — 그게 남용 방어다.
# =============================================================
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator

DATA_DIR = Path("/opt/calm-api/data")
MODEL_OUT = Path("/opt/calm-api/model/coef.json")
ML_DIR = Path("/opt/airflow/dags/ml")     # scp 로 올리는 ml/ 사본(train_churn.py·calm_ml·sql)

BQ_PROJECT = "calm-forest"
BQ_LOCATION = "asia-northeast3"
EVENTS_TABLE = f"{BQ_PROJECT}.calm_forest_raw.churn_events"

default_args = {"retries": 1, "retry_delay": timedelta(minutes=10)}


def _upload_events(**_):
    """어제치 JSONL 을 BQ 로 올리고, 올린 파일은 .done 으로 표시한다."""
    from google.cloud import bigquery

    files = sorted(p for p in DATA_DIR.glob("churn-*.jsonl") if not p.with_suffix(".done").exists())
    if not files:
        print("올릴 파일 없음")
        return

    rows = []
    for p in files:
        for line in p.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    if not rows:
        print("빈 파일만 있음")
        for p in files:
            p.with_suffix(".done").touch()
        return

    # autodetect 대신 고정 스키마를 쓴다 — p 가 null 인 행(모델 미적용 구간)도
    # 실패 없이 들어가야 하고, 추론 로그에 필드가 하나 더 붙어도(ignore_unknown_values)
    # 야간 적재가 죽으면 안 된다.
    schema_path = ML_DIR / "sql" / "churn_events_schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))

    client = bigquery.Client(project=BQ_PROJECT, location=BQ_LOCATION)
    job = client.load_table_from_json(
        rows, EVENTS_TABLE,
        job_config=bigquery.LoadJobConfig(
            schema=[bigquery.SchemaField.from_api_repr(f) for f in schema],
            ignore_unknown_values=True,
            write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
        ),
    )
    job.result()
    for p in files:
        p.with_suffix(".done").touch()
    print(f"{len(rows)}행 적재 → {EVENTS_TABLE}")


def _train(**_):
    """BQ 표본으로 학습해 coef.json 을 원자적으로 교체한다."""
    sys.path.insert(0, str(ML_DIR))
    from calm_ml import bq                    # noqa: E402
    from train_churn import fit_and_export    # noqa: E402

    df = bq.read_sql_file(str(ML_DIR / "sql" / "churn_trigger_sample.sql"), cap=20)
    if len(df) < 100:
        # 표본이 무너지면 멀쩡히 돌던 모델을 덮어쓰지 않는다.
        raise ValueError(f"표본이 너무 작다({len(df)}행) — 기존 coef.json 을 지킨다")

    # W&B 는 VM 에 아직 키가 없다 — 있을 때만 로그, 없으면 학습 자체는 그대로 돈다.
    m = fit_and_export(df, MODEL_OUT, log_wandb=bool(os.environ.get("WANDB_API_KEY")))
    print(json.dumps(m["metrics"], indent=2, ensure_ascii=False))


with DAG(
    dag_id="churn_upload_events",
    description="🎯 이탈 예측 — API 적립 JSONL 을 BQ 로",
    start_date=datetime(2026, 9, 1),
    schedule="0 3 * * *",
    catchup=False,
    default_args=default_args,
    tags=["churn"],
) as dag_upload:
    PythonOperator(task_id="upload_events", python_callable=_upload_events)


with DAG(
    dag_id="churn_train",
    description="🎯 이탈 예측 — 주 1회 재학습 → coef.json",
    start_date=datetime(2026, 9, 1),
    schedule="0 4 * * 1",
    catchup=False,
    default_args=default_args,
    tags=["churn"],
) as dag_train:
    PythonOperator(task_id="train", python_callable=_train)
