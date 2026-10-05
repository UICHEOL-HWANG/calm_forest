"""이상치 탐지 — 피처·페르소나 라벨 조인·학습/평가. BQ 를 치지 않고 합성 데이터로 돈다."""
import json

import numpy as np
import pandas as pd

from calm_ml.anomaly_features import FEATURES, build_features, label_sessions
from train_anomaly import fit_and_evaluate


def _row(**kw):
    base = dict(session_id="s", user_id="u", client_id="c", play_sec=600,
                counts=json.dumps({"chop_tree": 5, "fish_catch": 5}), coins=10,
                started_at=pd.Timestamp("2026-10-03T03:00:00Z"),
                n_samples=300, path_len=400.0, idle_ratio=0.2, yaw_total=30.0, max_gap_sec=9.0,
                n_tx=5, coin_in=40, coin_out=10, n_sources=3)
    base.update(kw)
    return base


def test_counts_become_diversity_and_repetition():
    f = build_features(pd.DataFrame([_row(counts=json.dumps({"chop_tree": 18, "sell": 2}))]))
    assert f.loc[0, "n_event_types"] == 2
    assert abs(f.loc[0, "top_event_share"] - 0.9) < 1e-9
    assert abs(f.loc[0, "events_per_min"] - 2.0) < 1e-9          # 20회 / 10분


def test_rates_are_per_minute_and_survive_zero_play_and_null_counts():
    f = build_features(pd.DataFrame([_row(play_sec=0, counts=None, idle_ratio=None, max_gap_sec=None)]))
    assert list(f.columns) == FEATURES
    assert np.isfinite(f.to_numpy(dtype=float)).all()
    assert f.loc[0, "n_event_types"] == 0


def test_session_counter_noise_events_do_not_count_as_behaviour():
    # 자동 이벤트(점수·로그인 등)는 반복/다양성에서 뺀다 — 방치 세션도 매번 찍힌다
    f = build_features(pd.DataFrame([_row(counts=json.dumps({"churn_score": 30, "login": 1, "chop_tree": 1}))]))
    assert f.loc[0, "n_event_types"] == 1


def test_label_join_uses_user_and_run_window():
    runs = [
        {"user_id": "a", "persona_id": "p09-coin-grinder", "account_id": "p09-coin-grinder-a",
         "traits": {"anomaly": "repetitive_farming"}, "outcome": "timeup",
         "started_at": "2026-10-03T03:00:00Z", "ended_at": "2026-10-03T03:20:00Z"},
        {"user_id": "b", "persona_id": "p05-farmer-steady", "account_id": "p05-farmer-steady-a",
         "traits": {}, "outcome": "quit",
         "started_at": "2026-10-03T04:00:00Z", "ended_at": "2026-10-03T04:10:00Z"},
        {"user_id": "c", "persona_id": "p01", "error": "failed"},                       # 실패 기록은 무시
    ]
    s = pd.DataFrame([
        _row(session_id="s1", user_id="a", started_at=pd.Timestamp("2026-10-03T03:00:30Z")),
        _row(session_id="s2", user_id="b", started_at=pd.Timestamp("2026-10-03T04:01:00Z")),
        _row(session_id="s3", user_id="a", started_at=pd.Timestamp("2026-10-04T09:00:00Z")),  # 창 밖 → 라벨 없음
        _row(session_id="s4", user_id="real", started_at=pd.Timestamp("2026-10-03T03:05:00Z")),
    ])
    out = label_sessions(s, runs).set_index("session_id")
    assert out.loc["s1", "anomaly"] == 1 and out.loc["s1", "persona_id"] == "p09-coin-grinder"
    assert out.loc["s2", "anomaly"] == 0
    assert pd.isna(out.loc["s3", "anomaly"]) and pd.isna(out.loc["s4", "anomaly"])


def _synthetic(seed=0, n_norm=120, n_idle=15, n_farm=15, n_real=200):
    rng = np.random.default_rng(seed)
    rows = []
    def add(kind, i, idle, types, top, path, label):
        counts = {f"ev{j}": 1 for j in range(types - 1)}
        counts["main"] = max(1, int(top * 40))
        rows.append(_row(session_id=f"{kind}{i}", user_id=f"{kind}-u{i % 5}", play_sec=int(rng.uniform(300, 1200)),
                         counts=json.dumps(counts), path_len=path, idle_ratio=idle,
                         max_gap_sec=float(rng.uniform(8, 9)), anomaly=label, persona_id=kind))
    for i in range(n_norm): add("norm", i, rng.uniform(0.1, 0.35), int(rng.integers(6, 15)), rng.uniform(0.2, 0.4), rng.uniform(300, 700), 0)
    for i in range(n_idle): add("idle", i, rng.uniform(0.9, 1.0), 1, 0.05, rng.uniform(0, 20), 1)
    for i in range(n_farm): add("farm", i, rng.uniform(0.05, 0.15), 2, 0.95, rng.uniform(800, 1200), 1)
    for i in range(n_real): add("real", i, rng.uniform(0.1, 0.4), int(rng.integers(5, 15)), rng.uniform(0.2, 0.45), rng.uniform(250, 700), np.nan)
    df = pd.DataFrame(rows)
    df.loc[df.persona_id == "real", "persona_id"] = None
    return df


def test_fit_separates_planted_anomalies_and_never_trains_on_them():
    rep = fit_and_evaluate(_synthetic(), seed=0)
    assert rep["n_train"] > 0
    assert rep["train_has_anomaly_personas"] is False
    assert rep["roc_auc"] > 0.9
    assert set(rep["recall_by_kind"]) == {"idle", "farm"}
    assert 0 <= rep["real_flag_rate"] <= 1
    assert set(rep["features"]) == set(FEATURES)
