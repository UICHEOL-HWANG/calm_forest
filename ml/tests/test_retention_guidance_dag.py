"""retention_guidance_train.py DAG 가 Airflow 없이 파싱되고, 학습 태스크가 게이트 → export 순서를 지키는지 본다.

airflow 모듈은 스텁으로 갈아 끼운다(test_churn_dag.py 와 같은 방식). 무거운 임포트는 태스크 함수 안에서만 일어난다.
"""
from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DAG_PATH = REPO_ROOT / "infra" / "airflow" / "dags" / "retention_guidance_train.py"


class _StubDAG:
    def __init__(self, dag_id=None, **kwargs):
        self.dag_id = dag_id
        self.kwargs = kwargs

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _StubPythonOperator:
    def __init__(self, **kwargs):
        self.kwargs = kwargs


def _load_dag_module():
    airflow_stub = types.ModuleType("airflow")
    airflow_stub.DAG = _StubDAG
    ops = types.ModuleType("airflow.operators")
    ops_py = types.ModuleType("airflow.operators.python")
    ops_py.PythonOperator = _StubPythonOperator
    sys.modules["airflow"] = airflow_stub
    sys.modules["airflow.operators"] = ops
    sys.modules["airflow.operators.python"] = ops_py

    spec = importlib.util.spec_from_file_location("retention_guidance_train_dag", DAG_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _fake_modules(monkeypatch, train_module):
    fake_bq = types.ModuleType("calm_ml.bq")
    fake_bq.read_sql_file = lambda path: "df"
    fake_pkg = types.ModuleType("calm_ml")
    fake_pkg.bq = fake_bq
    monkeypatch.setitem(sys.modules, "train_retention_guidance", train_module)
    monkeypatch.setitem(sys.modules, "calm_ml", fake_pkg)
    monkeypatch.setitem(sys.modules, "calm_ml.bq", fake_bq)


def test_dag_parses_with_weekly_schedule():
    m = _load_dag_module()
    assert m.dag.dag_id == "retention_guidance_train"
    assert m.dag.kwargs["schedule"] == "30 4 * * 1"   # churn_train(04:00) 뒤
    assert m.dag.kwargs["catchup"] is False
    assert m.MODEL_OUT == Path("/opt/calm-api/model/retention_guidance.json")


def test_train_refuses_small_sample_and_keeps_model(monkeypatch):
    m = _load_dag_module()
    calls = []
    fake_train = types.ModuleType("train_retention_guidance")
    fake_train.SQL = Path("sample.sql")

    def check_sample(df):
        calls.append("check")
        raise ValueError("표본이 너무 작다")

    fake_train.check_sample = check_sample
    fake_train.fit_and_export = lambda *a, **k: calls.append("export")
    _fake_modules(monkeypatch, fake_train)

    with pytest.raises(ValueError):
        m._train()
    assert calls == ["check"]   # export 까지 가지 않는다 — 기존 모델 파일을 안 건드린다


def test_train_exports_after_gate_and_logs_wandb(monkeypatch):
    m = _load_dag_module()
    seen = {}
    fake_train = types.ModuleType("train_retention_guidance")
    fake_train.SQL = Path("sample.sql")
    fake_train.check_sample = lambda df: seen.setdefault("checked", df)

    def fit_and_export(df, out, log_wandb):
        seen.update(df=df, out=out, log_wandb=log_wandb)
        return {"metrics": {"n": 1}}

    fake_train.fit_and_export = fit_and_export
    _fake_modules(monkeypatch, fake_train)
    monkeypatch.setenv("WANDB_API_KEY", "x")

    m._train()
    assert seen["checked"] == "df" and seen["df"] == "df"
    assert seen["out"] == m.MODEL_OUT
    assert seen["log_wandb"] is True
