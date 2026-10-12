"""LTV early prediction G2 — L1/L2 verdicts (pre-registration: ltv-early-prereg.md, G1 transform fixed).

M0 mean (constant → Spearman 0) · M1 day-0 acquisition count (rank only) · M2 Poisson (L2; alpha by inner 3-fold CV)
on day-0 features (log1p for stay/acq count/sessions, then standardized). Repeated 5-fold CV ×20 → mean out-of-fold
prediction per person. Person bootstrap 2,000 on the fixed OOF predictions. y>0 persons < 30 → direction only.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/ltv_early.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/ltv_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.linear_model import PoissonRegressor
from sklearn.model_selection import GridSearchCV, KFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from ltv_g1 import FEATURES, build  # noqa: E402
from calm_ml import report  # noqa: E402

LOG1P = ["n_acq_d0", "stay_min_d0", "sessions_d0"]
ALPHAS = [0.01, 0.1, 1.0, 10.0]
SEED, REPEATS, B = 20261012, 20, 2000


def design(p: pd.DataFrame) -> np.ndarray:
    X = p[FEATURES].astype(float).copy()
    for c in LOG1P:
        X[c] = np.log1p(X[c])
    return X.to_numpy()


def model() -> GridSearchCV:
    pipe = make_pipeline(StandardScaler(), PoissonRegressor(max_iter=3000))
    return GridSearchCV(pipe, {"poissonregressor__alpha": ALPHAS}, cv=3, scoring="neg_mean_poisson_deviance")


def oof(X: np.ndarray, y: np.ndarray) -> np.ndarray:
    preds = np.zeros((REPEATS, len(y)))
    for r in range(REPEATS):
        for tr, te in KFold(5, shuffle=True, random_state=SEED + r).split(X):
            preds[r, te] = model().fit(X[tr], y[tr]).predict(X[te])
    return preds.mean(axis=0)


def rho(a: np.ndarray, b: np.ndarray) -> float:
    if np.ptp(a) == 0 or np.ptp(b) == 0:
        return 0.0
    return float(spearmanr(a, b).statistic)


def capture(pred: np.ndarray, y: np.ndarray, top: float = .2) -> float:
    k = max(1, int(round(len(y) * top)))
    return float(y[np.argsort(-pred, kind="stable")[:k]].sum() / y.sum())


def main() -> None:
    p = build().sort_index()
    y = p.y.to_numpy(float)
    X = design(p)
    m2 = oof(X, y)
    m1 = p.n_acq_d0.to_numpy(float)
    rng = np.random.default_rng(SEED)
    idx = np.arange(len(y))
    bs = []
    for _ in range(B):
        i = rng.choice(idx, len(idx))
        bs.append((rho(m2[i], y[i]), rho(m1[i], y[i])))
    bs = np.array(bs)
    r2, r1 = rho(m2, y), rho(m1, y)
    lo2, hi2 = np.percentile(bs[:, 0], [2.5, 97.5])
    lod, hid = np.percentile(bs[:, 0] - bs[:, 1], [2.5, 97.5])
    n_pos = int((y > 0).sum())

    def verdict(est_ok: bool, lo: float, hi: float) -> str:
        if n_pos < 30:
            return "DIRECTION ONLY"
        return "SUPPORTED" if est_ok and lo > 0 else ("OPPOSITE" if hi < 0 else "NOT DETERMINABLE")

    print(f"n={len(y)} · y>0 {n_pos} · total acquired days {int(y.sum())}")
    print(f"[L1] M2 Spearman {r2:+.3f} (95% CI {lo2:+.3f}~{hi2:+.3f}) → {verdict(r2 > 0, lo2, hi2)}")
    print(f"[L2] M2 − M1 Spearman {r2 - r1:+.3f} (95% CI {lod:+.3f}~{hid:+.3f}) · M1 {r1:+.3f} → {verdict(r2 > r1, lod, hid)}")
    print(f"     M0 (mean) Spearman 0 by construction")
    print("\n[secondary, not for verdict]")
    print(f"   top-20% capture of acquired days: M2 {capture(m2, y):.0%} · M1 {capture(m1, y):.0%} · random 20%")
    full = model().fit(X, y)
    coef = full.best_estimator_.named_steps["poissonregressor"].coef_
    print(f"   chosen alpha (full fit) {full.best_params_['poissonregressor__alpha']}")
    for f, c in sorted(zip(FEATURES, coef), key=lambda t: -abs(t[1])):
        print(f"   coef {f:12} {c:+.2f}  (per 1 SD{' of log1p' if f in LOG1P else ''})")

    report.setup()
    q = pd.qcut(pd.Series(m2).rank(method="first"), 5, labels=["하위 20%", "20~40%", "40~60%", "60~80%", "상위 20%"])
    agg = pd.DataFrame({"q": q, "y": y}).groupby("q", observed=True).y.mean()
    fig, ax = report.new("첫날 행동 예측 순위별 실제 28일 가치", len(y),
                         sub=f"첫 진입 7/27~9/13 · 교차검증 밖 예측 5등분 · 스피어만 {r2:+.2f} (CI {lo2:+.2f}~{hi2:+.2f}) · 0 아닌 사람 {n_pos}명 → 방향만",
                         ylab="1~28일차 획득한 날 (평균)")
    bars = ax.bar(agg.index.astype(str), agg.values, color=report.PALETTE[2], width=.55)
    for b, v in zip(bars, agg.values):
        ax.text(b.get_x() + b.get_width() / 2, v + .05, f"{v:.2f}", ha="center", fontsize=10)
    ax.set_ylim(0, agg.max() * 1.18)
    ax.set_xlabel("첫날 행동으로 예측한 순위 (교차검증 밖)")
    print(report.check(report.save(fig, ax, "ltv_early")))


if __name__ == "__main__":
    main()
