"""추론 API 계약·핫리로드·적립을 검증한다."""
import json
import math
import time

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import api.churn as churn

FEATS = {
    "path_len": 12.0, "net_disp": 4.0, "wander_ratio": 3.0, "yaw_total": 2.0,
    "mouse_travel": 300.0, "idle_ratio": 0.4, "is_first_session": 1, "trigger_kind": 0,
}


def make_model(version="v1", coef=None, enabled=True, threshold=0.5):
    order = churn.FEATURE_ORDER
    # 실제 coef.json (ml/train_churn.py 의 _thresholds()) 은 트리거별 임계값 딕셔너리를 쓴다 —
    # time15 와 quest 는 기저율이 크게 달라 스칼라 하나로는 안 된다(설계서 §4).
    thr = threshold if isinstance(threshold, dict) else {"time15": threshold, "quest": threshold}
    return {
        "model_version": version,
        "feature_order": order,
        "coef": coef or [0.0] * len(order),
        "intercept": 0.0,
        "scaler": {"mean": [0.0] * len(order), "scale": [1.0] * len(order)},
        "impute": {"wander_ratio": 3.2},
        "threshold": thr,
        "enabled": enabled,
        "metrics": {},
    }


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(churn, "MODEL_PATH", tmp_path / "coef.json")
    monkeypatch.setattr(churn, "LOG_DIR", tmp_path / "log")
    churn._reset_cache()
    app = FastAPI()
    app.include_router(churn.router)
    return TestClient(app)


def test_no_model_returns_null_not_error(client):
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s1", "client_id": "c1", "variant": "control"})
    assert r.status_code == 200, "모델이 없어도 5xx 를 내지 않는다"
    assert r.json()["p"] is None
    assert r.json()["intervene"] is False


def test_scores_with_model(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s1", "client_id": "c1", "variant": "control"})
    body = r.json()
    assert body["model_version"] == "v1"
    assert body["p"] == pytest.approx(0.5), "계수 0 · 절편 0 → sigmoid(0) = 0.5"


def test_sigmoid_matches_manual_dot_product(client, tmp_path):
    coef = [0.1, -0.2, 0.0, 0.0, 0.0, 1.5, 0.0, 0.0]
    (tmp_path / "coef.json").write_text(json.dumps(make_model(coef=coef)))
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s1", "client_id": "c1", "variant": "control"})
    z = 0.1 * 12.0 + (-0.2) * 4.0 + 1.5 * 0.4
    assert r.json()["p"] == pytest.approx(1 / (1 + math.exp(-z)), abs=1e-9)


def test_threshold_drives_intervene(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model(threshold=0.4)))
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["intervene"] is True
    (tmp_path / "coef.json").write_text(json.dumps(make_model(version="v2", threshold=0.9)))
    time.sleep(0.01)
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["intervene"] is False


def test_threshold_is_per_trigger(client, tmp_path):
    """coef.json 의 threshold 는 트리거별 딕셔너리다 — quest 요청은 quest 임계값을 써야 한다."""
    (tmp_path / "coef.json").write_text(json.dumps(make_model(threshold={"time15": 0.9, "quest": 0.1})))
    r_time15 = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                             "session_id": "s", "client_id": "c", "variant": "x"}).json()
    assert r_time15["threshold"] == pytest.approx(0.9)
    assert r_time15["intervene"] is False, "sigmoid(0)=0.5 < time15 임계값 0.9"

    r_quest = client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                            "session_id": "s", "client_id": "c", "variant": "x"}).json()
    assert r_quest["threshold"] == pytest.approx(0.1)
    assert r_quest["intervene"] is True, "sigmoid(0)=0.5 >= quest 임계값 0.1"


def test_scalar_threshold_still_works(client, tmp_path):
    """구버전 호환 — threshold 가 딕셔너리가 아니라 숫자 하나(옛 coef.json 형식)여도 그대로 쓴다.

    make_model() 은 편의상 스칼라를 넘겨도 {"time15":.., "quest":..} 딕셔너리로 바꿔 버리므로
    (다른 테스트들이 트리거 하나만 검사하기 때문에 그걸로 충분하다), 이 테스트만은 그 변환을
    우회해 threshold 필드에 진짜 스칼라를 넣는다 — 그래야 _resolve_threshold() 의 스칼라
    분기(isinstance(raw, (int, float)))가 실제로 실행된다.
    """
    model = make_model()
    model["threshold"] = 0.4
    (tmp_path / "coef.json").write_text(json.dumps(model))
    r = client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                      "session_id": "s", "client_id": "c", "variant": "x"}).json()
    assert r["threshold"] == pytest.approx(0.4)
    assert r["intervene"] is True


