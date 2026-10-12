"""Web entry G2 — W1~W4 verdicts (pre-registration: web-entry-hypotheses.md, W2 bound rule fixed 2026-10-12).

Reuses the G1 device table (web_entry_g1.build) so samples match exactly.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/web_entry_g2.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/web_entry_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from web_entry_g1 import build  # noqa: E402
from calm_ml import report  # noqa: E402

B, SEED = 2000, 20261012
IN_APP = ("Safari (in-app)", "Android Webview")


def wilson(k: int, n: int, z: float = 1.96) -> tuple[float, float]:
    p = k / n
    c = (p + z * z / (2 * n)) / (1 + z * z / n)
    h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return c - h, c + h


def boot_stat(x: np.ndarray, f, rng: np.random.Generator) -> tuple[float, float]:
    bs = [f(rng.choice(x, len(x))) for _ in range(B)]
    return tuple(np.percentile(bs, [2.5, 97.5]))


def boot_diff(a: np.ndarray, b: np.ndarray, rng: np.random.Generator) -> tuple[float, float]:
    bs = [rng.choice(a, len(a)).mean() - rng.choice(b, len(b)).mean() for _ in range(B)]
    return tuple(np.percentile(bs, [2.5, 97.5]))


def w2_verdict(med: float, hi: float) -> str:
    if med <= 10 and hi <= 20:
        return "SUPPORTED"
    if med > 30:
        return "OPPOSITE"
    return "NOT DETERMINABLE"


def diff_verdict(diff: float, lo: float, hi: float, n_min: int) -> str:
    if n_min < 30:
        return "DIRECTION ONLY (a cell has n < 30)"
    if diff <= -.15 and hi < 0:
        return "SUPPORTED"
    if lo > 0:
        return "OPPOSITE"
    return "NOT DETERMINABLE"


def main() -> None:
    rng = np.random.default_rng(SEED)
    d = build()
    k = d[d.kept].copy()
    print(f"kept web devices n={len(k)} · entered {k.entered.sum()} ({k.entered.mean():.0%})")

    # W1 — among non-entrants, share who reached the no_session login screen
    ne = k[~k.entered]
    reach = int(ne.screen.sum())
    p1 = reach / len(ne)
    lo1, hi1 = wilson(reach, len(ne))
    v1 = "SUPPORTED" if p1 >= .60 and lo1 > .50 else ("OPPOSITE" if hi1 < .50 else "NOT DETERMINABLE")
    print(f"\n[W1] non-entrants n={len(ne)} · reached screen {reach} ({p1:.0%}, Wilson 95% CI {lo1:.0%}~{hi1:.0%}) → {v1}")

    # W2 — dwell on screen for non-entrants who reached it (lower: no-later-event = 0s; upper: drop them)
    s = ne[ne.screen].copy()
    s["dwell"] = (s.last_after_scr - s.scr_ts) / 1e6
    lower = s.dwell.where(s.n_after_scr > 0, 0).to_numpy(float)
    upper = s.loc[s.n_after_scr > 0, "dwell"].to_numpy(float)
    res = {}
    for name, x in (("lower (0s fill)", lower), ("upper (measurable only)", upper)):
        med = float(np.median(x))
        lo, hi = boot_stat(x, np.median, rng)
        res[name] = (len(x), med, lo, hi, w2_verdict(med, hi))
        print(f"[W2] {name}: n={len(x)} · median {med:.1f}s (95% CI {lo:.1f}~{hi:.1f}) · "
              f"≤10s {np.mean(x <= 10):.0%} · >60s {np.mean(x > 60):.0%} → {res[name][4]}")
    vs = {r[4] for r in res.values()}
    v2 = vs.pop() if len(vs) == 1 else "NOT DETERMINABLE (bounds disagree)"
    print(f"[W2] combined → {v2}")

    # W3 — in-app vs regular browser entry rate
    br = k.br.fillna("")
    a3 = k[br.isin(IN_APP)].entered.to_numpy(float)
    b3 = k[~br.isin(IN_APP) & (br != "")].entered.to_numpy(float)
    d3 = a3.mean() - b3.mean()
    lo3, hi3 = boot_diff(a3, b3, rng)
    v3 = diff_verdict(d3, lo3, hi3, min(len(a3), len(b3)))
    print(f"\n[W3] in-app {a3.mean():.0%} (n={len(a3)}) vs regular {b3.mean():.0%} (n={len(b3)}) · "
          f"diff {d3 * 100:+.1f}%p (95% CI {lo3 * 100:+.1f}~{hi3 * 100:+.1f}) → {v3}")

    # W4 — mobile vs desktop entry rate (tablet excluded)
    a4 = k[k.cat == "mobile"].entered.to_numpy(float)
    b4 = k[k.cat == "desktop"].entered.to_numpy(float)
    d4 = a4.mean() - b4.mean()
    lo4, hi4 = boot_diff(a4, b4, rng)
    v4 = diff_verdict(d4, lo4, hi4, min(len(a4), len(b4)))
    print(f"[W4] mobile {a4.mean():.0%} (n={len(a4)}) vs desktop {b4.mean():.0%} (n={len(b4)}) · "
          f"diff {d4 * 100:+.1f}%p (95% CI {lo4 * 100:+.1f}~{hi4 * 100:+.1f}) → {v4}")

    # descriptive (not for verdict): funnel split by device
    print("\n[desc] funnel by device (visit → screen → entered):")
    for c in ("desktop", "mobile"):
        q = k[k.cat == c]
        print(f"   {c}: {len(q)} → screen {int(q.screen.sum())} → entered {int(q.entered.sum())} · "
              f"non-entrants without screen {int((~q.entered & ~q.screen).sum())}")

    chart(k)


def chart(k: pd.DataFrame) -> None:
    report.setup()
    fig, ax = report.new("웹 신규는 어디서 멈췄나 — 첫 방문 → 로그인 화면 → 진입", len(k),
                         sub="웹 기기 첫 방문 9/4~10/11 · 토스·앱·페르소나·개발자 제외 · 막대 = 단계 도달 기기 수",
                         ylab="기기 수", figsize=(9, 4.8))
    labels = ["첫 방문", "로그인 화면", "진입"]
    vals = [len(k), int(k.screen.sum()), int(k.entered.sum())]
    bars = ax.bar(labels, vals, color=[report.PALETTE[0], report.PALETTE[1], report.PALETTE[2]], width=0.55)
    for bar, v in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width() / 2, v + 2, f"{v}대 ({v / len(k):.0%})", ha="center", fontsize=11)
    ax.set_ylim(0, len(k) * 1.15)
    print(report.check(report.save(fig, ax, "web_entry_g2")))


if __name__ == "__main__":
    main()
