"""OCI 버킷 저장소 — 서명·키 규칙·설정 로딩을 네트워크 없이 검증한다."""
import datetime as dt
import json

import pytest

from calm_ml.storage import (
    Bucket,
    load_oci_config,
    model_key,
    sample_key,
    sigv4_headers,
    sweep_key,
)

CFG = {"namespace": "ns", "region": "us-ashburn-1", "bucket": "b", "access_key": "AK", "secret_key": "SK"}


def test_keys_follow_ml_prefix():
    day = dt.date(2026, 11, 9)
    assert sample_key("retention_guidance", day) == "ml/samples/retention_guidance/2026-11-09.parquet"
    assert sweep_key(day, "selection.json") == "ml/sweeps/2026-11-09/selection.json"
    assert model_key("retention_guidance.json") == "ml/models/retention_guidance.json"


def test_sigv4_is_deterministic_and_scoped():
    when = dt.datetime(2026, 11, 9, 1, 2, 3, tzinfo=dt.timezone.utc)
    a = sigv4_headers("PUT", "h", "/b/k", b"x", "us-ashburn-1", "AK", "SK", when)
    b = sigv4_headers("PUT", "h", "/b/k", b"x", "us-ashburn-1", "AK", "SK", when)
    assert a == b
    assert a["x-amz-date"] == "20261109T010203Z"
    assert "Credential=AK/20261109/us-ashburn-1/s3/aws4_request" in a["authorization"]
    assert "host" not in a


def test_sigv4_matches_dag_implementation():
    import ast
    import hashlib
    import hmac
    from pathlib import Path

    path = Path(__file__).resolve().parents[2] / "infra/airflow/dags/client_logs_daily.py"
    tree = ast.parse(path.read_text(encoding="utf-8"))
    fn = next((n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "s3_headers"), None)
    if fn is None:
        pytest.skip("dag helper moved")
    ns = {"dt": dt, "hashlib": hashlib, "hmac": hmac}
    exec(compile(ast.Module(body=[fn], type_ignores=[]), str(path), "exec"), ns)
    when = dt.datetime(2026, 11, 9, tzinfo=dt.timezone.utc)
    args = ("GET", "h", "/b/k", b"", "r", "AK", "SK", when)
    assert sigv4_headers(*args) == ns["s3_headers"](*args)


def test_load_oci_config_from_json_path(tmp_path, monkeypatch):
    p = tmp_path / "oci.json"
    p.write_text(json.dumps(CFG))
    monkeypatch.setenv("OCI_S3_JSON", str(p))
    assert load_oci_config() == CFG


def test_load_oci_config_missing_returns_none(tmp_path, monkeypatch):
    monkeypatch.setenv("OCI_S3_JSON", str(tmp_path / "nope.json"))
    assert load_oci_config() is None


def test_load_oci_config_rejects_incomplete(tmp_path, monkeypatch):
    p = tmp_path / "oci.json"
    p.write_text(json.dumps({"bucket": "b"}))
    monkeypatch.setenv("OCI_S3_JSON", str(p))
    with pytest.raises(ValueError):
        load_oci_config()


class FakeHttp:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, method, url, headers, body=None):
        self.calls.append((method, url, headers, body))
        return self.responses.pop(0)


def test_bucket_put_and_get_roundtrip_shape():
    http = FakeHttp([(200, b"", {}), (200, b"data", {})])
    bucket = Bucket(CFG, http=http)
    bucket.put("ml/x.parquet", b"data", content_type="application/octet-stream")
    assert bucket.get("ml/x.parquet") == b"data"
    put = http.calls[0]
    assert put[0] == "PUT"
    assert put[1] == "https://ns.compat.objectstorage.us-ashburn-1.oraclecloud.com/b/ml/x.parquet"
    assert put[2]["content-type"] == "application/octet-stream"


def test_bucket_get_missing_returns_none():
    bucket = Bucket(CFG, http=FakeHttp([(404, b"", {})]))
    assert bucket.get("ml/none") is None


def test_bucket_put_failure_raises():
    bucket = Bucket(CFG, http=FakeHttp([(403, b"denied", {})]))
    with pytest.raises(RuntimeError):
        bucket.put("ml/x", b"1")
