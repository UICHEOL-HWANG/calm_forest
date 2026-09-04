"""학습 산출물의 형태와 누수 차단을 검증한다. BQ 를 치지 않고 합성 데이터로 돈다."""
import json

import numpy as np
import pandas as pd

from train_churn import EXCLUDED, FEATURE_ORDER, fit_and_export


def synthetic(n=300, seed=0):
    """path_len 이 작을수록 이탈하는 합성 표본. 학습이 신호를 잡는지 확인용."""
    rng = np.random.default_rng(seed)
    path = rng.gamma(2.0, 3.0, n)
    y = (rng.random(n) < 1 / (1 + np.exp(0.35 * (path - 6)))).astype(int)
    kind = rng.choice(["time15", "quest"], n)
    return pd.DataFrame({
        "session_id": [f"s{i}" for i in range(n)],
        "client_id": [f"c{i % 40}" for i in range(n)],   # GroupKFold 용 40그룹
        "y": y,
        # ↓ 누수 후보. 모델이 보면 안 된다
        "span_sec": rng.integers(10, 900, n),
        "pts": rng.integers(10, 400, n),
        "remain_sec": rng.integers(0, 600, n),
        "trigger_rn": rng.integers(10, 50, n),
        # ↓ 피처
        "path_len": path,
        "net_disp": rng.gamma(1.5, 2.0, n),
        "wander_ratio": rng.gamma(2.0, 1.5, n),
        "yaw_total": rng.gamma(2.0, 1.0, n),
        "mouse_travel": rng.gamma(2.0, 40.0, n),
        "idle_ratio": rng.random(n),
        "is_first_session": rng.integers(0, 2, n),
        "trigger_kind": kind,
    })


def test_excluded_and_features_disjoint():
    assert not (set(FEATURE_ORDER) & set(EXCLUDED))


def test_export_shape(tmp_path):
    out = tmp_path / "coef.json"
    fit_and_export(synthetic(), out, log_wandb=False)
    m = json.loads(out.read_text())

    assert m["feature_order"] == FEATURE_ORDER
    assert len(m["coef"]) == len(FEATURE_ORDER)
    assert len(m["scaler"]["mean"]) == len(FEATURE_ORDER)
    assert all(s > 0 for s in m["scaler"]["scale"]), "scale 이 0이면 추론에서 0나눗셈"
    assert m["enabled"] is True
    assert "wander_ratio" in m["impute"]
    assert m["metrics"]["n"] == 300


def test_threshold_is_per_trigger(tmp_path):
    """설계서 §4 — 트리거별 기저율이 달라 임계값 하나로는 안 된다."""
    out = tmp_path / "coef.json"
    fit_and_export(synthetic(), out, log_wandb=False)
    th = json.loads(out.read_text())["threshold"]
    assert isinstance(th, dict), "threshold 는 숫자가 아니라 트리거별 dict 다"
    assert set(th) == {"time15", "quest"}
    assert all(0.0 <= v <= 1.0 for v in th.values())


def test_no_leak_columns_reach_the_model(tmp_path):
    """누수 컬럼값을 극단으로 바꿔도 계수가 그대로여야 한다 — 모델이 안 봤다는 뜻."""
    df = synthetic()
    a = tmp_path / "a.json"; fit_and_export(df, a, log_wandb=False)
    df2 = df.copy()
    for c in ["span_sec", "pts", "remain_sec", "trigger_rn"]:
        df2[c] = 999999
    b = tmp_path / "b.json"; fit_and_export(df2, b, log_wandb=False)
    assert json.loads(a.read_text())["coef"] == json.loads(b.read_text())["coef"]


def test_learns_the_planted_signal(tmp_path):
    """합성 신호(path_len 작을수록 이탈)를 잡아야 한다. 못 잡으면 파이프라인 고장."""
    out = tmp_path / "coef.json"
    fit_and_export(synthetic(n=800), out, log_wandb=False)
    m = json.loads(out.read_text())
    assert m["metrics"]["auc"] > 0.60
    assert m["coef"][FEATURE_ORDER.index("path_len")] < 0, "path_len 이 클수록 이탈 확률이 낮아야"


def test_missing_wander_ratio_is_imputed(tmp_path):
    df = synthetic()
    df.loc[:50, "wander_ratio"] = np.nan
    out = tmp_path / "coef.json"
    fit_and_export(df, out, log_wandb=False)
    m = json.loads(out.read_text())
    assert np.isfinite(m["impute"]["wander_ratio"])
    assert all(np.isfinite(c) for c in m["coef"]), "NaN 이 계수까지 새어나갔다"


def test_trigger_kind_string_becomes_numeric(tmp_path):
    """SQL 은 trigger_kind 를 문자열로 준다. JS/API 는 0/1 로 보낸다 — 학습이 맞춰야 한다."""
    out = tmp_path / "coef.json"
    fit_and_export(synthetic(), out, log_wandb=False)
    m = json.loads(out.read_text())
    i = FEATURE_ORDER.index("trigger_kind")
    assert np.isfinite(m["scaler"]["mean"][i]) and m["scaler"]["scale"][i] > 0
