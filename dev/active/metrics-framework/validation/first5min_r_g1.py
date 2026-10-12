"""R1~R5 — G1 data reliability. Counts groups and checks data consistency; computes NO revisit outcome.
Hypotheses: first5min-hypotheses.md (R1~R5). Cohort = entered new users (time_to_first_acquisition rules),
no host filter (user decision 2026-10-12). Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_r_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from first5min_b3 import ENTRY_SQL  # noqa: E402
from hierarchy_baseline import CATEGORY, GA4, read_sql  # noqa: E402
from nsm_validate import RESULT_ACTIONS  # noqa: E402

_ACQ = ", ".join(f"'{e}'" for e in RESULT_ACTIONS)
_CAT = " ".join(f"WHEN e.event_name IN ({', '.join(repr(x) for x in v)}) THEN '{k}'" for k, v in CATEGORY.items())

SQL = f"""
WITH c AS ({ENTRY_SQL}),
pids AS (  -- every pseudo id that belongs to a cohort person (same key rule as the cohort)
  SELECT DISTINCT person, user_pseudo_id AS pid FROM (
    SELECT IF(a.acct IS NOT NULL, CONCAT('u:', a.acct), CONCAT('p:', ev.user_pseudo_id)) AS person, ev.user_pseudo_id
    FROM `{GA4}.events_*` ev
    LEFT JOIN (
      SELECT user_pseudo_id, ANY_VALUE(user_id) AS acct FROM `{GA4}.events_*`
      WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$')
        AND user_id IN (SELECT DISTINCT user_id FROM `calm-forest.calm_forest_raw.session_logs` WHERE is_guest = FALSE AND user_id IS NOT NULL)
      GROUP BY 1 HAVING COUNT(DISTINCT user_id) = 1) a USING (user_pseudo_id)
    WHERE REGEXP_CONTAINS(ev._TABLE_SUFFIX, r'^[0-9]{{8}}$')
  ) WHERE person IN (SELECT person FROM c)
),
e AS (
  SELECT p.person, e.event_name, e.event_timestamp AS ts, e.user_pseudo_id AS pid,
    (SELECT value.int_value FROM UNNEST(e.event_params) WHERE key = 'ga_session_id') AS sid,
    DATE(TIMESTAMP_MICROS(e.event_timestamp), 'Asia/Seoul') AS d,
    (SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(e.event_params) WHERE key = 'amount') AS amount,
    CASE {_CAT} END AS cat
  FROM `{GA4}.events_*` e JOIN pids p ON p.pid = e.user_pseudo_id
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$')
)
SELECT c.person, c.platform, c.d0, c.sec AS ttfa_sec,
  (SELECT (MAX(ts) - MIN(ts)) / 1e6 FROM e WHERE e.person = c.person AND e.pid = c.entry_pid AND e.sid = c.entry_sid) AS stay_sec,
  (SELECT MAX(ts) FROM e WHERE e.person = c.person AND e.pid = c.entry_pid AND e.sid = c.entry_sid) AS sess_end,
  (SELECT MAX(ts) FROM e WHERE e.person = c.person AND e.pid = c.entry_pid AND e.sid = c.entry_sid AND e.event_name IN ({_ACQ})) AS last_acq_in_sess,
  (SELECT COUNTIF(event_name = 'plant_seed') FROM e WHERE e.person = c.person AND e.d = c.d0) AS plant_d0,
  (SELECT COUNTIF(event_name = 'harvest_crop') FROM e WHERE e.person = c.person AND e.d = c.d0) AS harvest_d0,
  (SELECT COUNTIF(event_name IN ('npc_talk','quest_accept','plant_seed','water_crop','fishing_cast','chop_tree','enter_farm','zone_enter','sea_enter','dig_plot','first_chop','quest_offered')) FROM e WHERE e.person = c.person AND e.d = c.d0) AS play_d0,
  (SELECT COUNT(DISTINCT FORMAT('%s|%d', pid, sid)) FROM e WHERE e.person = c.person AND e.d = c.d0 AND sid IS NOT NULL) AS sessions_d0,
  (SELECT COUNT(DISTINCT cat) FROM e WHERE e.person = c.person AND cat IS NOT NULL AND DATE_DIFF(e.d, c.d0, DAY) BETWEEN 0 AND 6) AS cats_w1,
  (SELECT COUNTIF(amount < 0) FROM e WHERE e.person = c.person AND e.event_name = 'econ_tx' AND DATE_DIFF(e.d, c.d0, DAY) BETWEEN 0 AND 6) AS spend_w1
FROM c
"""


def main() -> None:
    d = read_sql(SQL).sort_values("person").reset_index(drop=True)
    d["d0"] = pd.to_datetime(d["d0"]).dt.date
    print(f"cohort {len(d)} (entered 7/27~9/27, no host filter)")
    # R1
    r1 = d[d.ttfa_sec.notna() & d.last_acq_in_sess.notna()]
    a = (r1.sess_end - r1.last_acq_in_sess) <= 120 * 1e6
    print(f"[R1] first-session acquirers {len(r1)} · A (acq in last 2 min) {int(a.sum())} · B {int((~a).sum())}")
    # R2
    r2 = d[d.play_d0 > 0]
    left = r2.plant_d0 > r2.harvest_d0
    odd = int((d.harvest_d0 > d.plant_d0).sum())
    print(f"[R2] day-0 players {len(r2)} · A (planted > harvested, crop left growing) {int(left.sum())} · B {int((~left).sum())} · "
          f"consistency: people with harvest > plant on day 0 = {odd} (should be ~0 — no pre-planted crops)")
    # R3
    r3 = d[d.cats_w1 > 0]
    print(f"[R3] week-1 acquirers {len(r3)} · A (≥2 categories) {int((r3.cats_w1 >= 2).sum())} · B (1) {int((r3.cats_w1 == 1).sum())}")
    # R4
    r4 = d[d.d0 >= pd.Timestamp('2026-09-05').date()]
    print(f"[R4] entered 9/5~9/27 {len(r4)} · A (spent coins week 1) {int((r4.spend_w1 > 0).sum())} · B {int((r4.spend_w1 == 0).sum())}")
    # R5
    print(f"[R5] cohort {len(d)} · A (≥2 sessions on entry day) {int((d.sessions_d0 >= 2).sum())} · B (1) {int((d.sessions_d0 == 1).sum())} · "
          f"0 sessions (missing sid) {int((d.sessions_d0 == 0).sum())}")


if __name__ == "__main__":
    main()
