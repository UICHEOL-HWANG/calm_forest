# =============================================================
#  calm forest · 이상치 탐지 피처 + 페르소나 라벨 조인
#  ------------------------------------------------------------
#  입력: ml/sql/anomaly_session_features.sql 결과(세션 1행)
#  라벨: tools/persona-sim/runs/*.jsonl — Aside 페르소나 판 기록.
#        traits.anomaly 가 있는 페르소나(p09 반복 파밍·p10 방치)=1, 나머지 페르소나=0, 실제 유저=NaN
# =============================================================
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

FEATURES = [
    "play_min", "events_per_min", "n_event_types", "top_event_share",
    "idle_ratio", "path_per_min", "yaw_per_min", "max_gap_sec", "samples_per_min",
    "coin_in_per_min", "coin_out_per_min", "tx_per_min", "n_sources",
]

# 플레이와 무관하게 자동으로 찍히는 이벤트 — 방치 세션에도 쌓이므로 행동 다양성·반복에서 뺀다
NOISE = {"login", "daily_bonus", "weather_day", "character_select", "nickname_set",
         "session_time", "session_summary", "first_chop"}
NOISE_PREFIXES = ("churn_", "retention_guidance", "tut_", "tutorial_", "intro_", "save_",
                  "season_", "story_", "dex_gate", "guide_")

RUN_WINDOW_LEAD = pd.Timedelta(seconds=120)   # 세션 시작은 판 시작 직후(주입→새로고침) — 약간 앞당겨 허용


def _behaviour_counts(raw) -> dict[str, int]:
    if raw is None or (isinstance(raw, float) and np.isnan(raw)):
        return {}
    d = json.loads(raw) if isinstance(raw, str) else dict(raw)
    return {k: int(v) for k, v in d.items()
            if k not in NOISE and not k.startswith(NOISE_PREFIXES) and isinstance(v, (int, float)) and v > 0}


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """세션 원천 행 → FEATURES 순서의 float 행렬(DataFrame). 결측·0분 세션도 유한값으로 만든다."""
    out = pd.DataFrame(index=df.index)
    play_min = np.maximum(pd.to_numeric(df["play_sec"], errors="coerce").fillna(0).to_numpy(float), 1.0) / 60.0
    counts = df["counts"].map(_behaviour_counts)
    total = counts.map(lambda c: sum(c.values())).to_numpy(float)
    num = lambda c, fill=0.0: pd.to_numeric(df[c], errors="coerce").fillna(fill).to_numpy(float)

    out["play_min"] = play_min
    out["events_per_min"] = total / play_min
    out["n_event_types"] = counts.map(len).to_numpy(float)
    out["top_event_share"] = counts.map(lambda c: max(c.values()) / sum(c.values()) if c else 0.0).to_numpy(float)
    out["idle_ratio"] = num("idle_ratio", 1.0)          # 좌표 표본이 하나도 없으면 '움직임 없음'으로 본다
    out["path_per_min"] = num("path_len") / play_min
    out["yaw_per_min"] = num("yaw_total") / play_min
    out["max_gap_sec"] = num("max_gap_sec")
    out["samples_per_min"] = num("n_samples") / play_min
    out["coin_in_per_min"] = num("coin_in") / play_min
    out["coin_out_per_min"] = num("coin_out") / play_min
    out["tx_per_min"] = num("n_tx") / play_min
    out["n_sources"] = num("n_sources")
    return out[FEATURES].astype(float)


def load_runs(runs_dir: Path | str) -> list[dict]:
    rows = []
    for f in sorted(Path(runs_dir).glob("*.jsonl")):
        rows += [json.loads(line) for line in f.read_text().splitlines() if line.strip()]
    return rows


def label_sessions(sessions: pd.DataFrame, runs: list[dict]) -> pd.DataFrame:
    """세션에 페르소나 라벨을 붙인다. user_id 가 같고 판 시간창 안에서 시작한 세션만 그 판의 세션이다
    (페르소나 계정 a~e 는 여러 판에 재사용된다)."""
    ok = [r for r in runs if r.get("outcome") and r.get("user_id") and r.get("started_at") and r.get("ended_at")]
    out = sessions.copy()
    out["anomaly"] = np.nan
    out["persona_id"] = None
    out["anomaly_kind"] = None
    started = pd.to_datetime(out["started_at"], utc=True)
    for r in ok:
        lo = pd.Timestamp(r["started_at"]) - RUN_WINDOW_LEAD
        hi = pd.Timestamp(r["ended_at"])
        m = (out["user_id"] == r["user_id"]) & (started >= lo) & (started <= hi)
        kind = (r.get("traits") or {}).get("anomaly")
        out.loc[m, "anomaly"] = 1.0 if kind else 0.0
        out.loc[m, "persona_id"] = r["persona_id"]
        out.loc[m, "anomaly_kind"] = kind
    return out
