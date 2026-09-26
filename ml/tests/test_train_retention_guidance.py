"""리텐션 안내 재학습 — 표본 게이트·export 형태·W&B 아티팩트를 BQ 없이 합성 데이터로 검증한다."""
import json

import numpy as np
import pandas as pd
import pytest

from calm_ml.retention_features import FEATURE_ORDER
from train_retention_guidance import (
    MIN_POSITIVES,
    MIN_ROWS,
    check_sample,
    fit_and_export,
    log_to_wandb,
)

RAW_COLS = [
    "early_tracked_events", "early_actions", "early_action_kinds", "early_area_count",
    "early_event_name_count", "early_ga_auto_events", "early_entry_auth_events",
    "early_connect_ok_events", "early_connect_fail_events", "early_other_tracking_events",
    "early_nature_events", "early_fishing_sea_events", "early_quest_social_events",
    "early_craft_home_events", "early_advanced_events", "early_chop_tree_events",
    "early_mine_ore_events", "early_npc_talk_events", "early_tutorial_step_events",
    "early_quest_offered_events", "early_churn_score_events", "early_session_summary_events",
    "early_session_time_events", "early_econ_tx_events", "early_zone_enter_events",
]


def synthetic(n=200, pos_rate=0.15, seed=0):
    """early_actions 가 많을수록 나중에 또 하는 합성 표본."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({c: rng.poisson(1.0, n) for c in RAW_COLS})
    df["early_actions"] = rng.poisson(3.0, n)
    df["early_tracked_events"] = df["early_actions"] + rng.poisson(10.0, n)
    signal = df["early_actions"] + rng.normal(0, 1, n)
    df["later_active"] = signal > np.quantile(signal, 1 - pos_rate)
    return df


def test_check_sample_passes_enough_rows_and_positives():
    check_sample(synthetic())  # 예외 없음


def test_check_sample_rejects_too_few_rows():
    with pytest.raises(ValueError, match="표본"):
        check_sample(synthetic(n=MIN_ROWS - 1, pos_rate=0.5))


def test_check_sample_rejects_too_few_positives():
    df = synthetic(n=MIN_ROWS + 50)
    df["later_active"] = False
    df.loc[: MIN_POSITIVES - 2, "later_active"] = True
    with pytest.raises(ValueError, match="양성"):
        check_sample(df)


def test_export_shape_matches_serving_contract(tmp_path):
    out = tmp_path / "retention_guidance.json"
    model = fit_and_export(synthetic(), out, log_wandb=False)
    saved = json.loads(out.read_text(encoding="utf-8"))
    assert saved == model
    assert saved["feature_order"] == FEATURE_ORDER
    assert len(saved["coef"]) == len(FEATURE_ORDER)
    assert len(saved["scaler"]["mean"]) == len(FEATURE_ORDER)
    assert saved["enabled"] is True
    assert not out.with_suffix(".json.tmp").exists()


def test_metrics_include_out_of_fold_auc(tmp_path):
    model = fit_and_export(synthetic(), tmp_path / "m.json", log_wandb=False)
    cv = model["metrics"]["cv_auc"]
    assert cv is not None and 0.5 < cv <= 1.0  # 합성 신호를 교차검증에서도 잡는다
    assert model["metrics"]["n"] == 200


def test_log_to_wandb_uploads_versioned_artifact(tmp_path):
    out = tmp_path / "m.json"
    model = fit_and_export(synthetic(), out, log_wandb=False)
    calls = {}

    class FakeRun:
        def log(self, m): calls["metrics"] = m
        def log_artifact(self, art, aliases): calls["aliases"] = aliases; calls["art"] = art
        def finish(self): calls["finished"] = True

    class FakeArtifact:
        def __init__(self, name, type, metadata):
            self.name, self.type, self.metadata, self.files = name, type, metadata, []
        def add_file(self, path, name): self.files.append((path, name))

    log_to_wandb(model, out, start_run=lambda *a, **k: FakeRun(), artifact_cls=FakeArtifact)
    assert calls["art"].name == "retention-guidance-model"
    assert calls["art"].files == [(str(out), "retention_guidance.json")]
    assert "latest" in calls["aliases"]
    assert all(":" not in a and "/" not in a for a in calls["aliases"])
    assert calls["finished"]
