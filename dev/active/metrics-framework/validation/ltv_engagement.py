"""Engagement LTV — value unit = acquired days (the north-star unit), not cash.

LTV(k) = acquired days a new user accumulates in days 0..k-1 after their first visit.
Population/key rules are the official ones from hierarchy_baseline.person_days (spec §2).
Only cohorts fully observable for 28 days are included.
Activation comparison uses days 8-28 only (days 0-6 define activation itself).

Run: ml/.venv/bin/python dev/active/metrics-framework/validation/ltv_engagement.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import person_days  # noqa: E402

HORIZONS = (7, 14, 28)
RNG = np.random.default_rng(20261010)
N_BOOT = 2000


def _ci(values: np.ndarray) -> tuple[float, float]:
    if len(values) == 0:
        return float("nan"), float("nan")
    boots = [RNG.choice(values, len(values)).mean() for _ in range(N_BOOT)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    return float(lo), float(hi)


def cohort_table(pd_df: pd.DataFrame) -> pd.DataFrame:
    first = pd_df.groupby("person")["d"].min().rename("d0")
    df = pd_df.join(first, on="person")
    df["k"] = (pd.to_datetime(df["d"]) - pd.to_datetime(df["d0"])).dt.days
    last_day = df["d"].max()
    eligible = first[first <= last_day - pd.Timedelta(days=max(HORIZONS) - 1)]
    df = df[df["person"].isin(eligible.index)]
    per = pd.DataFrame(index=eligible.index)
    for h in HORIZONS:
        per[f"ltv{h}"] = df[df["k"] < h].groupby("person")["tended"].sum().reindex(per.index, fill_value=0)
    per["post_8_28"] = df[df["k"].between(7, 27)].groupby("person")["tended"].sum().reindex(per.index, fill_value=0)
    per["activated"] = per["ltv7"] > 0
    print(f"cohort: first visit {eligible.min()} ~ {eligible.max()} (28-day observable), data until {last_day}")
    return per


def report(per: pd.DataFrame) -> None:
    n = len(per)
    print(f"\n[engagement LTV, all new users] n={n}")
    for h in HORIZONS:
        v = per[f"ltv{h}"].to_numpy(float)
        lo, hi = _ci(v)
        print(f"  LTV{h:<2d} mean {v.mean():.2f} acquired days [{lo:.2f}, {hi:.2f}] · "
              f"median {np.median(v):.0f} · zero-share {(v == 0).mean():.0%}")
    print("\n[days 8-28 acquired days by first-week activation]")
    for label, g in [("activated (acquired in days 0-6)", per[per["activated"]]),
                     ("not activated", per[~per["activated"]])]:
        v = g["post_8_28"].to_numpy(float)
        lo, hi = _ci(v)
        print(f"  {label:34s} n={len(g):3d}  mean {v.mean():.2f} [{lo:.2f}, {hi:.2f}]  any>0 {(v > 0).mean():.0%}")
    a = per.loc[per["activated"], "post_8_28"].to_numpy(float)
    b = per.loc[~per["activated"], "post_8_28"].to_numpy(float)
    if len(a) and len(b) and b.mean() > 0:
        print(f"  ratio activated/not = {a.mean() / b.mean():.1f}x")
    ranked = per["ltv28"].sort_values(ascending=False)
    top = ranked.head(max(1, int(round(n * 0.10)))).sum() / max(ranked.sum(), 1)
    print(f"\n[concentration] top 10% of new users hold {top:.0%} of 28-day acquired days")


def main() -> None:
    per = cohort_table(person_days())
    report(per)


if __name__ == "__main__":
    main()
