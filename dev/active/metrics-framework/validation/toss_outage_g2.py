"""H-N1 G2 — Toss mTLS outage difference-in-differences (pre-registration: toss-outage-did-prereg.md).

Sample = the G1 device table (toss_outage_g1.build), kept devices only. Outcome = entered the game
(any event with user_id, guest uid included) within 7 days of first_visit.
Δ = (toss outage − toss post) − (web outage − web post); bootstrap 2,000 resampling within each cell.
Secondary (not for the verdict): sensitivity with Toss devices that fired toss_connect; web stability.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/toss_outage_did.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/toss_outage_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from toss_outage_g1 import build  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

ENTRY_SQL = f"""
SELECT user_pseudo_id, MIN(IF(user_id IS NOT NULL, DATETIME(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul'), NULL)) AS first_uid
FROM `{GA4}.events_*` WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') GROUP BY 1
"""


def did(cells: dict[str, np.ndarray]) -> float:
    return (cells["toss_outage"].mean() - cells["toss_post"].mean()) - (cells["web_outage"].mean() - cells["web_post"].mean())


def boot(cells: dict[str, np.ndarray], n: int = 2000, seed: int = 20261012) -> np.ndarray:
    rng = np.random.default_rng(seed)
    return np.array([did({k: rng.choice(v, len(v)) for k, v in cells.items()}) for _ in range(n)])


def analyse(d: pd.DataFrame, label: str) -> dict:
    cells = {f"{p}_{q}": d[(d.plat == p) & (d.period == q)]["entered"].to_numpy(float)
             for p in ("toss", "web") for q in ("outage", "post")}
    est = did(cells)
    bs = boot(cells)
    lo, hi = np.percentile(bs, [2.5, 97.5])
    print(f"\n[{label}]")
    for k, v in cells.items():
        print(f"  {k:12s} n={len(v):3d}  entered {v.mean():.0%}")
    print(f"  toss change {cells['toss_outage'].mean() - cells['toss_post'].mean():+.1%} · web change {cells['web_outage'].mean() - cells['web_post'].mean():+.1%}")
    print(f"  Δ (DiD) = {est * 100:+.1f}%p  95% CI [{lo * 100:+.1f}, {hi * 100:+.1f}]")
    half = (hi - lo) / 2
    print(f"  approx. detectable effect at this n (CI half-width) ≈ ±{half * 100:.0f}%p")
    return {"cells": cells, "est": est, "lo": lo, "hi": hi}


def main() -> None:
    d = build()
    d = d[d["period"].isin(["outage", "post"]) & d["kept"]].copy()
    e = read_sql(ENTRY_SQL)
    e["first_uid"] = pd.to_datetime(e["first_uid"])
    d = d.merge(e, on="user_pseudo_id", how="left")
    d["entered"] = d["first_uid"].notna() & (d["first_uid"] <= d["fv"] + pd.Timedelta(days=7))
    d = d.sort_values("user_pseudo_id").reset_index(drop=True)
    main_res = analyse(d, "PRIMARY (pre-registered): all kept devices")
    if main_res["hi"] < 0:
        v = "SUPPORTED (auto-login loss lowered Toss entry)"
    elif main_res["lo"] > 0:
        v = "OPPOSITE (Toss entry rose during the outage relative to web)"
    else:
        v = "NOT DETERMINABLE with this sample"
    print(f"verdict (pre-registered): {v}")
    sens = d[(d.plat == "web") | d["tc"]]
    analyse(sens, "SENSITIVITY (not for verdict): Toss devices that fired toss_connect only")

    report.setup()
    c = main_res["cells"]
    fig, ax = report.new("토스 인증서 사고 중과 복구 후의 진입 전환율", len(d),
                         sub=f"첫 방문 9/5 14:13~9/13 18:30(사고 중) vs ~9/22 02:47(복구 후) · 이중차분 {main_res['est'] * 100:+.0f}%p (95% CI {main_res['lo'] * 100:+.0f}~{main_res['hi'] * 100:+.0f})",
                         ylab="7일 안 게임 진입 (%)")
    x = np.arange(2); w = 0.35
    for i, (q, lab, col) in enumerate((("outage", "사고 중", report.PALETTE[0]), ("post", "복구 후", report.PALETTE[1]))):
        vals = [c[f"toss_{q}"].mean() * 100, c[f"web_{q}"].mean() * 100]
        ns = [len(c[f"toss_{q}"]), len(c[f"web_{q}"])]
        bars = ax.bar(x + (i - 0.5) * w, vals, w, color=col, label=lab)
        for b, val, n in zip(bars, vals, ns):
            ax.text(b.get_x() + b.get_width() / 2, val + 1.5, f"{val:.0f}%\n(n={n})", ha="center", fontsize=9)
    ax.set_xticks(x, ["토스 신규", "웹 신규 (대조군)"])
    ax.set_ylim(0, 115)
    ax.legend(loc="upper right", frameon=False, fontsize=9)
    print(report.check(report.save(fig, ax, "toss_outage_did")))


if __name__ == "__main__":
    main()


def robustness_beta(cells: dict[str, np.ndarray], n: int = 20000, seed: int = 20261012) -> tuple[float, float, float]:
    """Not for the verdict. A 12/12 cell has zero bootstrap variance, which makes the bootstrap CI too narrow.
    Draw each cell's rate from its Jeffreys posterior Beta(k+0.5, n-k+0.5) and recompute the DiD."""
    rng = np.random.default_rng(seed)
    draws = {k: rng.beta(v.sum() + .5, len(v) - v.sum() + .5, n) for k, v in cells.items()}
    dd = (draws["toss_outage"] - draws["toss_post"]) - (draws["web_outage"] - draws["web_post"])
    lo, hi = np.percentile(dd, [2.5, 97.5])
    return float(np.median(dd)), float(lo), float(hi)


if __name__ == "__main__" and "--robust" in sys.argv:
    d = build()
    d = d[d["period"].isin(["outage", "post"]) & d["kept"]].copy()
    e = read_sql(ENTRY_SQL); e["first_uid"] = pd.to_datetime(e["first_uid"])
    d = d.merge(e, on="user_pseudo_id", how="left")
    d["entered"] = d["first_uid"].notna() & (d["first_uid"] <= d["fv"] + pd.Timedelta(days=7))
    for label, sub in (("primary", d), ("sensitivity (toss_connect only)", d[(d.plat == "web") | d["tc"]])):
        cells = {f"{p}_{q}": sub[(sub.plat == p) & (sub.period == q)]["entered"].to_numpy(float) for p in ("toss", "web") for q in ("outage", "post")}
        m, lo, hi = robustness_beta(cells)
        print(f"[robustness · Jeffreys Beta · {label}] Δ median {m * 100:+.1f}%p  95% interval [{lo * 100:+.1f}, {hi * 100:+.1f}]")
