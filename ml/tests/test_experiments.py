"""calm_ml.experiments — 관리자 실험 페이지용 요약 계산(순수 함수)."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from calm_ml.experiments import (
    cluster_bootstrap_ci,
    daily_cumulative,
    mean_arms,
    prop_arms,
    randomization_pvalue,
    resident_key,
    revisit_within,
)


def test_resident_key_prefers_logged_in_account_over_device():
    assert resident_key("u1", False, "c1") == "u:u1"
    assert resident_key("u1", True, "c1") == "c:c1"      # 게스트 계정 = 기기
    assert resident_key(None, None, "c1") == "c:c1"
    assert resident_key(None, None, None) is None


def test_resident_key_handles_numpy_and_missing_booleans_from_bigquery():
    # BQ BOOL 열은 pandas boolean 확장형 → 순회하면 numpy.bool_ · pd.NA 가 온다(`is False` 비교가 깨진다)
    assert resident_key("u1", np.False_, "c1") == "u:u1"
    assert resident_key("u1", np.True_, "c1") == "c:c1"
    assert resident_key("u1", pd.NA, "c1") == "u:u1"
    s = pd.Series([False, True, None], dtype="boolean")
    assert [resident_key("u1", g, "c1") for g in s] == ["u:u1", "c:c1", "u:u1"]


def test_revisit_counts_only_other_sessions_strictly_after_t0_within_window():
    t0 = pd.Timestamp("2026-09-10 12:00", tz="UTC")
    starts = pd.DataFrame({
        "resident": ["r1", "r1", "r2", "r3", "r3"],
        "session_id": ["s1", "s1b", "s2", "s3", "s3b"],
        "start": [t0 - pd.Timedelta("1h"), t0 + pd.Timedelta("6D"),   # r1: 6일 뒤 다른 세션 → 재방문
                  t0 - pd.Timedelta("1h"),                              # r2: 자기 세션뿐 → 아님
                  t0 - pd.Timedelta("1h"), t0 + pd.Timedelta("8D")],   # r3: 8일 뒤 → 창 밖
    })
    targets = pd.DataFrame({"session_id": ["s1", "s2", "s3"], "resident": ["r1", "r2", "r3"], "t0": [t0] * 3})
    assert revisit_within(targets, starts, days=7).tolist() == [True, False, False]


def test_prop_arms_orders_treatment_first_and_counts_successes():
    df = pd.DataFrame({"arm": ["t", "t", "c", "c", "c"], "y": [1, 0, 1, 1, 0]})
    arms = prop_arms(df, "arm", "y", order=[("t", "처치"), ("c", "대조")])
    assert arms == [{"key": "t", "label": "처치", "n": 2, "x": 1}, {"key": "c", "label": "대조", "n": 3, "x": 2}]


def test_mean_arms_reports_n_mean_sd():
    df = pd.DataFrame({"arm": ["A", "A", "B"], "v": [2.0, 4.0, 5.0]})
    a, b = mean_arms(df, "arm", "v", order=[("A", "번들 A"), ("B", "번들 B")])
    assert a["n"] == 2 and a["mean"] == 3.0 and a["sd"] == pytest.approx(np.sqrt(2.0), abs=1e-3)   # 화면용이라 소수 3자리
    assert b["n"] == 1 and b["sd"] == 0.0


def test_daily_cumulative_is_running_total_per_arm():
    df = pd.DataFrame({"day": ["2026-09-06", "2026-09-06", "2026-09-07"], "arm": ["t", "c", "t"], "y": [1, 0, 0]})
    out = daily_cumulative(df, "day", "arm", "y", "t", "c")
    assert out == [{"day": "2026-09-06", "t": [1, 1], "c": [1, 0]}, {"day": "2026-09-07", "t": [2, 1], "c": [1, 0]}]


def test_randomization_pvalue_is_large_without_effect_and_small_with_one():
    rng = np.random.default_rng(0)
    arm = np.array([1] * 200 + [0] * 200)
    same = rng.random(400) < 0.3
    assert randomization_pvalue(same.astype(int), arm, n_perm=2000, seed=1) > 0.05
    shifted = np.concatenate([rng.random(200) < 0.6, rng.random(200) < 0.2]).astype(int)
    assert randomization_pvalue(shifted, arm, n_perm=2000, seed=1) < 0.01


def test_cluster_bootstrap_ci_brackets_the_point_estimate_in_pp():
    rng = np.random.default_rng(0)
    arm = np.array([1] * 150 + [0] * 150)
    y = np.concatenate([rng.random(150) < 0.5, rng.random(150) < 0.3]).astype(int)
    cluster = np.arange(300) // 2                       # 주민 1명당 세션 2개
    lo, hi = cluster_bootstrap_ci(y, arm, cluster, n_boot=500, seed=2)
    d = (y[arm == 1].mean() - y[arm == 0].mean()) * 100
    assert lo < d < hi and hi - lo < 40
