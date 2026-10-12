"""B4 G2 — tutorial skip vs coach, first acquisition ≤ 5 min (pre-registration: tutorial-skip-prereg.md).

Reuses the G1 person table. Person bootstrap 2,000 (persons sorted). Prints aggregates only (PUBLIC repo).
Chart -> ml/reports/figs/tutorial_skip.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/tutorial_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from tutorial_g1 import SQL  # noqa: E402
from web_entry_g2 import wilson  # noqa: E402
from hierarchy_baseline import read_sql  # noqa: E402
from calm_ml import report  # noqa: E402


def main() -> None:
    rng = np.random.default_rng(20261012)
    p = read_sql(SQL).sort_values("person").reset_index(drop=True)
    for c in ("skip_welcome", "coach", "completed"):
        p[c] = p[c].fillna(False).astype(bool)
    p["grp"] = "none"
    p.loc[p.skip_welcome & ~p.coach, "grp"] = "skip"
    p.loc[p.coach, "grp"] = "coach"
    p["acq5"] = p.sec.notna() & (p.sec <= 300)
    p["acq7"] = p.sec.notna()

    s = p[p.grp == "skip"].acq5.to_numpy(float)
    c = p[p.grp == "coach"].acq5.to_numpy(float)
    diff = s.mean() - c.mean()
    bs = [rng.choice(s, len(s)).mean() - rng.choice(c, len(c)).mean() for _ in range(2000)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    if min(len(s), len(c)) < 30:
        v = "DIRECTION ONLY"
    elif diff <= -.15 and hi < 0:
        v = "SUPPORTED"
    elif lo > 0:
        v = "OPPOSITE"
    else:
        v = "NOT DETERMINABLE"
    print(f"[B4] 5-min first acquisition: skip {s.mean():.0%} (n={len(s)}) vs coach {c.mean():.0%} (n={len(c)}) · "
          f"diff {diff * 100:+.1f}%p (95% CI {lo * 100:+.1f}~{hi * 100:+.1f}) → {v}")

    co = p[p.grp == "coach"]
    k, n = int(co.completed.sum()), len(co)
    wl, wh = wilson(k, n)
    vb = "SUPPORTED" if k / n < .20 and wh < .30 else ("OPPOSITE" if wl > .50 else "NOT DETERMINABLE")
    print(f"[B4-b] coach completion {k}/{n} = {k / n:.0%} (Wilson {wl:.0%}~{wh:.0%}) → {vb}")

    print("\n[secondary, not for verdict]")
    for g in ("skip", "coach", "none"):
        q = p[p.grp == g]
        print(f"   {g:5}: n={len(q)} · ≤5min {q.acq5.mean():.0%} · ≤7d {q.acq7.mean():.0%} · median sec to first acq {q.sec.median():.0f}")
    reach8 = co.max_step >= 8
    print(f"   coach reached harvest step(≥8) {int(reach8.sum())}: ≤5min {co[reach8].acq5.mean():.0%} · "
          f"stopped before step 8 ({int((~reach8).sum())}): ≤5min {co[~reach8].acq5.mean():.0%}")
    print(f"   coach stop step (first-session max step, 0 = none logged): {co.max_step.fillna(0).astype(int).value_counts().sort_index().to_dict()}")

    report.setup()
    labels = [f"건너뜀\n(n={len(s)})", f"코치 시작\n(n={len(c)})"]
    vals = [s.mean() * 100, c.mean() * 100]
    fig, ax = report.new("튜토리얼 갈림길별 진입 5분 안 첫 획득", len(s) + len(c),
                         sub=f"첫 진입 7/27~9/27 · 첫 세션 기준 · 차이 {diff * 100:+.0f}%p (95% CI {lo * 100:+.0f}~{hi * 100:+.0f}) · 사람이 스스로 고른 갈림길 — 인과 아님",
                         ylab="5분 안 첫 획득 (%)")
    bars = ax.bar(labels, vals, color=[report.PALETTE[0], report.PALETTE[1]], width=.5)
    for b, val in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, val + 1.5, f"{val:.0f}%", ha="center", fontsize=11)
    ax.set_ylim(0, 100)
    print(report.check(report.save(fig, ax, "tutorial_skip")))


if __name__ == "__main__":
    main()
