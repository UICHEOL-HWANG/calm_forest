"""First-5-min G2 · B1 — did people who stayed but got nothing in 5 min ever reach an acquisition place?

Pre-registered in first5min-hypotheses.md (B1). Target = entered new users, first entry 8/12~9/27,
no acquisition within 5 min of entry, entry session stay >= 2.1 min (i.e. not a B3 quick leaver).
Arrival within 5 min of entry: enter_farm (farm) · zone_enter zone=forest (forage forest) ·
fishing_cast (fishing spot) · sea_enter (sea) · enter_mine (mine).
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/first5min_b1_arrival.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_b1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from first5min_b3 import ENTRY_SQL  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

WINDOW = ("2026-08-12", "2026-09-27")
PLACE = {"enter_farm": "텃밭", "forest": "채집 숲", "fishing_cast": "낚시 자리", "sea_enter": "바다", "enter_mine": "광산"}

SQL = f"""
WITH c AS ({ENTRY_SQL}),
span AS (
  SELECT user_pseudo_id AS pid, (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid,
    (MAX(event_timestamp) - MIN(event_timestamp)) / 1e6 AS stay_sec
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND user_pseudo_id IN (SELECT entry_pid FROM c)
  GROUP BY 1, 2
),
arr AS (
  SELECT e.user_pseudo_id AS pid, e.event_timestamp AS ts,
    IF(e.event_name = 'zone_enter', (SELECT value.string_value FROM UNNEST(e.event_params) WHERE key = 'zone'), e.event_name) AS place
  FROM `{GA4}.events_*` e
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$')
    AND e.event_name IN ('enter_farm', 'zone_enter', 'fishing_cast', 'sea_enter', 'enter_mine')
    AND e.user_pseudo_id IN (SELECT entry_pid FROM c)
)
SELECT c.person, c.platform, c.d0, c.sec AS ttfa_sec, sp.stay_sec,
  ARRAY_AGG(DISTINCT a.place IGNORE NULLS) AS places
FROM c
LEFT JOIN span sp ON sp.pid = c.entry_pid AND sp.sid = c.entry_sid
LEFT JOIN arr a ON a.pid = c.entry_pid AND a.ts BETWEEN c.entry_ts AND c.entry_ts + 300 * 1000000
WHERE c.d0 BETWEEN '{WINDOW[0]}' AND '{WINDOW[1]}'
GROUP BY 1, 2, 3, 4, 5
"""


def main() -> None:
    d = read_sql(SQL)
    d["places"] = d["places"].map(lambda xs: [PLACE[x] for x in (xs if xs is not None else []) if x in PLACE])
    no5 = d[~(d["ttfa_sec"].notna() & (d["ttfa_sec"] <= 300))]
    t = no5[no5["stay_sec"] >= 126].copy()
    print(f"cohort {WINDOW[0]}~{WINDOW[1]}: {len(d)} · no acquisition in 5 min {len(no5)} · target (stayed ≥ 2.1 min) {len(t)}")
    t["arrived"] = t["places"].map(bool)
    share = t["arrived"].mean()
    rng = np.random.default_rng(20261012)
    boots = [rng.choice(t["arrived"].to_numpy(float), len(t)).mean() for _ in range(2000)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    print(f"arrived at ≥1 acquisition place within 5 min: {int(t.arrived.sum())}/{len(t)} = {share:.0%}  95% CI [{lo:.0%}, {hi:.0%}]")
    verdict = "DIRECTION ONLY (n < 30) — " if len(t) < 30 else ""
    verdict += "SUPPORTED (majority never reached a place)" if share < .5 else "REJECTED (majority reached a place but got nothing)" if share > .5 else "TIE"
    print(f"verdict (pre-registered): {verdict}")
    counts = pd.Series([p for ps in t["places"] for p in ps]).value_counts()
    print("  places reached (people, multiple allowed): " + " · ".join(f"{k} {v}" for k, v in counts.items()))
    for plat in ("web", "toss"):
        s = t[t.platform == plat]
        print(f"  [{plat}] n={len(s)} arrived {s.arrived.mean():.0%}" if len(s) else f"  [{plat}] n=0")

    report.setup()
    order = ["텃밭", "낚시 자리", "채집 숲", "바다", "광산"]
    vals = [counts.get(k, 0) / len(t) * 100 for k in order]
    fig, ax = report.new("2분 넘게 머물고도 5분 안에 못 얻은 사람이 간 곳", len(t),
                         sub=f"첫 진입 8/12~9/27 · 한 곳이라도 도착 {share:.0%} (95% CI {lo:.0%}~{hi:.0%}) · 한 사람이 여러 곳 가능",
                         ylab="도착한 비율 (%)")
    bars = ax.bar(order, vals, color=report.PALETTE[2], width=0.55)
    for b, k, v in zip(bars, order, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + 1.5, f"{v:.0f}% ({int(counts.get(k, 0))}명)", ha="center", fontsize=11)
    ax.set_ylim(0, 100)
    print(report.check(report.save(fig, ax, "first5min_b1_arrival")))


if __name__ == "__main__":
    main()
