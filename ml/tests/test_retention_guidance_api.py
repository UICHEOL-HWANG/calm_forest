"""리텐션 안내 예측 API 계약·피처 변환·적립을 검증한다."""
import json
import math
import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.retention_guidance as rg

RAW = {
    "early_tracked_events": 20,
    "early_actions": 6,
    "early_action_kinds": 4,
    "early_area_count": 3,
    "early_event_name_count": 7,
    "early_entry_auth_events": 1,
    "early_nature_events": 2,
    "early_fishing_sea_events": 1,
    "early_chop_tree_events": 1,
    "early_econ_tx_events": 1,
}


def make_model(version="v1", coef=None, threshold=0.5, enabled=True):
    return {
        "model_version": version,
        "feature_order": rg.FEATURE_ORDER,
        "coef": coef or [0.0] * len(rg.FEATURE_ORDER),
        "intercept": 0.0,
        "scaler": {"mean": [0.0] * len(rg.FEATURE_ORDER), "scale": [1.0] * len(rg.FEATURE_ORDER)},
        "impute": {},
        "threshold": threshold,
        "enabled": enabled,
        "metrics": {},
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(rg, "MODEL_PATH", tmp_path / "retention_guidance.json")
    monkeypatch.setattr(rg, "LOG_DIR", tmp_path / "log")
    rg._reset_cache()
    app = FastAPI()
    app.include_router(rg.router)
    return TestClient(app)


def post_body(features=None):
    return {
        "features": features or RAW,
        "trigger": "t180",
        "session_id": "sess-1",
        "client_id": "client-1",
        "variant": "control",
        "platform": "web",
        "policy_version": "retention-guidance-rules-2026-09-18",
    }


def test_no_model_returns_null_not_error(client):
    r = client.post("/retention-guidance/predict", json=post_body())
    assert r.status_code == 200
    assert r.json()["score"] is None
    assert r.json()["eligible"] is False


def test_scores_with_model(client, tmp_path):
    (tmp_path / "retention_guidance.json").write_text(json.dumps(make_model()))
    r = client.post("/retention-guidance/predict", json=post_body())
    body = r.json()
    assert body["model_version"] == "v1"
    assert body["score"] == pytest.approx(0.5)
    assert body["eligible"] is True


def test_raw_features_are_derived_to_model_features():
    f = rg._derive_features(RAW)
    assert f["log_early_tracked_events"] == pytest.approx(math.log1p(20))
    assert f["log_early_actions"] == pytest.approx(math.log1p(6))
    assert f["deliberate_share"] == pytest.approx(6 / 20)
    assert f["entry_auth_share"] == pytest.approx(1 / 20)
    assert f["log_early_chop_tree_events"] == pytest.approx(math.log1p(1))


def test_threshold_drives_eligible(client, tmp_path):
    (tmp_path / "retention_guidance.json").write_text(json.dumps(make_model(threshold=0.4)))
    assert client.post("/retention-guidance/predict", json=post_body()).json()["eligible"] is True
    time.sleep(0.01)
    (tmp_path / "retention_guidance.json").write_text(json.dumps(make_model(version="v2", threshold=0.9)))
    assert client.post("/retention-guidance/predict", json=post_body()).json()["eligible"] is False


def test_disabled_model_scores_but_does_not_mark_eligible(client, tmp_path):
    (tmp_path / "retention_guidance.json").write_text(json.dumps(make_model(enabled=False, threshold=0.4)))
    body = client.post("/retention-guidance/predict", json=post_body()).json()
    assert body["score"] == pytest.approx(0.5)
    assert body["eligible"] is False


def test_appends_jsonl_row(client, tmp_path):
    (tmp_path / "retention_guidance.json").write_text(json.dumps(make_model()))
    client.post("/retention-guidance/predict", json=post_body())
    files = list((tmp_path / "log").glob("retention-guidance-*.jsonl"))
    assert len(files) == 1
    row = json.loads(files[0].read_text().strip())
    assert row["session_id"] == "sess-1"
    assert row["raw_features"]["early_tracked_events"] == 20
    assert row["features"]["log_early_tracked_events"] == pytest.approx(math.log1p(20))
    assert row["model_version"] == "v1"


def test_unknown_raw_feature_key_is_rejected(client, tmp_path):
    (tmp_path / "retention_guidance.json").write_text(json.dumps(make_model()))
    r = client.post("/retention-guidance/predict", json=post_body(dict(RAW, evil=1)))
    assert r.status_code == 422


def test_feature_order_mismatch_is_treated_as_no_model(client, tmp_path):
    model = make_model()
    order = list(rg.FEATURE_ORDER)
    order[0], order[1] = order[1], order[0]
    model["feature_order"] = order
    (tmp_path / "retention_guidance.json").write_text(json.dumps(model))
    body = client.post("/retention-guidance/predict", json=post_body()).json()
    assert body["score"] is None
    assert body["eligible"] is False
    assert body["model_version"] == "none"
