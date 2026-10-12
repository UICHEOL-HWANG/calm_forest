"""anomaly_watch.py DAG — Airflow 없이 파싱되는지, 관리도 규칙이 이상 탐지 G2 와 같은지, 슬랙 문구가 맞는지.

airflow·pendulum 을 스텁으로 갈아 끼우고 importlib 로 DAG 파일을 그대로 로드한다(test_churn_dag.py 와 같은 방식).
BigQuery·슬랙 호출은 태스크 함수 안에서만 일어나므로 여기서는 건드리지 않는다.
"""
from __future__ import annotations

import datetime as dt
import importlib.util
import sys
import types
from pathlib import Path

import numpy as np
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DAG_PATH = REPO_ROOT / "infra" / "airflow" / "dags" / "anomaly_watch.py"


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


@pytest.fixture
def m(monkeypatch):
    """스텁을 이 테스트 동안만 sys.modules 에 심는다(다른 테스트로 새지 않게)."""
    return _load(monkeypatch)


def _load(monkeypatch):
    airflow_stub = types.ModuleType("airflow")
    airflow_stub.DAG = _StubDAG
    ops = types.ModuleType("airflow.operators")
    ops_py = types.ModuleType("airflow.operators.python")
    ops_py.PythonOperator = _StubPythonOperator
    pend = types.ModuleType("pendulum")   # ml venv 에 pendulum 이 없다 — VM 의 Airflow 이미지엔 있음
    pend.timezone = lambda name: types.SimpleNamespace(name=name)
    pend.datetime = lambda *a, tz=None: types.SimpleNamespace(args=a, tz=tz)
    for name, mod in {"airflow": airflow_stub, "airflow.operators": ops,
                      "airflow.operators.python": ops_py, "pendulum": pend}.items():
        monkeypatch.setitem(sys.modules, name, mod)
    spec = importlib.util.spec_from_file_location("anomaly_watch_dag", DAG_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _reference(values, warmup=14, k=3.0):
    """anomaly_g2.chart_alarms(method='mean') 를 numpy 로 다시 쓴 기준 구현."""
    vals = np.asarray(values, float)
    alarm = np.zeros(len(vals), bool)
    for t in range(warmup, len(vals)):
        base = np.array([vals[i] for i in range(t - warmup, t) if not alarm[i]])
        if len(base) < 2:
            continue
        c, s = base.mean(), base.std(ddof=1)
        alarm[t] = vals[t] > c + k * s or vals[t] < c - k * s
    return alarm.tolist()


def test_dag_parses_with_kst_0500_schedule(m):
    assert m.dag_anomaly.dag_id == "anomaly_watch"
    assert m.dag_anomaly.kwargs["schedule"] == "0 5 * * *"
    assert m.dag_anomaly.kwargs["catchup"] is False
    assert m.dag_anomaly.kwargs["start_date"].tz.name == "Asia/Seoul"


def test_warmup_days_never_alarm(m):
    out = m.control_chart([5.0] * 10 + [500.0])
    assert all(not r["alarm"] for r in out)


def test_spike_alarms_and_is_dropped_from_next_baseline(m):
    series = [5, 6, 5, 7, 6, 5, 6, 5, 7, 6, 5, 6, 5, 7, 60, 55, 6]
    out = m.control_chart([float(x) for x in series])
    assert out[14]["alarm"] and out[15]["alarm"]          # 2nd spike still alarms: 1st spike left the baseline
    assert not out[16]["alarm"]


def test_matches_reference_on_random_series(m):
    rng = np.random.default_rng(7)
    series = list(rng.poisson(8, 60).astype(float))
    series[30] = 90.0
    series[45] = 0.0
    got = [r["alarm"] for r in m.control_chart(series)]
    assert got == _reference(series)


def test_message_flags_contamination_when_official_is_normal(m):
    raw = {"center": 6.0, "lo": 1.0, "hi": 11.0, "alarm": True}
    off_ok = {"center": 5.0, "lo": 1.0, "hi": 9.0, "alarm": False}
    off_bad = {"center": 5.0, "lo": 1.0, "hi": 9.0, "alarm": True}
    assert "오염 가능성" in m.build_message("2026-10-03", 109, raw, 5, off_ok)
    assert "실제 유입 변화 가능성" in m.build_message("2026-10-03", 40, raw, 30, off_bad)
    assert "급증" in m.build_message("2026-10-03", 109, raw, 5, off_ok)


def test_assemble_fails_when_yesterday_missing_and_zero_fills_gaps(m):
    start, end = dt.date(2026, 10, 1), dt.date(2026, 10, 4)
    rows = {dt.date(2026, 10, 1): {"raw_devices": 5, "official_devices": 3},
            dt.date(2026, 10, 4): {"raw_devices": 7, "official_devices": 4}}
    raw, off = m.assemble(rows, start, end)
    assert raw == [5.0, 0.0, 0.0, 7.0] and off == [3.0, 0.0, 0.0, 4.0]
    with pytest.raises(RuntimeError):
        m.assemble({dt.date(2026, 10, 1): rows[dt.date(2026, 10, 1)]}, start, end)
