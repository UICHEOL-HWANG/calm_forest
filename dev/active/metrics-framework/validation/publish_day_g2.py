"""F2 G2 — publish impact days vs other days (pre-registration: publish-day-prereg.md).

F2-a: daily new devices ratio (impact ÷ other), day bootstrap. F2-b: entry rate difference, device bootstrap.
Impact-day devices n < 30 → direction only. Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/publish_day_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from publish_day_g1 import END, IMPACT, START, table  # noqa: E402


def main() -> None:
    rng = np.random.default_rng(20261012)
    k = table()
    p = k[k["pop"]]
    days = pd.date_range(START, END)
    per = p.groupby("day").size().reindex(days, fill_value=0)
    imp = per[per.index.isin(IMPACT)].to_numpy(float)
    oth = per[~per.index.isin(IMPACT)].to_numpy(float)
    ratio = imp.mean() / oth.mean()
    bs = [rng.choice(imp, len(imp)).mean() / max(rng.choice(oth, len(oth)).mean(), 1e-9) for _ in range(2000)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    n_imp = int(p.impact.sum())
    va = ("DIRECTION ONLY" if n_imp < 30 else
          "SUPPORTED" if ratio >= 1.5 and lo > 1 else "OPPOSITE" if hi < 1 else "NOT DETERMINABLE")
    print(f"[F2-a] new devices/day: impact {imp.mean():.2f} ({len(imp)} days) vs other {oth.mean():.2f} ({len(oth)} days) · "
          f"ratio {ratio:.2f} (95% CI {lo:.2f}~{hi:.2f}) → {va}")

    a = p[p.impact].entered.to_numpy(float)
    b = p[~p.impact].entered.to_numpy(float)
    d = a.mean() - b.mean()
    bs = [rng.choice(a, len(a)).mean() - rng.choice(b, len(b)).mean() for _ in range(2000)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    vb = ("DIRECTION ONLY" if n_imp < 30 else
          "SUPPORTED" if d <= -.15 and hi < 0 else "OPPOSITE" if lo > 0 else "NOT DETERMINABLE")
    print(f"[F2-b] entry rate: impact {a.mean():.0%} (n={len(a)}) vs other {b.mean():.0%} (n={len(b)}) · "
          f"diff {d * 100:+.1f}%p (95% CI {lo * 100:+.1f}~{hi * 100:+.1f}) → {vb}")

    print("\n[secondary, not for verdict] new devices by impact day:",
          {d.strftime('%m-%d'): int(per[d]) for d in IMPACT})
    raw = k.groupby("day").size().reindex(days, fill_value=0)
    print("   raw (before localhost/foreign exclusion) impact vs other per day:",
          f"{raw[raw.index.isin(IMPACT)].mean():.2f} vs {raw[~raw.index.isin(IMPACT)].mean():.2f}")


if __name__ == "__main__":
    main()
