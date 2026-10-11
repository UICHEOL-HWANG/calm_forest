"""New-user first week on GA4, from game launch — evidence for the project topic sentence.

Cohort: game-entered new users (first day with a user_id, guest uid included) 2026-07-27 ~ 09-16,
web + toss, persona + dev devices excluded. Same person key as ltv_engagement (pseudo id mapped to
exactly one logged-in account -> u:<account>, else p:<pseudo>). GA4 only (decision 2026-10-11):
this is a cohort number, and the activation funnel and engagement LTV are GA4 cohorts too.
1) Return rate (days 8-21) by whether the user did any acquisition action in days 0-6
2) What the no-acquisition group did instead (system-only / onboarding-only / tried something)
Play time = GA4 engagement_time_msec (session_logs play_sec is not available before 8/6).

Run: ml/.venv/bin/python dev/active/metrics-framework/validation/new_user_first_week_ga4.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import DEV_CLIENTS, PERSONA, RAW, GA4, read_sql  # noqa: E402
from nsm_validate import RESULT_ACTIONS  # noqa: E402
from new_user_first_week import ATTEMPT, ONBOARD, report  # noqa: E402

COHORT = ("2026-07-27", "2026-09-16")   # day 21 observable by 10/7

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
  SELECT user_pseudo_id, user_id, event_name,
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS d,
    IFNULL((SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform'), 'web') AS platform,
    IFNULL((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec'), 0) AS eng_ms
  FROM `{GA4}.events_*`
),
pseudo_out AS (SELECT DISTINCT user_pseudo_id FROM ev WHERE user_id IN (SELECT user_id FROM excluded)),
pseudo_acct AS (
  SELECT user_pseudo_id, ANY_VALUE(user_id) AS acct FROM ev
  WHERE user_id IN (SELECT user_id FROM logged) GROUP BY 1 HAVING COUNT(DISTINCT user_id) = 1
)
SELECT IF(a.acct IS NOT NULL, CONCAT('u:', a.acct), CONCAT('p:', ev.user_pseudo_id)) AS person, ev.d,
  LOGICAL_OR(ev.user_id IS NOT NULL) AS entered,
  ARRAY_AGG(DISTINCT ev.event_name) AS events,
  SUM(ev.eng_ms) / 1000 AS play_sec
FROM ev LEFT JOIN pseudo_acct a USING (user_pseudo_id)
WHERE ev.platform IN ('web', 'toss')
  AND ev.user_pseudo_id NOT IN (SELECT user_pseudo_id FROM pseudo_out)
GROUP BY 1, 2
"""


def load() -> pd.DataFrame:
    s = read_sql(SQL)
    s["d"] = pd.to_datetime(s["d"]).dt.date
    s = s[s["entered"]].copy()
    first = s.groupby("person")["d"].min().rename("d0")
    s = s.join(first, on="person")
    lo, hi = (pd.Timestamp(x).date() for x in COHORT)
    s = s[(s["d0"] >= lo) & (s["d0"] <= hi)].copy()
    s["k"] = (pd.to_datetime(s["d"]) - pd.to_datetime(s["d0"])).dt.days
    s["keys"] = s["events"].map(set)
    return s


def per_person(s: pd.DataFrame) -> pd.DataFrame:
    w1 = s[s["k"].between(0, 6)]
    rows = []
    for person, g in w1.groupby("person"):
        keys: set[str] = set().union(*g["keys"])
        rows.append({
            "person": person,
            "acquired": bool(keys & set(RESULT_ACTIONS)),
            "onboard": bool(keys & ONBOARD),
            "attempts": sorted(keys & ATTEMPT),
            "days": g["d"].nunique(),
            "play_min": min(g["play_sec"].sum(), 3600 * g["d"].nunique()) / 60,
        })
    df = pd.DataFrame(rows).set_index("person")
    returned = s[s["k"].between(8, 21)].groupby("person").size().gt(0)
    df["returned"] = returned.reindex(df.index, fill_value=False)
    return df


if __name__ == "__main__":
    print(f"[GA4] entered new users, first day {COHORT[0]} ~ {COHORT[1]}")
    report(per_person(load()))
