"""client_logs_daily.py DAG — Airflow 없이 파싱되는지, 하루 묶기·요약·서명·급증 규칙이 맞는지.

test_anomaly_watch_dag.py 와 같은 방식(airflow·pendulum 스텁 + importlib 로드).
Supabase·OCI·BigQuery·슬랙 호출은 태스크 함수 안에서만 일어나므로 여기서는 건드리지 않는다.
스펙: dev/active/client-logs/client-logs-plan.md §1
"""
from __future__ import annotations

import datetime as dt
import gzip
import importlib.util
import json
import sys
import types
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DAG_PATH = REPO_ROOT / "infra" / "airflow" / "dags" / "client_logs_daily.py"


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
    airflow_stub = types.ModuleType("airflow")
    airflow_stub.DAG = _StubDAG
    ops = types.ModuleType("airflow.operators")
    ops_py = types.ModuleType("airflow.operators.python")
    ops_py.PythonOperator = _StubPythonOperator
    pend = types.ModuleType("pendulum")
    pend.timezone = lambda name: types.SimpleNamespace(name=name)
    pend.datetime = lambda *a, tz=None: types.SimpleNamespace(args=a, tz=tz)
    for name, mod in {"airflow": airflow_stub, "airflow.operators": ops,
                      "airflow.operators.python": ops_py, "pendulum": pend}.items():
        monkeypatch.setitem(sys.modules, name, mod)
    spec = importlib.util.spec_from_file_location("client_logs_daily_dag", DAG_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ROW = {"id": "0b6f3c7a-1111-4222-8333-444455556666", "received_at": "2026-10-13T03:00:00+00:00",
       "ts": None, "kind": "http", "msg": "GET 404", "stack": None, "url": "/api/x", "status": 404,
       "platform": "web", "uid8": "abcdef01", "path": "/", "suppressed": 2}


def test_dag_parses_with_kst_0430_schedule(m):
    assert m.dag_client_logs.dag_id == "client_logs_daily"
    assert m.dag_client_logs.kwargs["schedule"] == "30 4 * * *"
    assert m.dag_client_logs.kwargs["catchup"] is False
    assert m.dag_client_logs.kwargs["start_date"].tz.name == "Asia/Seoul"


def test_kst_day_bounds_are_utc_iso(m):
    start, end = m.kst_day_bounds(dt.date(2026, 10, 13))
    assert start == "2026-10-12T15:00:00+00:00"
    assert end == "2026-10-13T15:00:00+00:00"


def test_object_key_is_one_file_per_day(m):
    assert m.object_key(dt.date(2026, 10, 3)) == "client-logs/2026/10/03.ndjson.gz"


def test_ndjson_gz_roundtrip(m):
    blob = m.to_ndjson_gz([ROW, {**ROW, "id": "x"}])
    lines = gzip.decompress(blob).decode("utf-8").splitlines()
    assert [json.loads(x)["id"] for x in lines] == [ROW["id"], "x"]


def test_signature_groups_same_error(m):
    assert m.error_sig(ROW) == m.error_sig({**ROW, "id": "other", "uid8": "11111111"})
    assert m.error_sig(ROW) != m.error_sig({**ROW, "status": 500})


def test_summarize_counts_rows_suppressed_users_and_platforms(m):
    rows = [ROW,
            {**ROW, "id": "2", "uid8": "11111111", "platform": "android", "suppressed": 0},
            {**ROW, "id": "3", "uid8": None, "suppressed": 0},
            {**ROW, "id": "4", "kind": "error", "msg": "boom", "status": None, "suppressed": 0}]
    out = {r["sig"]: r for r in m.summarize(rows, dt.date(2026, 10, 13), "client-logs/2026/10/13.ndjson.gz")}
    http = out[m.error_sig(ROW)]
    assert http["n"] == 3 + 2                  # 행 3 + 반복이라 뺀 2
    assert http["rows"] == 3
    assert http["users"] == 2                  # uid 없는 행은 세지 않는다
    assert http["platforms"] == {"web": 2, "android": 1}
    assert http["day"] == "2026-10-13"
    assert http["file_key"] == "client-logs/2026/10/13.ndjson.gz"
    assert len(out) == 2


def test_spike_rule(m):
    assert m.is_spike(200, [10, 12, 9, 11, 10, 8, 13], users=5) is True
    assert m.is_spike(40, [10, 12, 9, 11, 10, 8, 13], users=5) is False      # 최소 건수(50) 미만
    assert m.is_spike(60, [], users=5) is True                                # 첫날 — 바닥값만
    assert m.is_spike(30, [], users=5) is False


def test_spike_needs_minimum_users(m):
    assert m.is_spike(200, [10, 12, 9], users=2) is False
    assert m.is_spike(200, [10, 12, 9], users=m.SPIKE_MIN_USERS) is True


def test_day_users_counts_distinct_uids_across_signatures(m):
    rows = [ROW, {**ROW, "id": "2", "kind": "error", "msg": "boom"},
            {**ROW, "id": "3", "uid8": "11111111"}, {**ROW, "id": "4", "uid8": None}]
    assert m.day_users(rows) == 2


def test_spike_total_ignores_suppressed(m):
    rows = [{**ROW, "suppressed": 40}, {**ROW, "id": "2", "suppressed": 0}]
    summary = m.summarize(rows, dt.date(2026, 10, 20), "k")
    assert m.spike_total(summary) == 2


def test_prior_day_value_prefers_rows_over_n(m):
    assert m.prior_day_value({"n": 54, "rows": 37}) == 37
    assert m.prior_day_value({"n": 54, "rows": None}) == 54


def test_sigv4_headers_are_deterministic(m):
    when = dt.datetime(2026, 10, 13, 19, 30, tzinfo=dt.timezone.utc)
    h1 = m.s3_headers("PUT", "ns.compat.objectstorage.r.oraclecloud.com", "/b/k", b"x", "r", "AK", "SK", when)
    h2 = m.s3_headers("PUT", "ns.compat.objectstorage.r.oraclecloud.com", "/b/k", b"x", "r", "AK", "SK", when)
    assert h1 == h2
    assert h1["x-amz-date"] == "20261013T193000Z"
    assert h1["authorization"].startswith("AWS4-HMAC-SHA256 Credential=AK/20261013/r/s3/aws4_request")


def test_old_file_to_delete_is_30_days_back(m):
    assert m.expired_key(dt.date(2026, 10, 13)) == "client-logs/2026/09/13.ndjson.gz"
