# =============================================================
#  calm forest · 리텐션 안내 모델 — 주 1회 재학습
#  ------------------------------------------------------------
#  매주 월 04:30 (churn_train 04:00 뒤)
#    BQ(GA4 export) → ml/sql/retention_guidance_train_sample.sql → 로지스틱 학습
#    → /opt/calm-api/model/retention_guidance.json 원자 교체 (API 가 mtime 보고 핫리로드)
#    → W&B 런(지표) + 아티팩트 retention-guidance-model(버전·롤백)
#
#  ⚠️ 표본은 9/4 이후 누적이고, 라벨 창 안에 배너를 본 기기는 뺀다(개입 효과가 라벨에 섞여서).
#     표본·양성이 첫 운영 모델(95/12)보다 작으면 예외를 던져 기존 모델을 지킨다.
# =============================================================
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator

MODEL_OUT = Path("/opt/calm-api/model/retention_guidance.json")
ML_DIR = Path("/opt/airflow/dags/ml")     # scp 로 올리는 ml/ 사본(train_*.py·calm_ml·sql·reports)

default_args = {"retries": 1, "retry_delay": timedelta(minutes=10)}


def _train(**_):
    """BQ 표본으로 학습해 retention_guidance.json 을 교체한다. 표본 게이트를 못 넘으면 손대지 않는다."""
    sys.path.insert(0, str(ML_DIR))
    from calm_ml import bq                                                  # noqa: E402
    from train_retention_guidance import SQL, check_sample, fit_and_export  # noqa: E402

    df = bq.read_sql_file(str(SQL))
    check_sample(df)
    m = fit_and_export(df, MODEL_OUT, log_wandb=bool(os.environ.get("WANDB_API_KEY")))
    print(json.dumps(m["metrics"], indent=2, ensure_ascii=False))


with DAG(
    dag_id="retention_guidance_train",
    description="🌿 리텐션 안내 — 주 1회 재학습 → retention_guidance.json",
    start_date=datetime(2026, 9, 1),
    schedule="30 4 * * 1",
    catchup=False,
    default_args=default_args,
    tags=["retention-guidance"],
) as dag:
    PythonOperator(task_id="train", python_callable=_train)
