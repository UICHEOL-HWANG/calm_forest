"""Total income G2 — T1/T2 verdicts (pre-registration: total-income-prereg.md).

T1: Poisson  qty(item, week) ~ log(week mean rate) + item FE + week FE · week bootstrap 2,000 · weeks < 8 → direction only.
    Supported if elasticity CI upper < 1 (weekly totals barely respond → daily response is timing).
T2: sales-weighted mean rate (qty-weighted rate/100) vs 1.00 · device bootstrap 2,000 · devices < 10 → direction only.
Sensitivity (not for verdict): both without the top-3 selling devices; per-item weighted rate.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/total_income.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/income_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from income_g1 import item_week_panel  # noqa: E402
from price_g2 import fit, official  # noqa: E402
from calm_ml import report  # noqa: E402

B, SEED = 2000, 20261012


def t1(o: pd.DataFrame, rng: np.random.Generator, label: str) -> tuple:
    pn = item_week_panel(o).rename(columns={"week_rate": "rate"})
    b = fit(pn, ["item", "week"])
    weeks = np.array(sorted(pn.week.unique()))
    by = {w: g for w, g in pn.groupby("week")}
    bs = [fit(pd.concat([by[w].assign(week=f"{w}#{i}") for i, w in enumerate(rng.choice(weeks, len(weeks)))],
                        ignore_index=True), ["item", "week"]) for _ in range(B)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    v = ("DIRECTION ONLY" if len(weeks) < 8 else
         "SUPPORTED" if hi < 1 else "OPPOSITE" if lo > 1 else "NOT DETERMINABLE")
    print(f"[T1{label}] weekly-total elasticity {b:+.2f} (95% CI {lo:+.2f}~{hi:+.2f}) · {len(weeks)} weeks × {pn.item.nunique()} items → {v}")
    return b, lo, hi, v


def wrate(df: pd.DataFrame) -> float:
    return float((df.rate * df.qty).sum() / df.qty.sum() / 100)


def t2(o: pd.DataFrame, rng: np.random.Generator, label: str) -> tuple:
    est = wrate(o)
    devs = np.array(sorted(o.user_pseudo_id.unique()))
    g = {k: d for k, d in o.groupby("user_pseudo_id")}
    bs = [wrate(pd.concat([g[k] for k in rng.choice(devs, len(devs))])) for _ in range(B)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    v = ("DIRECTION ONLY" if len(devs) < 10 else
         "SUPPORTED" if lo > 1 else "OPPOSITE" if hi < 1 else "NOT DETERMINABLE")
    print(f"[T2{label}] sales-weighted mean rate {est:.3f} (95% CI {lo:.3f}~{hi:.3f}) · {len(o)} sales, {len(devs)} devices → {v}")
    return est, lo, hi, v


def main() -> None:
    rng = np.random.default_rng(SEED)
    o = official().sort_values(["user_pseudo_id", "ts"]).reset_index(drop=True)
    b1, lo1, hi1, v1 = t1(o, rng, "")
    e2, lo2, hi2, v2 = t2(o, rng, "")

    print("\n[secondary, not for verdict]")
    top3 = o.groupby("user_pseudo_id").qty.sum().nlargest(3).index
    rest = o[~o.user_pseudo_id.isin(top3)]
    t1(rest, rng, " without top-3")
    t2(rest, rng, " without top-3")
    per = o.groupby("item").apply(wrate, include_groups=False)
    print("   per-item sales-weighted rate:", {k: round(v, 3) for k, v in per.items()})
    coins_now = float((o.qty * o.rate / 100).sum())
    print(f"   timing premium in coin terms ≈ {(e2 - 1) * 100:+.1f}% of sale value (rate-adjusted units {coins_now:.0f} vs flat-rate {o.qty.sum():.0f})")

    report.setup()
    fig, ax = report.new("유저가 실제로 판 시세 — 시세 분포 평균(1.00)과 비교", len(o),
                         sub=f"판매 수량으로 가중한 평균 시세 · 기기 단위 95% CI · 주 합계 탄력성 {b1:+.2f} (CI {lo1:+.2f}~{hi1:+.2f})",
                         ylab="판매 가중 평균 시세 (배)")
    items = list(per.index)
    vals = [e2] + [per[i] for i in items]
    labels = ["전체"] + [{"coal": "석탄", "crop": "작물", "fish": "물고기", "forage": "채집물", "wood": "목재"}.get(i, i) for i in items]
    bars = ax.bar(labels, vals, color=[report.PALETTE[0]] + [report.PALETTE[1]] * len(items), width=.55)
    ax.vlines(-0.2, lo2, hi2, color="#333", lw=2)   # CI beside the label
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + .01, f"{v:.2f}", ha="center", fontsize=10)
    ax.axhline(1.0, color="#555", lw=.9, ls=":")
    ax.set_ylim(.7, 1.35)
    print(report.check(report.save(fig, ax, "total_income", zero_base=False)))


if __name__ == "__main__":
    main()