def test_missing_trigger_threshold_falls_back_to_no_intervene(client, tmp_path):
    """이 트리거의 임계값이 없으면 모델을 이 요청에 못 쓰는 것으로 취급한다 — 5xx 대신 개입 안 함."""
    (tmp_path / "coef.json").write_text(json.dumps(make_model(threshold={"time15": 0.5})))
    r = client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                      "session_id": "s", "client_id": "c", "variant": "x"}).json()
    assert r["intervene"] is False
    assert r["threshold"] is None
    assert r["p"] is not None, "p 자체는 여전히 계산된다"


def test_hot_reload_on_mtime_change(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model(version="v1")))
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["model_version"] == "v1"
    time.sleep(0.01)
    (tmp_path / "coef.json").write_text(json.dumps(make_model(version="v2")))
    assert client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()["model_version"] == "v2", \
        "재시작 없이 갈려야 한다"


def test_disabled_model_does_not_intervene(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model(enabled=False)))
    body = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                         "session_id": "s", "client_id": "c", "variant": "x"}).json()
    assert body["intervene"] is False, "enabled=false 는 배포 없이 끄는 스위치"


def test_null_wander_ratio_is_imputed(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    f = dict(FEATS, wander_ratio=None)
    r = client.post("/predict", json={"features": f, "trigger": "time15",
                                      "session_id": "s", "client_id": "c", "variant": "x"})
    assert r.status_code == 200
    assert r.json()["p"] is not None


def test_appends_jsonl_row(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                  "session_id": "sess-9", "client_id": "cl-9", "variant": "beta_A"})
    files = list((tmp_path / "log").glob("*.jsonl"))
    assert len(files) == 1
    row = json.loads(files[0].read_text().strip())
    assert row["session_id"] == "sess-9"
    assert row["trigger"] == "quest"
    assert row["features"]["path_len"] == 12.0
    assert "p" in row and "at" in row and "origin" in row


def test_long_origin_header_is_truncated(client, tmp_path):
    """인증 없는 공개 엔드포인트라 Origin 헤더 길이를 신뢰할 수 없다 — ua 처럼 200자로 자른다."""
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                  "session_id": "sess-9", "client_id": "cl-9", "variant": "beta_A"},
                headers={"origin": "x" * 5000})
    files = list((tmp_path / "log").glob("*.jsonl"))
    row = json.loads(files[0].read_text().strip())
    assert len(row["origin"]) == 200


def test_appends_jsonl_row_with_arm(client, tmp_path):
    """arm(A/B 개입군)은 클라이언트가 세션별로 랜덤 배정하며, 적립 행에 그대로 남아야 학습에서 구분할 수 있다."""
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                  "session_id": "sess-9", "client_id": "cl-9", "variant": "beta_A",
                                  "arm": "treat"})
    files = list((tmp_path / "log").glob("*.jsonl"))
    row = json.loads(files[0].read_text().strip())
    assert row["arm"] == "treat"


def test_invalid_arm_is_rejected(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    r = client.post("/predict", json={"features": FEATS, "trigger": "quest",
                                      "session_id": "s", "client_id": "c", "variant": "x",
                                      "arm": "bogus"})
    assert r.status_code == 422, "정의되지 않은 arm 값은 거부한다"


def test_unknown_feature_key_is_rejected(client, tmp_path):
    (tmp_path / "coef.json").write_text(json.dumps(make_model()))
    r = client.post("/predict", json={"features": dict(FEATS, evil=1), "trigger": "time15",
                                      "session_id": "s", "client_id": "c", "variant": "x"})
    assert r.status_code == 422, "모르는 피처 키는 거부한다 — 적립 파일이 오염된다"


def test_corrupt_model_file_falls_back_to_null(client, tmp_path):
    (tmp_path / "coef.json").write_text("{ 이건 JSON 이 아니다")
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s", "client_id": "c", "variant": "x"})
    assert r.status_code == 200
    assert r.json()["p"] is None


def test_feature_order_mismatch_is_treated_as_no_model(client, tmp_path):
    """coef.json 의 feature_order 가 API 의 FEATURE_ORDER 와 다르면 모델을 무시한다 —
    계수와 피처가 잘못 짝지어져 조용히 틀린 점수를 내는 것보다 모델 없음으로 처리하는 편이 안전하다."""
    model = make_model()
    order = list(churn.FEATURE_ORDER)
    order[-1], order[-2] = order[-2], order[-1]  # 마지막 두 이름을 바꿔치기
    model["feature_order"] = order
    (tmp_path / "coef.json").write_text(json.dumps(model))
    r = client.post("/predict", json={"features": FEATS, "trigger": "time15",
                                      "session_id": "s", "client_id": "c", "variant": "x"})
    assert r.status_code == 200
    body = r.json()
    assert body["p"] is None
    assert body["intervene"] is False
    assert body["model_version"] == "none"
