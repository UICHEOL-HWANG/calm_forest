"""B4 G1 — data reliability for tutorial skip vs coach (pre-registration: tutorial-skip-prereg.md).

Builds the person table ONCE (first-5-min entrant cohort) with first-session tutorial flags.
Does NOT compute first acquisition by group (that is G2). Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/tutorial_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from first5min_b3 import ENTRY_SQL  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402

N_STEPS = 17   # TUT_STEPS in index.html (move … decor); step 8 = harvest (an acquisition action)

SQL = f"""
WITH c AS ({ENTRY_SQL}),
t AS (
  SELECT user_pseudo_id AS pid, event_name, event_timestamp AS ts, PARSE_DATE('%Y%m%d', event_date) AS d,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid,
    (SELECT COALESCE(value.string_value, CAST(value.int_value AS STRING)) FROM UNNEST(event_params) WHERE key = 'at') AS skip_at,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'step') AS step
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$')
    AND event_name IN ('tutorial_skip', 'tutorial_start', 'tutorial_step', 'tutorial_complete')
)
SELECT c.person, c.sec,
  LOGICAL_OR(t.event_name = 'tutorial_skip' AND t.skip_at = 'welcome') AS skip_welcome,
  LOGICAL_OR(t.event_name = 'tutorial_start') AS coach,
  LOGICAL_OR(t.event_name = 'tutorial_complete') AS completed,
  MAX(IF(t.event_name = 'tutorial_step', t.step, NULL)) AS max_step
FROM c LEFT JOIN t ON t.pid = c.entry_pid AND t.sid = c.entry_sid
GROUP BY 1, 2
"""


def main() -> None:
    p = read_sql(SQL).sort_values("person").reset_index(drop=True)
    for c in ("skip_welcome", "coach", "completed"):
        p[c] = p[c].fillna(False).astype(bool)
    print(f"[1] cohort n = {len(p)} (first-5-min entrant cohort, expected 203)")
    grp = pd.Series("none", index=p.index)
    grp[p.skip_welcome & ~p.coach] = "skip"
    grp[p.coach] = "coach"
    print("[2] first-session groups (cell sizes only):", grp.value_counts().to_dict(),
          f"· skipped AND started coach = {int((p.skip_welcome & p.coach).sum())} (counted as coach)")
    co = p[p.coach]
    print(f"[3] coach starters n={len(co)} · max step reached distribution:",
          co.max_step.fillna(0).astype(int).value_counts().sort_index().to_dict())
    print(f"    reached step ≥8 (harvest step done) = {int((co.max_step >= 8).sum())}"
          f" · completed event = {int(co.completed.sum())} · reached final step {N_STEPS} = {int((co.max_step >= N_STEPS).sum())}")
    print(f"    completed without step {N_STEPS} logged = {int((co.completed & (co.max_step.fillna(0) < N_STEPS)).sum())}"
          f" · step {N_STEPS} logged without completed = {int(((co.max_step >= N_STEPS) & ~co.completed).sum())}")


if __name__ == "__main__":
    main()
