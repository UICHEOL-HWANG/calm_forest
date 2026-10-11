"""Time to first acquisition (spec §5 L2 under activation) — GA4, from game launch.

Cohort: game-entered new users, first entry 2026-07-27 ~ 09-27 (7-day window observable by 10/4),
web + toss, persona + dev devices excluded, same person key as ltv_engagement.
Start = first event carrying a user_id (= game entry, guest uid included).
End   = first of the 16 acquisition events within 7 days of the start.
Clock = wall-clock (event_timestamp difference); the user may leave and come back in between,
so the same-session share is reported next to it.

Run: ml/.venv/bin/python dev/active/metrics-framework/validation/time_to_first_acquisition.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import CATEGORY, DEV_CLIENTS, PERSONA, RAW, GA4, read_sql  # noqa: E402
from nsm_validate import RESULT_ACTIONS  # noqa: E402

COHORT = ("2026-07-27", "2026-09-27")
_EV = ", ".join(f"'{e}'" for e in RESULT_ACTIONS)

SQL = f"""
WITH logged AS (
  SELECT DISTINCT user_id FROM `{RAW}.session_logs` WHERE is_guest = FALSE AND user_id IS NOT NULL
),
excluded AS (
  SELECT user_id FROM ({PERSONA})
  UNION DISTINCT
  SELECT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL
),
ev AS (
  SELECT user_pseudo_id, user_id, event_name, event_timestamp AS ts,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid,
    IFNULL((SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform'), 'web') AS platform
  FROM `{GA4}.events_*`
),
pseudo_out AS (SELECT DISTINCT user_pseudo_id FROM ev WHERE user_id IN (SELECT user_id FROM excluded)),
pseudo_acct AS (
  SELECT user_pseudo_id, ANY_VALUE(user_id) AS acct FROM ev
  WHERE user_id IN (SELECT user_id FROM logged) GROUP BY 1 HAVING COUNT(DISTINCT user_id) = 1
),
p AS (
  SELECT IF(a.acct IS NOT NULL, CONCAT('u:', a.acct), CONCAT('p:', ev.user_pseudo_id)) AS person, ev.*
  FROM ev LEFT JOIN pseudo_acct a USING (user_pseudo_id)
  WHERE ev.platform IN ('web', 'toss') AND ev.user_pseudo_id NOT IN (SELECT user_pseudo_id FROM pseudo_out)
),
entry AS (
  SELECT person, ARRAY_AGG(STRUCT(ts, sid) ORDER BY ts LIMIT 1)[OFFSET(0)] AS e
  FROM p WHERE user_id IS NOT NULL GROUP BY 1
),
plat AS (  -- the platform property is often missing on the very first events -> toss if ever tagged toss
  SELECT person, IF(LOGICAL_OR(platform = 'toss'), 'toss', 'web') AS platform FROM p GROUP BY 1
),
acq AS (
  SELECT p.person, ARRAY_AGG(STRUCT(p.ts, p.sid, p.event_name) ORDER BY p.ts LIMIT 1)[OFFSET(0)] AS a
  FROM p JOIN entry USING (person)
  WHERE p.event_name IN ({_EV}) AND p.ts BETWEEN entry.e.ts AND entry.e.ts + 7 * 86400 * 1000000
  GROUP BY 1
)
SELECT entry.person, plat.platform,
  DATE(TIMESTAMP_MICROS(entry.e.ts), 'Asia/Seoul') AS d0,
  (acq.a.ts - entry.e.ts) / 1e6 AS sec, acq.a.event_name AS first_event,
  acq.a.sid = entry.e.sid AS same_session
FROM entry JOIN plat USING (person) LEFT JOIN acq USING (person)
WHERE DATE(TIMESTAMP_MICROS(entry.e.ts), 'Asia/Seoul') BETWEEN '{COHORT[0]}' AND '{COHORT[1]}'
"""

CAT_OF = {e: c for c, evs in CATEGORY.items() for e in evs}


def fmt(sec: float) -> str:
    return f"{sec / 60:.1f}분" if sec < 3600 else f"{sec / 3600:.1f}시간"


def summarize(label: str, df: pd.DataFrame) -> None:
    a = df.dropna(subset=["sec"])
    if not len(df):
        return
    s = a["sec"].to_numpy()
    q = np.percentile(s, [25, 50, 75]) if len(s) else [np.nan] * 3
    within = lambda t: (s <= t).sum() / len(df)  # noqa: E731  share of ALL entered
    print(f"  {label:5s} entered {len(df):3d} · acquired≤7d {len(a):3d} ({len(a)/len(df):.0%}) · "
          f"median {fmt(q[1])} [IQR {fmt(q[0])}~{fmt(q[2])}] · same session {a['same_session'].mean():.0%}")
    print(f"        of all entered: ≤5분 {within(300):.0%} · ≤15분 {within(900):.0%} · ≤1시간 {within(3600):.0%} · "
          f"≤1일 {within(86400):.0%} · ≤7일 {len(a)/len(df):.0%}")


def main() -> None:
    df = read_sql(SQL)
    print(f"[time to first acquisition — GA4, first entry {COHORT[0]}~{COHORT[1]}]")
    for label, g in [("all", df)] + [(p, df[df["platform"] == p]) for p in ("web", "toss")]:
        summarize(label, g)
    a = df.dropna(subset=["sec"])
    print("\n  first acquisition event (people):")
    cat = a["first_event"].map(CAT_OF)
    for c, n in cat.value_counts().items():
        med = a.loc[cat == c, "sec"].median()
        print(f"    {c:8s} {n:3d} ({n/len(a):.0%}) · median {fmt(med)}")
    print("  top events: " + " · ".join(f"{k} {v}" for k, v in a["first_event"].value_counts().head(5).items()))


if __name__ == "__main__":
    main()
