"""churn_train.py DAG 가 Airflow 없이도 파싱되는지, 스키마 JSON 이 형태를 지키는지 확인한다.

Airflow 를 로컬에 깔지 않고, `airflow`/`airflow.operators.python` 을 스텁으로 갈아
끼운 뒤 importlib 로 DAG 파일을 그대로 로드한다. sklearn·google-cloud-bigquery 등
무거운 임포트는 태스크 함수 안에서만 일어나야 하므로(모듈 로드 시점엔 안 건드림)
이 테스트는 BQ 도, sklearn 도 필요 없다 — 빠르게 돈다.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DAG_PATH = REPO_ROOT / "infra" / "airflow" / "dags" / "churn_train.py"
SCHEMA_PATH = REPO_ROOT / "ml" / "sql" / "churn_events_schema.json"


class _StubDAG:
    """airflow.DAG 스텁 — with 블록으로 쓰이며 kwargs 를 그대로 기록한다."""

    def __init__(self, dag_id=None, **kwargs):
        self.dag_id = dag_id
        self.kwargs = kwargs

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _StubPythonOperator:
    """airflow.operators.python.PythonOperator 스텁 — kwargs 만 기록한다."""

    def __init__(self, **kwargs):
        self.kwargs = kwargs


def _load_dag_module():
    """airflow 스텁을 sys.modules 에 심고 churn_train.py 를 importlib 로 로드한다."""
    airflow_stub = types.ModuleType("airflow")
    airflow_stub.DAG = _StubDAG

    airflow_operators_stub = types.ModuleType("airflow.operators")
    airflow_operators_python_stub = types.ModuleType("airflow.operators.python")
    airflow_operators_python_stub.PythonOperator = _StubPythonOperator

    sys.modules["airflow"] = airflow_stub
    sys.modules["airflow.operators"] = airflow_operators_stub
    sys.modules["airflow.operators.python"] = airflow_operators_python_stub

    spec = importlib.util.spec_from_file_location("churn_train_dag", DAG_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_dag_module_parses_and_defines_two_dags():
    module = _load_dag_module()

    assert module.dag_upload.dag_id == "churn_upload_events"
    assert module.dag_upload.kwargs["schedule"] == "0 3 * * *"
    assert module.dag_upload.kwargs["catchup"] is False

    assert module.dag_train.dag_id == "churn_train"
    assert module.dag_train.kwargs["schedule"] == "0 4 * * 1"
    assert module.dag_train.kwargs["catchup"] is False


def test_churn_events_schema_has_nested_feature_fields():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    names = {f["name"] for f in schema}
    assert {"at", "session_id", "client_id", "variant", "arm", "trigger",
            "features", "p", "intervene", "model_version", "origin", "ua"} <= names

    features_field = next(f for f in schema if f["name"] == "features")
    assert features_field["type"] == "RECORD"
    feature_names = {f["name"] for f in features_field["fields"]}
    assert feature_names == {
        "path_len", "net_disp", "wander_ratio", "yaw_total",
        "mouse_travel", "idle_ratio", "is_first_session", "trigger_kind",
    }
