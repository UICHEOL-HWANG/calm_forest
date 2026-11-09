# =============================================================
#  calm forest · 이탈 예측 — 주 1회 학습 + 야간 적립 업로드
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §5·§9
#
#  두 스케줄이 한 파일에 있다:
#    upload_events  매일 03:00  서빙 VM 이 버킷 ml/serving-logs/ 에 올린 JSONL → BQ
#    train          매주 월 04:00  BQ → 학습 → 버킷 ml/models/coef.json → 서빙 VM model_sync 가 교체
#
#  ⚠️ 학습 표본은 BQ 의 game_logs 에서 뽑는다. 적립 JSONL 은 '실제로 판정에 쓴 피처'의
#     기록이고, 다음 단계에서 학습 원천으로 옮길 예정이다(지금은 표본이 부족하다).
#     적립 행 중 session_id 가 game_logs 에 실재하는 것만 신뢰한다 — 그게 남용 방어다.
# =============================================================
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from airflow import DAG
from airflow.operators.python import PythonOperator

MODEL_OUT = Path(os.environ.get("MODEL_OUT_DIR", "/opt/airflow/model-out")) / "coef.json"
LOG_PREFIX = "ml/serving-logs"
LOOKBACK_DAYS = 7
ML_DIR = Path("/opt/airflow/dags/ml")     # scp 로 올리는 ml/ 사본(train_churn.py·calm_ml·sql)

BQ_PROJECT = "calm-forest"
BQ_LOCATION = "asia-northeast3"
EVENTS_TABLE = f"{BQ_PROJECT}.calm_forest_raw.churn_events"

default_args = {"retries": 1, "retry_delay": timedelta(minutes=10)}


def _default_bucket():
    sys.path.insert(0, str(ML_DIR))
    from calm_ml.storage import default_bucket  # noqa: E402

    bucket = default_bucket()
    if bucket is None:
        raise RuntimeError("OCI bucket not configured")
    return bucket


def _pending_days(bucket, today):
    for back in range(LOOKBACK_DAYS, 0, -1):
        day = today - timedelta(days=back)
        key = f"{LOG_PREFIX}/churn-{day.isoformat()}.jsonl"
        if bucket.get(key + ".done") is not None:
            continue
        body = bucket.get(key)
        if body is not None:
            yield key, body


def _publish(path: Path, bucket=None) -> None:
    (bucket or _default_bucket()).put(f"ml/models/{path.name}", path.read_bytes(),
                                      content_type="application/json")


def _upload_events(bucket=None, today=None, **_):
    """어제까지의 JSONL 을 파일 단위로 BQ 에 올리고, 올린 파일만 .done 으로 표시한다.

    파일마다 따로 적재한다 — 한 줄이 깨졌다고(부분 쓰기·포맷 드리프트) backlog
    전체가 죽으면 안 되고, 한 파일의 적재가 실패해도 나머지 파일은 계속 올라가야
    한다. 실패한 파일이 있으면 나머지를 모두 처리한 뒤 마지막에 다시 던져서
    태스크가 실패로 보이게 한다.
    """
    from google.cloud import bigquery

    bucket = bucket or _default_bucket()
    today = today or datetime.now(timezone.utc).date()
    pending = list(_pending_days(bucket, today))
    if not pending:
        print("올릴 파일 없음")
        return

    # autodetect 대신 고정 스키마를 쓴다 — p 가 null 인 행(모델 미적용 구간)도
    # 실패 없이 들어가야 하고, 추론 로그에 필드가 하나 더 붙어도(ignore_unknown_values)
    # 야간 적재가 죽으면 안 된다.
    schema_path = ML_DIR / "sql" / "churn_events_schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    bq_schema = [bigquery.SchemaField.from_api_repr(f) for f in schema]

    client = bigquery.Client(project=BQ_PROJECT, location=BQ_LOCATION)

    failures = []
    total_rows = 0
    for p, body in pending:
        rows = []
        for lineno, line in enumerate(body.decode("utf-8").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as e:
                print(f"{p}:{lineno} 건너뜀: {e}")

        if not rows:
            print(f"{p}: 빈 파일(또는 전부 깨짐) — .done 처리")
            bucket.put(p + ".done", b"")
            continue

        try:
            job = client.load_table_from_json(
                rows, EVENTS_TABLE,
                job_config=bigquery.LoadJobConfig(
                    schema=bq_schema,
                    ignore_unknown_values=True,
                    write_disposition=bigquery.WriteDisposition.WRITE_APPEND,
                ),
            )
            job.result()
        except Exception as e:
            print(f"{p}: 적재 실패, .done 표시 안 함 — {e}")
            failures.append(p)
            continue

        bucket.put(p + ".done", b"")
        total_rows += len(rows)
        print(f"{p}: {len(rows)}행 적재 → {EVENTS_TABLE}")

    if failures:
        raise RuntimeError(f"{len(failures)}개 파일 적재 실패: {failures}")

    print(f"총 {total_rows}행 적재 완료")


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
    _publish(MODEL_OUT)
    print(json.dumps(m["metrics"], indent=2, ensure_ascii=False))


with DAG(
    dag_id="churn_upload_events",
    description="🎯 이탈 예측 — 버킷 serving-logs JSONL 을 BQ 로",
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
