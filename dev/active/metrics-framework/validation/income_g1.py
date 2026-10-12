"""Total income G1 — data reliability (pre-registration: total-income-prereg.md).

Builds the item × week panel ONCE (same official sales as price G2). Does NOT fit T1 or compute the
sales-weighted rate (G2). Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/income_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from price_g1 import END, START, code_rate  # noqa: E402
from price_g2 import official  # noqa: E402


def week_of(day: pd.Series) -> pd.Series:
    d = pd.to_datetime(day)
    return (d - pd.to_timedelta(d.dt.weekday, unit="D")).dt.strftime("%Y-%m-%d")


def item_week_panel(o: pd.DataFrame) -> pd.DataFrame:
    days = pd.date_range(START, END).strftime("%Y-%m-%d")
    rates = pd.DataFrame([(it, d, code_rate(d, it)) for it in sorted(o.item.unique()) for d in days],
                         columns=["item", "day", "rate"])
    rates["week"] = week_of(rates.day)
    mean_rate = rates.groupby(["item", "week"]).rate.mean().rename("week_rate")
    qty = o.assign(week=week_of(o.day)).groupby(["item", "week"]).qty.sum()
    pn = mean_rate.to_frame().join(qty).fillna({"qty": 0}).reset_index()
    sale_weeks = pn.groupby("week").qty.sum()
    return pn[pn.week.isin(sale_weeks[sale_weeks > 0].index)].reset_index(drop=True)


def main() -> None:
    o = official()
    pn = item_week_panel(o)
    print(f"[1] official sales {len(o)} · devices {o.user_pseudo_id.nunique()} (T2 needs ≥10) · items {sorted(o.item.unique())}")
    print(f"[2] weeks with any panel sale {pn.week.nunique()} (T1 needs ≥8) · item-week rows {len(pn)} · rows with qty 0 {int((pn.qty == 0).sum())}")
    w = pn.week_rate / 100
    print(f"[3] weekly mean rate: range {w.min():.2f}~{w.max():.2f} · SD {w.std():.3f}  (daily rate SD ≈ {np.std(np.arange(70, 131)) / 100:.3f})")
    print(f"    SD of log(week rate) within week across items: {pn.assign(l=np.log(w)).groupby('week').l.std().mean():.3f}")
    first, last = pn.week.min(), pn.week.max()
    print(f"[4] week coverage {first} ~ {last} · partial edge weeks included as calendar weeks")
    top3 = o.groupby("user_pseudo_id").qty.sum().nlargest(3).sum() / o.qty.sum()
    print(f"[5] top-3 devices share of qty {top3:.0%} (sensitivity planned)")


if __name__ == "__main__":
    main()
