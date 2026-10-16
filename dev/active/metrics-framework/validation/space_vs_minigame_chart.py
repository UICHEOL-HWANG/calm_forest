"""Chart for space_vs_minigame: day-0 return rate, did vs did-not, among heavy day-0 players.
Reads ml/reports/space_vs_minigame_devices.parquet (run space_vs_minigame.py first).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/space_vs_minigame_chart.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(ROOT / "ml"))
from calm_ml import report  # noqa: E402
from first5min_segments import wilson  # noqa: E402
from space_vs_minigame import LABEL  # noqa: E402

ORDER = ["house", "decor", "collect", "quest", "farm", "minigame"]


def main() -> None:
    d = pd.read_parquet(ROOT / "ml" / "reports" / "space_vs_minigame_devices.parquet")
    med = d.d0_actions.median()
    g = d[d.d0_actions >= med]
    report.setup()
    fig, ax = report.new("첫날 많이 논 사람 중 집을 지은 사람의 재방문이 가장 높고, 미니게임은 차이가 없다", len(g),
                         sub=f"첫날 행동 {med:.0f}회 이상 · 7/27~10/8 첫 방문 · 페르소나·개발자·베타 제외 · 세로선 = 95% 구간",
                         ylab="7일 안 재방문율 (%)", figsize=(9, 4.8))
    x = np.arange(len(ORDER))
    w = 0.38
    for i, (flag, color, name) in enumerate(((True, report.PALETTE[2], "첫날 했다"), (False, report.MUTED, "첫날 안 했다"))):
        ps, los, his, ns = [], [], [], []
        for k in ORDER:
            s = g[(g[f"d0_{k}"] > 0) == flag]
            kk, n = int(s.returned.sum()), len(s)
            lo, hi = wilson(kk, n)
            ps.append(kk / n * 100); los.append(lo * 100); his.append(hi * 100); ns.append((kk, n))
        pos = x + (i - 0.5) * w
        ax.bar(pos, ps, w, color=color if flag else report.tint(color, 0.55), label=name)
        ax.errorbar(pos, ps, yerr=[np.array(ps) - np.array(los), np.array(his) - np.array(ps)],
                    fmt="none", ecolor=report.INK, lw=1, capsize=3)
        for p_, v, (kk, n) in zip(pos, ps, ns):
            ax.text(p_, -7, f"{kk}/{n}", ha="center", fontsize=8, color=report.MUTED)
    base = g.returned.mean() * 100
    ax.axhline(base, color=report.MUTED, lw=1, ls="--")
    ax.text(len(ORDER) - 0.5, base + 1.5, f"전체 {base:.0f}%", ha="right", fontsize=9, color=report.MUTED)
    ax.set_xticks(x, [LABEL[k] for k in ORDER])
    ax.set_ylim(-10, 75)
    ax.set_yticks(range(0, 80, 10), [f"{v}%" for v in range(0, 80, 10)])
    ax.legend(frameon=False, loc="upper right")
    path = report.save(fig, ax, "space_vs_minigame_d0_heavy", zero_base=False)
    print(report.check(path))
    print(path)


if __name__ == "__main__":
    main()
