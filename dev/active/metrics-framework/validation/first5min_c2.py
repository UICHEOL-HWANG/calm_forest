"""First-5-min G2 · C2 — does a harvest-first acquisition predict coming back more?

Pre-registered in first5min-hypotheses.md (C2). Target = entered new users who acquired within 7 days,
first entry 7/27~9/20 (day 21 observable; data to 10/11). Groups: first acquisition harvest_crop vs other.
Primary = acquired days on days 8~21 after entry (first week excluded to avoid counting the first
acquisition itself). Secondary (not for the verdict): any visit on days 8~21, 28-day engagement LTV.
Person key and acquisition days come from the same GA4 rules as ltv_engagement / time_to_first_acquisition.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/first5min_c2_harvest_first.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_c2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from time_to_first_acquisition import SQL as TTFA_SQL  # noqa: E402
from ltv_engagement import ga4_person_days  # noqa: E402
from hierarchy_baseline import read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

LAST_D0 = pd.Timestamp("2026-09-20").date()
DATA_END = pd.Timestamp("2026-10-11").date()


def boot_diff(a: np.ndarray, b: np.ndarray, seed: int = 20261012) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    bs = [rng.choice(a, len(a)).mean() - rng.choice(b, len(b)).mean() for _ in range(2000)]
    return tuple(np.percentile(bs, [2.5, 97.5]))


def main() -> None:
    c = read_sql(TTFA_SQL)
    c["d0"] = pd.to_datetime(c["d0"]).dt.date
    c = c[c["sec"].notna() & (c["d0"] <= LAST_D0)].copy()
    c = c.sort_values("person").reset_index(drop=True)   # stable order -> reproducible bootstrap
    c["group"] = np.where(c["first_event"] == "harvest_crop", "harvest", "other")
    days = ga4_person_days()
    days = days[(days["d"] <= DATA_END) & days["person"].isin(c["person"])].merge(c[["person", "d0"]], on="person")
    days["k"] = (pd.to_datetime(days["d"]) - pd.to_datetime(days["d0"])).dt.days
    w = days[days["k"].between(8, 21)]
    acq = w[w["tended"]].groupby("person").size()
    vis = w[w["entered"]].groupby("person").size()
    c["acq_8_21"] = c["person"].map(acq).fillna(0)
    c["visit_8_21"] = c["person"].map(vis).fillna(0) > 0
    l28 = days[days["k"].between(0, 27) & days["tended"]].groupby("person").size()
    c["ltv28"] = c["person"].map(l28).fillna(0)
    obs28 = c["d0"] <= (pd.Timestamp(DATA_END) - pd.Timedelta(days=27)).date()

    h = c.loc[c.group == "harvest", "acq_8_21"].to_numpy(float)
    o = c.loc[c.group == "other", "acq_8_21"].to_numpy(float)
    diff = h.mean() - o.mean()
    lo, hi = boot_diff(h, o)
    print(f"target {len(c)} (acquired ≤7d, first entry 7/27~9/20) · harvest-first {len(h)} · other {len(o)}")
    print(f"days 8~21 acquired days: harvest {h.mean():.2f} · other {o.mean():.2f} · diff {diff:+.2f} 95% CI [{lo:+.2f}, {hi:+.2f}]")
    if min(len(h), len(o)) < 30:
        v = "DIRECTION ONLY (a group has n < 30)"
    elif lo > 0:
        v = "SUPPORTED"
    elif hi < 0:
        v = "OPPOSITE (other-first higher)"
    else:
        v = "NOT DETERMINABLE with this sample"
    print(f"verdict (pre-registered): {v}")
    print("  any acquired day 8~21: " + " · ".join(f"{g} {(c[c.group == g].acq_8_21 > 0).mean():.0%}" for g in ("harvest", "other")))
    print("  secondary visit 8~21: " + " · ".join(f"{g} {c[c.group == g].visit_8_21.mean():.0%}" for g in ("harvest", "other")))
    cc = c[obs28]
    print(f"  secondary LTV28 (n={len(cc)}): " + " · ".join(f"{g} {cc[cc.group == g].ltv28.mean():.2f}" for g in ("harvest", "other")))
    print("  'other' first events: " + " · ".join(f"{k} {n}" for k, n in c.loc[c.group == 'other', 'first_event'].value_counts().items()))

    report.setup()
    vals = [h.mean(), o.mean()]
    fig, ax = report.new("첫 획득 종류별 8~21일차 획득한 날", len(c),
                         sub=f"7일 안 첫 획득을 한 신규 · 첫 진입 7/27~9/20 · 차이 {diff:+.2f}일 (95% CI {lo:+.2f}~{hi:+.2f})",
                         ylab="1인당 평균 획득한 날 (일)")
    bars = ax.bar([f"수확으로 시작 ({len(h)}명)", f"그 외로 시작 ({len(o)}명)"], vals, color=[report.PALETTE[2], report.PALETTE[1]], width=0.5)
    for b, val in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, val + max(vals) * 0.04, f"{val:.2f}일", ha="center", fontsize=11)
    ax.set_ylim(0, max(vals) * 1.3)
    print(report.check(report.save(fig, ax, "first5min_c2_harvest_first")))


if __name__ == "__main__":
    main()
