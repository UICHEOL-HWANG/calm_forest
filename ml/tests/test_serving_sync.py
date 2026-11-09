"""서빙 VM ↔ 버킷 동기화 — 모델 내려받기·적립 로그 올리기를 메모리 버킷으로 검증한다."""
import datetime as dt
import json
import os

import pytest

from calm_ml.model_sync import MODEL_FILES, sync_models
from calm_ml.ship_logs import ship_logs
from calm_ml.storage import model_key, serving_log_key


class MemBucket:
    def __init__(self, fail_get=False):
        self.objects = {}
        self.fail_get = fail_get

    def get(self, key):
        if self.fail_get:
            raise RuntimeError("oci get failed 500")
        return self.objects.get(key)

    def put(self, key, body, **_):
        self.objects[key] = body


def _model(version="v1"):
    return json.dumps({"model_version": version, "feature_order": ["a"], "coef": [0.1]}).encode()


def test_model_files_cover_both_serving_models():
    assert set(MODEL_FILES) == {"coef.json", "retention_guidance.json"}


def test_sync_downloads_new_model(tmp_path):
    b = MemBucket()
    b.objects[model_key("coef.json")] = _model("v2")
    result = sync_models(b, tmp_path)
    assert result["coef.json"] == "updated"
    assert result["retention_guidance.json"] == "missing"
    assert json.loads((tmp_path / "coef.json").read_text())["model_version"] == "v2"


def test_sync_leaves_identical_file_untouched(tmp_path):
    (tmp_path / "coef.json").write_bytes(_model("v1"))
    old = 1_000_000_000
    os.utime(tmp_path / "coef.json", (old, old))
    b = MemBucket()
    b.objects[model_key("coef.json")] = _model("v1")
    assert sync_models(b, tmp_path)["coef.json"] == "unchanged"
    assert (tmp_path / "coef.json").stat().st_mtime == old


@pytest.mark.parametrize("body", [b"{not json", b"[]", json.dumps({"coef": [1]}).encode()])
def test_sync_rejects_invalid_model_and_keeps_old(tmp_path, body):
    (tmp_path / "coef.json").write_bytes(_model("v1"))
    b = MemBucket()
    b.objects[model_key("coef.json")] = body
    assert sync_models(b, tmp_path)["coef.json"] == "invalid"
    assert json.loads((tmp_path / "coef.json").read_text())["model_version"] == "v1"
    assert not list(tmp_path.glob("*.tmp"))


def test_sync_reports_error_without_crashing(tmp_path):
    (tmp_path / "coef.json").write_bytes(_model("v1"))
    result = sync_models(MemBucket(fail_get=True), tmp_path)
    assert result["coef.json"] == "error"
    assert (tmp_path / "coef.json").exists()


TODAY = dt.date(2026, 11, 9)


def _log(path, rows):
    path.write_text("".join(json.dumps(r) + "\n" for r in rows), encoding="utf-8")


def test_ship_logs_uploads_past_days_only(tmp_path):
    _log(tmp_path / "churn-2026-11-08.jsonl", [{"s": 1}])
    _log(tmp_path / "retention-guidance-2026-11-08.jsonl", [{"s": 2}])
    _log(tmp_path / "churn-2026-11-09.jsonl", [{"s": 3}])
    b = MemBucket()
    shipped = ship_logs(b, tmp_path, today=TODAY)
    assert sorted(shipped) == ["churn-2026-11-08.jsonl", "retention-guidance-2026-11-08.jsonl"]
    assert serving_log_key("churn-2026-11-08.jsonl") in b.objects
    assert serving_log_key("churn-2026-11-09.jsonl") not in b.objects
    assert (tmp_path / "churn-2026-11-08.shipped").exists()


def test_ship_logs_skips_already_shipped(tmp_path):
    _log(tmp_path / "churn-2026-11-08.jsonl", [{"s": 1}])
    (tmp_path / "churn-2026-11-08.shipped").touch()
    b = MemBucket()
    assert ship_logs(b, tmp_path, today=TODAY) == []
    assert not b.objects


def test_ship_logs_ignores_unparseable_names(tmp_path):
    _log(tmp_path / "churn-latest.jsonl", [{"s": 1}])
    assert ship_logs(MemBucket(), tmp_path, today=TODAY) == []


def test_ship_logs_prunes_old_shipped_files(tmp_path):
    _log(tmp_path / "churn-2026-10-01.jsonl", [{"s": 1}])
    (tmp_path / "churn-2026-10-01.shipped").touch()
    _log(tmp_path / "churn-2026-10-02.jsonl", [{"s": 1}])
    ship_logs(MemBucket(), tmp_path, today=TODAY, keep_days=7)
    assert not (tmp_path / "churn-2026-10-01.jsonl").exists()
    assert not (tmp_path / "churn-2026-10-01.shipped").exists()
    assert (tmp_path / "churn-2026-10-02.shipped").exists()
    assert (tmp_path / "churn-2026-10-02.jsonl").exists()
