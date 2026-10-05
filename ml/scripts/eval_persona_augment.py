#!/usr/bin/env python3
# =============================================================
#  🧑‍🤝‍🧑 페르소나 데이터로 이탈 모델 학습을 보강하면 실제 유저 예측이 좋아지나? (오프라인 실험)
#  ------------------------------------------------------------
#  ▶ uv run --directory ml python scripts/eval_persona_augment.py
#  ▶ 같은 트리거 표본(churn_trigger_sample.sql)을 실제 / 페르소나로 나눠
#      A) 실제만 학습  B) 실제 + 페르소나 학습  — 평가는 둘 다 **실제 유저 OOF** 로만 한다.
#  ▶ 페르소나 중 Sonnet 이 2분 안에 그만둔 판(최소 시도 규칙 전)은 뺀다 — 모델이 게임을 못 다룬 것.
#  ▶ 운영 학습(train_churn.py·DAG)은 건드리지 않는다.
# =============================================================
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

ML = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML))
from train_churn import FEATURE_ORDER, SQL, _prepare  # noqa: E402

RUNS = ML.parent / "tools" / "persona-sim" / "runs"
SHORT_SONNET_SEC = 120


def load_runs() -> pd.DataFrame:
    rows = [json.loads(l) for f in sorted(RUNS.glob("*.jsonl")) for l in f.read_text().splitlines() if l.strip()]
    keep = ("user_id", "model", "min_try_min", "started_at", "ended_at")   # aside_tail 등 자유 텍스트엔 깨진 서로게이트가 섞여 있다
    r = pd.DataFrame([{k: x.get(k) for k in keep} for x in rows if x.get("outcome") and x.get("user_id")])
    r["started_at"] = pd.to_datetime(r["started_at"], utc=True)
    r["ended_at"] = pd.to_datetime(r["ended_at"], utc=True)
    dur = (r["ended_at"] - r["started_at"]).dt.total_seconds()
    r["short_sonnet"] = r["model"].fillna("").str.contains("sonnet") & r.get("min_try_min").isna() & (dur < SHORT_SONNET_SEC)
    return r


def persona_sessions(runs: pd.DataFrame) -> tuple[set, set]:
    """BQ 세션 → (페르소나 세션 전체, 그중 거를 짧은 Sonnet 판 세션)."""
    from calm_ml import bq
    uids = ",".join(f"'{u}'" for u in runs["user_id"].unique())
    s = bq.read_sql(f"""select session_id, any_value(user_id) user_id, min(created_at) started_at
                        from `calm-forest.calm_forest_raw.game_logs` where user_id in ({uids}) group by session_id""")
    s["started_at"] = pd.to_datetime(s["started_at"], utc=True)
    bad = set()
    for _, r in runs[runs["short_sonnet"]].iterrows():
        m = (s["user_id"] == r["user_id"]) & (s["started_at"] >= r["started_at"] - pd.Timedelta(minutes=2)) & (s["started_at"] <= r["ended_at"])
        bad |= set(s.loc[m, "session_id"])
    return set(s["session_id"]), bad


def oof_auc(real: pd.DataFrame, extra: pd.DataFrame | None, seed: int = 0, n_splits: int = 5) -> float:
    """실제 표본을 client 단위로 접어 평가. extra(페르소나)는 학습 접힘에만 더한다."""
    Xr, yr, gr, _ = _prepare(real)
    oof = np.zeros(len(yr))
    Xe = ye = None
    if extra is not None and len(extra):
        Xe, ye, _, _ = _prepare(extra)
    for tr, te in GroupKFold(n_splits=n_splits).split(Xr, yr, gr):
        Xtr, ytr = Xr[tr], yr[tr]
        if Xe is not None:
            Xtr, ytr = np.vstack([Xtr, Xe]), np.concatenate([ytr, ye])
        sc = StandardScaler().fit(Xtr)
        clf = LogisticRegression(max_iter=1000).fit(sc.transform(Xtr), ytr)
        oof[te] = clf.predict_proba(sc.transform(Xr[te]))[:, 1]
    return float(roc_auc_score(yr, oof))


def boot_diff(real, extra, n=200, seed=0) -> tuple[float, float]:
    """B−A AUC 차이의 부트스트랩 95% 구간(실제 client 단위 재표집)."""
    rng = np.random.default_rng(seed)
    groups = {c: g for c, g in real.groupby("client_id")}
    clients = list(groups)
    diffs = []
    for _ in range(n):
        pick = rng.choice(len(clients), size=len(clients), replace=True)
        boot = pd.concat([groups[clients[k]].assign(client_id=f"{clients[k]}#{i}") for i, k in enumerate(pick)], ignore_index=True)
        if boot["y"].nunique() < 2:
            continue
        diffs.append(oof_auc(boot, extra) - oof_auc(boot, None))
    return float(np.percentile(diffs, 2.5)), float(np.percentile(diffs, 97.5))


def main() -> None:
    from calm_ml import bq
    df = bq.read_sql_file(str(SQL), cap=20)
    runs = load_runs()
    pset, bad = persona_sessions(runs)
    is_p = df["session_id"].isin(pset)
    real, persona = df[~is_p].reset_index(drop=True), df[is_p & ~df["session_id"].isin(bad)].reset_index(drop=True)
    print(f"표본 {len(df)} · 실제 {len(real)} · 페르소나 {int(is_p.sum())} (짧은 Sonnet 제외 후 {len(persona)})")
    print(f"이탈률 실제 {real['y'].mean():.3f} · 페르소나 {persona['y'].mean():.3f}")
    a = oof_auc(real, None)
    b = oof_auc(real, persona)
    print(f"A 실제만      AUC {a:.3f}")
    print(f"B +페르소나   AUC {b:.3f}  (차이 {b - a:+.3f})")
    lo, hi = boot_diff(real, persona)
    print(f"차이 95% 구간 [{lo:+.3f}, {hi:+.3f}]  — 0 을 넘어야 '보강 효과 있음'")


if __name__ == "__main__":
    main()
