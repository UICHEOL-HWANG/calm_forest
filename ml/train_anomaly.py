# =============================================================
#  calm forest · 세션 이상치 탐지 — BQ 세션 피처 + 페르소나 라벨 → Isolation Forest
#  ------------------------------------------------------------
#  ▶ 손으로:  uv run --directory ml python train_anomaly.py --since 2026-10-02
#  ▶ 학습:   실제 유저 세션 + 정상 페르소나 세션(일부)만으로 비지도 적합.
#            이상 페르소나(p09 반복 파밍·p10 방치)는 **학습에 절대 넣지 않고** 평가에만 쓴다.
#  ▶ 평가:   남겨둔 정상 페르소나(유저 단위 분리) vs 이상 페르소나 → ROC-AUC·PR-AUC·종류별 재현율.
#  ▶ 출력:   reports/anomaly/<날짜>/report.json · flagged_real.csv(임계 넘은 실제 유저 세션)
# =============================================================
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.preprocessing import StandardScaler

from calm_ml.anomaly_features import FEATURES, build_features, label_sessions, load_runs

HERE = Path(__file__).parent
SQL = HERE / "sql" / "anomaly_session_features.sql"
RUNS_DIR = HERE.parent / "tools" / "persona-sim" / "runs"
FLAG_QUANTILE = 0.95          # 학습 점수 상위 5% 를 '이상'으로 본다
HOLDOUT_FRAC = 0.3            # 정상 페르소나 유저 중 평가용으로 남길 비율


def _kind(df: pd.DataFrame) -> pd.Series:
    k = df["anomaly_kind"] if "anomaly_kind" in df else pd.Series(None, index=df.index)
    return k.where(k.notna(), df["persona_id"])


def fit_and_evaluate(df: pd.DataFrame, *, seed: int = 0) -> dict:
    """라벨 붙은 세션 DataFrame → 평가 리포트(dict). df 에 anomaly(1/0/NaN)·persona_id 가 있어야 한다."""
    X = build_features(df).to_numpy(float)
    lab = pd.to_numeric(df["anomaly"], errors="coerce")
    is_anom, is_norm, is_real = (lab == 1).to_numpy(), (lab == 0).to_numpy(), lab.isna().to_numpy()

    # 정상 페르소나는 '유저' 단위로 학습/평가를 나눈다 — 같은 계정의 다른 판이 양쪽에 들어가면 낙관 편향
    rng = np.random.default_rng(seed)
    norm_users = np.array(sorted(df.loc[is_norm, "user_id"].unique()))
    rng.shuffle(norm_users)
    hold_users = set(norm_users[: max(1, int(round(len(norm_users) * HOLDOUT_FRAC)))]) if len(norm_users) else set()
    hold = is_norm & df["user_id"].isin(hold_users).to_numpy()
    train = is_real | (is_norm & ~hold)

    scaler = StandardScaler().fit(X[train])
    model = IsolationForest(n_estimators=300, random_state=seed).fit(scaler.transform(X[train]))
    score = -model.score_samples(scaler.transform(X))             # 클수록 이상
    thr = float(np.quantile(score[train], FLAG_QUANTILE))
    flagged = score > thr

    ev = hold | is_anom
    y_ev = is_anom[ev].astype(int)
    two_classes = len(np.unique(y_ev)) == 2
    kinds = _kind(df)
    recall_by_kind = {str(k): float(flagged[is_anom & (kinds == k).to_numpy()].mean())
                      for k in sorted(kinds[is_anom].dropna().unique())}

    return {
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "features": FEATURES,
        "n_train": int(train.sum()), "n_train_real": int(is_real.sum()), "n_train_persona": int((is_norm & ~hold).sum()),
        "n_eval_normal": int(hold.sum()), "n_eval_anomaly": int(is_anom.sum()),
        "train_has_anomaly_personas": bool((train & is_anom).any()),
        "threshold": thr, "flag_quantile": FLAG_QUANTILE,
        "roc_auc": float(roc_auc_score(y_ev, score[ev])) if two_classes else None,
        "pr_auc": float(average_precision_score(y_ev, score[ev])) if two_classes else None,
        "false_positive_rate": float(flagged[hold].mean()) if hold.any() else None,
        "recall_by_kind": recall_by_kind,
        "real_flag_rate": float(flagged[is_real].mean()) if is_real.any() else 0.0,
        "_score": score, "_flagged": flagged,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="2026-10-02", help="이 날짜 이후 시작한 세션(BQ 미러)")
    ap.add_argument("--runs-dir", default=str(RUNS_DIR))
    ap.add_argument("--out-dir", default=str(HERE / "reports" / "anomaly"))
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()

    from calm_ml.bq import read_sql                                 # BQ 의존은 실행 시에만(테스트는 합성 데이터)
    raw = read_sql(SQL.read_text(), since=date.fromisoformat(a.since))
    df = label_sessions(raw, load_runs(a.runs_dir)).reset_index(drop=True)
    rep = fit_and_evaluate(df, seed=a.seed)

    out = Path(a.out_dir) / datetime.now().strftime("%Y-%m-%d")
    out.mkdir(parents=True, exist_ok=True)
    feats = build_features(df)
    real = df["anomaly"].isna().to_numpy() & rep["_flagged"]
    cols = ["session_id", "user_id", "platform", "play_sec", "started_at"]
    (pd.concat([df.loc[real, cols], feats[real]], axis=1)
       .assign(score=rep["_score"][real]).sort_values("score", ascending=False)
       .to_csv(out / "flagged_real.csv", index=False))
    persona = df["persona_id"].notna().to_numpy()
    (pd.concat([df.loc[persona, ["session_id", "persona_id", "anomaly"]], feats[persona]], axis=1)
       .assign(score=rep["_score"][persona], flagged=rep["_flagged"][persona])
       .to_csv(out / "persona_scores.csv", index=False))
    public = {k: v for k, v in rep.items() if not k.startswith("_")}
    (out / "report.json").write_text(json.dumps(public, ensure_ascii=False, indent=2))
    print(json.dumps(public, ensure_ascii=False, indent=2))
    print(f"→ {out}")


if __name__ == "__main__":
    main()
