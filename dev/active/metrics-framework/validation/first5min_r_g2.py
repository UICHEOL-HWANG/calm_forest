"""R1~R5 — G2 verdicts (pre-registered in first5min-hypotheses.md). Observational, not causal.
Outcome windows (days after entry, KST, any visit = a day the person entered the game):
R1 days 1~7 · R2 day 1 · R3 days 8~21 · R4 days 8~21 · R5 days 7~13. Windows needing day 21 keep first
entry <= 9/20 (data to 10/11). Verdict: A − B ≥ 10%p and 95% CI (person bootstrap 2,000) > 0 → supported;
CI contains 0 → not determinable; B higher with CI < 0 → opposite; any group n < 30 → direction only.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/first5min_r_summary.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_r_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from first5min_r_g1 import SQL as R_SQL  # noqa: E402  (same groups as G1)
from ltv_engagement import ga4_person_days  # noqa: E402
from hierarchy_baseline import read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

DATA_END = pd.Timestamp("2026-10-11").date()
OBS21 = pd.Timestamp("2026-09-20").date()


def visited(days: pd.DataFrame, persons: pd.Series, lo: int, hi: int) -> pd.Series:
    w = days[days["person"].isin(persons) & days["k"].between(lo, hi) & days["entered"]]
    return persons.isin(set(w["person"]))


def judge(name: str, a: np.ndarray, b: np.ndarray, seed: int = 20261012) -> dict:
    rng = np.random.default_rng(seed)
    diff = a.mean() - b.mean()
    bs = [rng.choice(a, len(a)).mean() - rng.choice(b, len(b)).mean() for _ in range(2000)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    if min(len(a), len(b)) < 30:
        v = "방향만 (n<30)"
    elif lo > 0 and diff >= .10:
        v = "지지"
    elif hi < 0:
        v = "반대 방향"
    elif lo > 0:
        v = "CI>0 이나 10%p 미만"
    else:
        v = "판정 불가"
    print(f"[{name}] A {a.mean():.0%} (n={len(a)}) · B {b.mean():.0%} (n={len(b)}) · diff {diff * 100:+.1f}%p "
          f"95% CI [{lo * 100:+.1f}, {hi * 100:+.1f}] → {v}")
    return {"name": name, "a": a.mean(), "b": b.mean(), "na": len(a), "nb": len(b), "lo": lo, "hi": hi, "diff": diff, "v": v}


def main() -> None:
    d = read_sql(R_SQL).sort_values("person").reset_index(drop=True)
    d["d0"] = pd.to_datetime(d["d0"]).dt.date
    days = ga4_person_days()
    days = days[(days["d"] <= DATA_END) & days["person"].isin(d["person"])].merge(d[["person", "d0"]], on="person")
    days["k"] = (pd.to_datetime(days["d"]) - pd.to_datetime(days["d0"])).dt.days
    out = []

    r1 = d[d.ttfa_sec.notna() & d.last_acq_in_sess.notna()].copy()
    r1["A"] = (r1.sess_end - r1.last_acq_in_sess) <= 120 * 1e6
    r1["y"] = visited(days, r1.person, 1, 7)
    out.append(judge("R1 첫 세션을 획득으로 끝냄 · 1~7일차 재방문", r1[r1.A].y.to_numpy(float), r1[~r1.A].y.to_numpy(float)))

    r2 = d[d.play_d0 > 0].copy()
    r2["A"] = r2.plant_d0 > r2.harvest_d0
    r2["y"] = visited(days, r2.person, 1, 1)
    out.append(judge("R2 자라는 작물 남김 · 다음 날 재방문", r2[r2.A].y.to_numpy(float), r2[~r2.A].y.to_numpy(float)))

    r3 = d[(d.cats_w1 > 0) & (d.d0 <= OBS21)].copy()
    r3["A"] = r3.cats_w1 >= 2
    r3["y"] = visited(days, r3.person, 8, 21)
    out.append(judge("R3 첫 주 2개 분야 이상 · 8~21일차 재방문", r3[r3.A].y.to_numpy(float), r3[~r3.A].y.to_numpy(float)))

    r4 = d[(d.d0 >= pd.Timestamp("2026-09-05").date()) & (d.d0 <= OBS21)].copy()
    r4["A"] = r4.spend_w1 > 0
    r4["y"] = visited(days, r4.person, 8, 21)
    out.append(judge("R4 첫 주 코인 사용 · 8~21일차 재방문", r4[r4.A].y.to_numpy(float), r4[~r4.A].y.to_numpy(float)))

    r5 = d.copy()
    r5["A"] = r5.sessions_d0 >= 2
    r5["y"] = visited(days, r5.person, 7, 13)
    out.append(judge("R5 첫날 세션 2개 이상 · 7~13일차 재방문", r5[r5.A].y.to_numpy(float), r5[~r5.A].y.to_numpy(float)))

    report.setup()
    labels = ["R1 첫 세션을\n획득으로 끝냄", "R2 자라는\n작물 남김", "R3 첫 주\n2개 분야 이상", "R4 첫 주\n코인 사용", "R5 첫날\n다시 들어옴"]
    fig, ax = report.new("다시 오게 만드는 것 — 해당하는 사람 vs 아닌 사람의 재방문", len(d),
                         sub="진입 신규 7/27~9/27(가설별 대상은 막대 위 n) · 막대 = 재방문 비율 · 지표 기간은 가설마다 다름(R1 1~7일·R2 다음 날·R3·R4 8~21일·R5 7~13일)",
                         ylab="재방문 비율 (%)", figsize=(10, 4.8))
    x = np.arange(len(out)); w = 0.36
    ba = ax.bar(x - w / 2, [o["a"] * 100 for o in out], w, color=report.PALETTE[2], label="해당함 (A)")
    bb = ax.bar(x + w / 2, [o["b"] * 100 for o in out], w, color=report.RAMP[0], label="해당 안 함 (B)")
    for bars, key, nk in ((ba, "a", "na"), (bb, "b", "nb")):
        for bar, o in zip(bars, out):
            ax.text(bar.get_x() + bar.get_width() / 2, o[key] * 100 + 1.5, f"{o[key] * 100:.0f}%\n(n={o[nk]})", ha="center", fontsize=8.5)
    for xi, o in zip(x, out):
        ax.text(xi, -11, o["v"], ha="center", fontsize=9, color=report.MUTED)
    ax.set_xticks(x, labels, fontsize=9)
    ax.set_ylim(0, max(max(o["a"], o["b"]) for o in out) * 100 * 1.35 + 5)
    ax.legend(loc="upper right", fontsize=9, frameon=False)
    print(report.check(report.save(fig, ax, "first5min_r_summary")))


if __name__ == "__main__":
    main()
