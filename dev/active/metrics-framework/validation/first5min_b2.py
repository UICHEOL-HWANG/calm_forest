"""First-5-min G2 · B2 — talk/quest-first vs produce-first, 5-minute first acquisition.

Pre-registered in first5min-hypotheses.md (B2). Cohort = entered new users, first entry 8/12~9/27
(window narrowed in G1: talk 8/1 · quest_offered 8/6 · zone_enter 8/12). Within the entry session,
the first TALK or PRODUCE event decides the group; TALK and PRODUCE at the same timestamp = "tie"
(GA4 batches share one timestamp). People with neither in the first session are counted and excluded.
Outcome = first acquisition within 5 min of entry. Person-level bootstrap 2,000 for the difference.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/first5min_b2_first_action.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_b2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from first5min_b3 import ENTRY_SQL  # noqa: E402  (same cohort + entry session)
from first5min_g1 import B2_PRODUCE, B2_TALK  # noqa: E402  (same event lists as G1)
from hierarchy_baseline import GA4, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

WINDOW = ("2026-08-12", "2026-09-27")
_ev = ", ".join(f"'{e}'" for e in B2_TALK + B2_PRODUCE)

SQL = f"""
WITH c AS ({ENTRY_SQL}),
first_act AS (
  SELECT e.user_pseudo_id AS pid,
    (SELECT value.int_value FROM UNNEST(e.event_params) WHERE key = 'ga_session_id') AS sid,
    e.event_name, e.event_timestamp AS ts
  FROM `{GA4}.events_*` e
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND e.event_name IN ({_ev})
    AND e.user_pseudo_id IN (SELECT entry_pid FROM c)
)
SELECT c.person, c.platform, c.d0, c.sec AS ttfa_sec,
  ARRAY_AGG(STRUCT(f.ts, f.event_name) ORDER BY f.ts) AS acts
FROM c LEFT JOIN first_act f ON f.pid = c.entry_pid AND f.sid = c.entry_sid
WHERE c.d0 BETWEEN '{WINDOW[0]}' AND '{WINDOW[1]}'
GROUP BY 1, 2, 3, 4
"""


def classify(acts) -> str:
    acts = [a for a in (acts if acts is not None else []) if a is not None and a.get("event_name")]
    if not acts:
        return "none"
    t0 = min(a["ts"] for a in acts)
    first = {a["event_name"] for a in acts if a["ts"] == t0}
    talk, prod = bool(first & set(B2_TALK)), bool(first & set(B2_PRODUCE))
    return "tie" if talk and prod else "talk" if talk else "produce"


def main() -> None:
    d = read_sql(SQL)
    d["group"] = d["acts"].map(classify)
    d["acq5"] = d["ttfa_sec"].notna() & (d["ttfa_sec"] <= 300)
    print(f"cohort first entry {WINDOW[0]}~{WINDOW[1]}: {len(d)} · groups: " +
          " · ".join(f"{k} {v}" for k, v in d["group"].value_counts().items()))
    g = d.groupby("group")["acq5"].agg(n="size", acq5="sum", rate="mean")
    print(g.to_string())
    t = d.loc[d.group == "talk", "acq5"].to_numpy(float)
    p = d.loc[d.group == "produce", "acq5"].to_numpy(float)
    diff = p.mean() - t.mean()
    rng = np.random.default_rng(20261012)
    boots = [rng.choice(p, len(p)).mean() - rng.choice(t, len(t)).mean() for _ in range(2000)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    print(f"produce − talk = {diff * 100:+.1f}%p  95% CI [{lo * 100:+.1f}, {hi * 100:+.1f}]  (n talk {len(t)}, produce {len(p)})")
    if min(len(t), len(p)) < 30:
        verdict = "DIRECTION ONLY (a group has n < 30)"
    elif lo > 0 and diff >= .20:
        verdict = "SUPPORTED"
    elif hi < 0:
        verdict = "OPPOSITE (talk/quest-first higher)"
    elif lo > 0:
        verdict = "CI excludes 0 but difference < 20%p — not supported by the pre-registered size"
    else:
        verdict = "NOT DETERMINABLE with this sample"
    print(f"verdict (pre-registered): {verdict}")
    for plat in ("web", "toss"):
        sub = d[(d.platform == plat) & d.group.isin(["talk", "produce"])].groupby("group")["acq5"].agg(["size", "mean"])
        print(f"  [{plat}] " + " · ".join(f"{k} n={int(r['size'])} {r['mean']:.0%}" for k, r in sub.iterrows()))

    report.setup()
    order = [k for k in ("talk", "produce", "tie") if k in g.index]
    label = {"talk": "대화·의뢰 먼저", "produce": "생산 먼저", "tie": "동시"}
    vals = [g.loc[k, "rate"] * 100 for k in order]
    fig, ax = report.new("첫 행동별 5분 안 첫 획득 비율", int(g.loc[order, "n"].sum()),
                         sub=f"첫 진입 8/12~9/27 · 첫 세션에서 처음 한 행동 기준 · 생산 - 대화 = {diff * 100:+.0f}%p (95% CI {lo * 100:+.0f}~{hi * 100:+.0f})",
                         ylab="5분 안 첫 획득 (%)")
    colors = {"talk": report.PALETTE[0], "produce": report.PALETTE[2], "tie": report.RAMP[1]}
    bars = ax.bar([label[k] for k in order], vals, color=[colors[k] for k in order], width=0.55)
    for b, k, v in zip(bars, order, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + 1.5, f"{v:.0f}%  ({int(g.loc[k, 'acq5'])}/{int(g.loc[k, 'n'])}명)", ha="center", fontsize=11)
    ax.set_ylim(0, 100)
    print(report.check(report.save(fig, ax, "first5min_b2_first_action")))


if __name__ == "__main__":
    main()
