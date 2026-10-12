"""Price response G2 — P1/P2 verdicts (pre-registration: price-response-prereg.md).

P1: Poisson  qty(item, day) ~ log(rate) + item FE + day FE   (days with any sale of the panel items; zero-sale
    item-days filled with the code-formula rate). Day bootstrap 2,000.
P2: Poisson  qty(sale) ~ log(rate) + item FE                 Device bootstrap 2,000.
Sensitivity (not for verdict): P1 without the top-3 selling devices.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/price_response.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/price_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import PoissonRegressor

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from price_g1 import MIN_SALE_DAYS, code_rate, load  # noqa: E402
from calm_ml import report  # noqa: E402

B, SEED = 2000, 20261012


def official() -> pd.DataFrame:
    d = load()
    o = d[~(d.persona | d.dev | d.beta | d.merchant | d.no_rate)].copy()
    days = o.groupby("item").day.nunique()
    return o[o.item.isin(days[days >= MIN_SALE_DAYS].index)].copy()


def panel(o: pd.DataFrame) -> pd.DataFrame:
    items, days = sorted(o.item.unique()), sorted(o.day.unique())   # days with any panel sale
    g = o.groupby(["item", "day"]).qty.sum()
    rows = [(it, dy, int(g.get((it, dy), 0)), code_rate(dy, it)) for it in items for dy in days]
    return pd.DataFrame(rows, columns=["item", "day", "qty", "rate"])


def fit(df: pd.DataFrame, fe: list[str]) -> float:
    X = pd.get_dummies(df[fe].astype(str), drop_first=True, dtype=float)
    X.insert(0, "log_rate", np.log(df.rate.to_numpy(float) / 100))
    m = PoissonRegressor(alpha=0.0, max_iter=3000).fit(X.to_numpy(), df.qty.to_numpy(float))
    return float(m.coef_[0])


def verdict(b: float, lo: float, hi: float, n_days: int) -> str:
    if n_days < 30:
        return "DIRECTION ONLY"
    return "SUPPORTED" if b > 0 and lo > 0 else ("OPPOSITE" if hi < 0 else "NOT DETERMINABLE")


def p1(o: pd.DataFrame, rng: np.random.Generator, label: str) -> tuple:
    pn = panel(o)
    b = fit(pn, ["item", "day"])
    days = np.array(sorted(pn.day.unique()))
    by = {d: g for d, g in pn.groupby("day")}
    bs = []
    for _ in range(B):
        pick = rng.choice(days, len(days))
        parts = [by[d].assign(day=f"{d}#{i}") for i, d in enumerate(pick)]   # duplicates = separate FE levels
        bs.append(fit(pd.concat(parts, ignore_index=True), ["item", "day"]))
    lo, hi = np.percentile(bs, [2.5, 97.5])
    v = verdict(b, lo, hi, len(days))
    print(f"[P1{label}] elasticity (log-rate coef) {b:+.2f} (95% CI {lo:+.2f}~{hi:+.2f}) · {len(days)} days × {pn.item.nunique()} items → {v}")
    return b, lo, hi, v, pn


def main() -> None:
    rng = np.random.default_rng(SEED)
    o = official().sort_values(["user_pseudo_id", "ts"]).reset_index(drop=True)
    print(f"official panel sales {len(o)} · devices {o.user_pseudo_id.nunique()} · items {sorted(o.item.unique())}")
    b1, lo1, hi1, v1, pn = p1(o, rng, "")

    b2 = fit(o, ["item"])
    devs = np.array(sorted(o.user_pseudo_id.unique()))
    gd = {k: g for k, g in o.groupby("user_pseudo_id")}
    bs = [fit(pd.concat([gd[k] for k in rng.choice(devs, len(devs))], ignore_index=True), ["item"]) for _ in range(B)]
    lo2, hi2 = np.percentile(bs, [2.5, 97.5])
    v2 = verdict(b2, lo2, hi2, o.day.nunique())
    print(f"[P2] per-sale qty elasticity {b2:+.2f} (95% CI {lo2:+.2f}~{hi2:+.2f}) · {len(o)} sales, {len(devs)} devices → {v2}")

    print("\n[secondary, not for verdict]")
    top3 = o.groupby("user_pseudo_id").qty.sum().nlargest(3).index
    p1(o[~o.user_pseudo_id.isin(top3)], rng, " without top-3 devices")
    for it in sorted(o.item.unique()):
        q = pn[pn.item == it]
        hi_r, lo_r = q[q.rate >= 100], q[q.rate < 100]
        print(f"   {it:7}: mean qty/day on rate≥100 days {hi_r.qty.mean():.1f} (n={len(hi_r)}) vs <100 {lo_r.qty.mean():.1f} (n={len(lo_r)})")

    report.setup()
    pn = pn.assign(bin=pd.cut(pn.rate, [69, 85, 100, 115, 130], labels=["70~85", "86~100", "101~115", "116~130"]))
    rel = pn.groupby("item").qty.transform("mean")
    pn["ratio"] = np.where(rel > 0, pn.qty / rel, np.nan)
    agg = pn.groupby("bin", observed=True).ratio.agg(["mean", "count"])
    fig, ax = report.new("시세가 높은 날에 더 많이 파나 — 품목별 평균 대비 판매량", len(o),
                         sub=f"품목·날 {len(pn)}칸 (판매 있는 {pn.day.nunique()}일 × {pn.item.nunique()}품목) · 1.0 = 그 품목의 평균 · 탄력성 {b1:+.2f} (95% CI {lo1:+.2f}~{hi1:+.2f})",
                         ylab="품목 평균 대비 판매량 (배)")
    bars = ax.bar(agg.index.astype(str), agg["mean"], color=report.PALETTE[1], width=.55)
    for bar, (m, n) in zip(bars, agg.itertuples(index=False)):
        ax.text(bar.get_x() + bar.get_width() / 2, m + .03, f"{m:.2f}\n(n={n})", ha="center", fontsize=9)
    ax.axhline(1, color="#555", lw=.8, ls=":")
    ax.set_xlabel("그날 시세 (%)")
    print(report.check(report.save(fig, ax, "price_response")))


if __name__ == "__main__":
    main()
