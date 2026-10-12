"""First-5-min G2 · B3 — did non-acquirers leave before acquisition was even possible?

Pre-registered in first5min-hypotheses.md (B3). Cohort = entered new users 7/27~9/27 (same rules as
time_to_first_acquisition). Non-acquirer = no acquisition event within 7 days of entry.
First session = the GA4 session (user_pseudo_id, ga_session_id) of the entry event;
stay = last event − first event of that session (wall clock). Baseline = acquirers' median
entry→first acquisition (2.1 min).
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/first5min_b3_first_session.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_b3.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from time_to_first_acquisition import SQL as TTFA_SQL  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

BASELINE_MIN, STUCK_MIN = 2.1, 5.0

# entry session per person: reuse the TTFA cohort, then fetch the entry event's own session span
ENTRY_SQL = TTFA_SQL.replace(
    "SELECT entry.person, plat.platform,",
    "SELECT entry.person, plat.platform, entry.e.ts AS entry_ts, entry.e.sid AS entry_sid,",
).replace(
    "ARRAY_AGG(STRUCT(ts, sid) ORDER BY ts LIMIT 1)[OFFSET(0)] AS e",
    "ARRAY_AGG(STRUCT(ts, sid, user_pseudo_id AS pid) ORDER BY ts LIMIT 1)[OFFSET(0)] AS e",
).replace(
    "SELECT entry.person, plat.platform, entry.e.ts AS entry_ts, entry.e.sid AS entry_sid,",
    "SELECT entry.person, plat.platform, entry.e.ts AS entry_ts, entry.e.sid AS entry_sid, entry.e.pid AS entry_pid,",
)
assert ENTRY_SQL != TTFA_SQL and "entry_pid" in ENTRY_SQL

SESSION_SQL = f"""
WITH c AS ({ENTRY_SQL}),
s AS (
  SELECT user_pseudo_id AS pid,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid,
    MIN(event_timestamp) AS s0, MAX(event_timestamp) AS s1, COUNT(*) AS n_events
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$')
    AND user_pseudo_id IN (SELECT entry_pid FROM c)
  GROUP BY 1, 2
)
SELECT c.person, c.platform, c.sec AS ttfa_sec, (s.s1 - s.s0) / 1e6 AS stay_sec, s.n_events
FROM c LEFT JOIN s ON s.pid = c.entry_pid AND s.sid = c.entry_sid
"""


def main() -> None:
    d = read_sql(SESSION_SQL).sort_values("person").reset_index(drop=True)   # reproducible bootstrap
    acq = d[d["ttfa_sec"].notna()]
    non = d[d["ttfa_sec"].isna()].copy()
    print(f"cohort {len(d)} · acquired≤7d {len(acq)} · non-acquirers {len(non)} · "
          f"acquirers' median entry→first acquisition {acq['ttfa_sec'].median() / 60:.1f} min")
    non["stay_min"] = non["stay_sec"] / 60
    missing = int(non["stay_min"].isna().sum())
    m = non["stay_min"].dropna()
    short = (m < BASELINE_MIN).mean()
    mid = ((m >= BASELINE_MIN) & (m < STUCK_MIN)).mean()
    long_ = (m >= STUCK_MIN).mean()
    print(f"non-acquirers' first-session stay (n={len(m)}, session not found {missing}): "
          f"median {m.median():.1f} min · IQR {m.quantile(.25):.1f}~{m.quantile(.75):.1f} min")
    print(f"  < {BASELINE_MIN} min {short:.0%} · {BASELINE_MIN}~{STUCK_MIN} min {mid:.0%} · ≥ {STUCK_MIN} min {long_:.0%}")
    rng = np.random.default_rng(20261012)
    boots = [(rng.choice(m.to_numpy(), len(m)) < BASELINE_MIN).mean() for _ in range(2000)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    print(f"  share < {BASELINE_MIN} min 95% CI [{lo:.0%}, {hi:.0%}]")
    verdict = "SUPPORTED (left before acquisition was possible)" if short > .5 else \
              "REJECTED (stuck inside)" if long_ > .5 else "MIXED"
    print(f"verdict (pre-registered): {verdict}")
    for p in ("web", "toss"):
        mp = non.loc[non["platform"] == p, "stay_min"].dropna()
        print(f"  [{p}] n={len(mp)} · < {BASELINE_MIN} min {(mp < BASELINE_MIN).mean():.0%} · ≥ {STUCK_MIN} min {(mp >= STUCK_MIN).mean():.0%}")
    ma = acq["stay_sec"].dropna() / 60
    print(f"(reference) acquirers' first-session stay median {ma.median():.1f} min")

    report.setup()
    buckets = [f"{BASELINE_MIN}분 안", f"{BASELINE_MIN}~{STUCK_MIN:.0f}분", f"{STUCK_MIN:.0f}분 이상"]
    vals = [short * 100, mid * 100, long_ * 100]
    fig, ax = report.new("획득 없이 떠난 신규의 첫 세션 체류 시간", len(m),
                         sub=f"7/27~9/27 진입 · 첫 세션 첫 이벤트→마지막 이벤트 · 기준선 = 획득자의 첫 획득까지 중앙값 {BASELINE_MIN}분",
                         ylab="비율 (%)")
    bars = ax.bar(buckets, vals, color=[report.PALETTE[0], report.RAMP[1], report.PALETTE[1]], width=0.55)
    for b, v, k in zip(bars, vals, [short, mid, long_]):
        ax.text(b.get_x() + b.get_width() / 2, v + 1.5, f"{v:.0f}% ({round(k * len(m))}명)", ha="center", fontsize=11)
    ax.axhline(50, color=report.MUTED, lw=1, ls="--")
    ax.text(2.3, 52, "과반 50%", color=report.MUTED, fontsize=9, ha="right")
    ax.set_ylim(0, 100)
    path = report.save(fig, ax, "first5min_b3_first_session")
    print(report.check(path))


if __name__ == "__main__":
    main()
