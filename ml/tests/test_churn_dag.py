"""churn_train.py DAG 가 Airflow 없이도 파싱되는지, 스키마 JSON 이 형태를 지키는지,
그리고 `_upload_events` 가 '어제까지만' · '파일 단위 격리'로 올바르게 동작하는지 확인한다.

Airflow 를 로컬에 깔지 않고, `airflow`/`airflow.operators.python` 을 스텁으로 갈아
끼운 뒤 importlib 로 DAG 파일을 그대로 로드한다. sklearn·google-cloud-bigquery 등
무거운 임포트는 태스크 함수 안에서만 일어나야 하므로(모듈 로드 시점엔 안 건드림)
파싱 테스트는 BQ 도, sklearn 도 필요 없다 — 빠르게 돈다.

`_upload_events` 테스트는 `google.cloud.bigquery` 를 스텁 모듈로 바꿔치기해서
(Client/LoadJobConfig/SchemaField/WriteDisposition) 실제 네트워크 없이 적재 성공/
실패를 시뮬레이션한다.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DAG_PATH = REPO_ROOT / "infra" / "airflow" / "dags" / "churn_train.py"
SCHEMA_PATH = REPO_ROOT / "ml" / "sql" / "churn_events_schema.json"
ML_DIR_REAL = REPO_ROOT / "ml"  # ml/sql/churn_events_schema.json 이 실재하는 위치


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


# ---------------------------------------------------------------------------
# _upload_events: 스텁 google.cloud.bigquery
# ---------------------------------------------------------------------------


def _make_stub_bigquery_module(state):
    """`google.cloud.bigquery` 스텁 — Client.load_table_from_json 호출을 state 에
    기록하고, state["behaviors"] 큐에서 하나씩 꺼내 성공/실패를 흉내낸다.
    """

    mod = types.ModuleType("google.cloud.bigquery")

    class SchemaField:
        def __init__(self, name=None, field_type=None, mode="NULLABLE", fields=()):
            self.name = name
            self.field_type = field_type
            self.mode = mode
            self.fields = fields

        @staticmethod
        def from_api_repr(d):
            return d

    class WriteDisposition:
        WRITE_APPEND = "WRITE_APPEND"

    class LoadJobConfig:
        def __init__(self, schema=None, ignore_unknown_values=None,
                     write_disposition=None, autodetect=None):
            self.schema = schema
            self.ignore_unknown_values = ignore_unknown_values
            self.write_disposition = write_disposition
            self.autodetect = autodetect

    class _StubJob:
        def result(self):
            return None

    class Client:
        def __init__(self, project=None, location=None):
            self.project = project
            self.location = location

        def load_table_from_json(self, rows, table, job_config=None):
            state["calls"].append({
                "rows": rows, "table": table, "job_config": job_config,
            })
            behavior = state["behaviors"].pop(0) if state["behaviors"] else "ok"
            if behavior == "raise":
                raise RuntimeError("stub 적재 실패")
            return _StubJob()

    mod.SchemaField = SchemaField
    mod.WriteDisposition = WriteDisposition
    mod.LoadJobConfig = LoadJobConfig
    mod.Client = Client
    return mod


@pytest.fixture
def stub_bigquery(monkeypatch):
    """`google.cloud.bigquery` 를 스텁으로 갈아끼운다. `state["calls"]` 로 호출을
    검사하고, `state["behaviors"]` 에 "raise" 를 넣어 특정 파일의 적재를 실패시킨다
    (파일 처리 순서 = 정렬된 파일명 순서, 즉 오래된 날짜부터).
    """
    state = {"calls": [], "behaviors": []}
    stub_mod = _make_stub_bigquery_module(state)

    google_mod = types.ModuleType("google")
    google_cloud_mod = types.ModuleType("google.cloud")
    google_cloud_mod.bigquery = stub_mod
    google_mod.cloud = google_cloud_mod

    monkeypatch.setitem(sys.modules, "google", google_mod)
    monkeypatch.setitem(sys.modules, "google.cloud", google_cloud_mod)
    monkeypatch.setitem(sys.modules, "google.cloud.bigquery", stub_mod)

    return state


def _write_jsonl(path: Path, lines):
    """lines 의 각 원소를 그대로 한 줄씩 쓴다(문자열은 그대로, dict 는 json.dumps)."""
    with path.open("w", encoding="utf-8") as f:
        for line in lines:
            f.write(line if isinstance(line, str) else json.dumps(line))
            f.write("\n")


def _load_dag_module_with_dirs(data_dir: Path):
    """DAG 모듈을 로드하고 DATA_DIR/ML_DIR 를 테스트용 경로로 바꿔친다."""
    module = _load_dag_module()
    module.DATA_DIR = data_dir
    module.ML_DIR = ML_DIR_REAL  # ml/sql/churn_events_schema.json 이 실재하는 실제 경로
    return module


def test_upload_events_skips_today_processes_yesterday(tmp_path, stub_bigquery):
    today = datetime.now(timezone.utc).date()
    yesterday = today - timedelta(days=1)

    today_file = tmp_path / f"churn-{today.isoformat()}.jsonl"
    yesterday_file = tmp_path / f"churn-{yesterday.isoformat()}.jsonl"
    _write_jsonl(today_file, [{"session_id": "today-1"}])
    _write_jsonl(yesterday_file, [{"session_id": "yesterday-1"}])

    module = _load_dag_module_with_dirs(tmp_path)
    module._upload_events()

    # 오늘 파일: 처리도 안 되고 .done 도 안 찍힌다.
    assert not today_file.with_suffix(".done").exists()
    # 어제 파일: 처리되고 .done 이 찍힌다.
    assert yesterday_file.with_suffix(".done").exists()

    assert len(stub_bigquery["calls"]) == 1
    uploaded_rows = stub_bigquery["calls"][0]["rows"]
    assert uploaded_rows == [{"session_id": "yesterday-1"}]


def test_upload_events_skips_malformed_line_loads_rest(tmp_path, stub_bigquery):
    yesterday = datetime.now(timezone.utc).date() - timedelta(days=1)
    p = tmp_path / f"churn-{yesterday.isoformat()}.jsonl"
    _write_jsonl(p, [
        {"session_id": "ok-1"},
        "{not valid json",
        {"session_id": "ok-2"},
    ])

    module = _load_dag_module_with_dirs(tmp_path)
    module._upload_events()

    assert p.with_suffix(".done").exists()
    assert len(stub_bigquery["calls"]) == 1
    uploaded_rows = stub_bigquery["calls"][0]["rows"]
    assert uploaded_rows == [{"session_id": "ok-1"}, {"session_id": "ok-2"}]


def test_upload_events_failed_file_not_marked_done_others_continue_and_raises(
    tmp_path, stub_bigquery,
):
    # 둘 다 '어제 이전'이 확실하도록 과거 고정 날짜를 쓴다. 정렬 순서(=처리 순서)는
    # 파일명 오름차순이라 01 이 먼저, 02 가 나중에 처리된다.
    file_a = tmp_path / "churn-2020-01-01.jsonl"  # 이게 실패하도록 만든다
    file_b = tmp_path / "churn-2020-01-02.jsonl"  # 이건 성공해야 한다
    _write_jsonl(file_a, [{"session_id": "a-1"}])
    _write_jsonl(file_b, [{"session_id": "b-1"}])

    stub_bigquery["behaviors"] = ["raise", "ok"]

    module = _load_dag_module_with_dirs(tmp_path)
    with pytest.raises(RuntimeError):
        module._upload_events()

    assert not file_a.with_suffix(".done").exists()
    assert file_b.with_suffix(".done").exists()

    assert len(stub_bigquery["calls"]) == 2
    assert stub_bigquery["calls"][0]["rows"] == [{"session_id": "a-1"}]
    assert stub_bigquery["calls"][1]["rows"] == [{"session_id": "b-1"}]
