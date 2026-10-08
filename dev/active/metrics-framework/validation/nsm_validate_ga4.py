"""V1-GA4 — measurement-cause check, criteria fixed in ../nsm-validation-prereg.md (commit fd600ad).

Same cohort/label/features as V1; only the source changes (GA4 event-level instead of session_logs.counts).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/nsm_validate_ga4.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nsm_validate import RESULT_ACTIONS, SQL as SL_SQL, person_days, v1  # noqa: E402
from calm_ml.bq import GA4, RAW, read_sql  # noqa: E402  (path set by nsm_validate)

_EVENTS = ", ".join(f"'{e}'" for e in RESULT_ACTIONS)

GA4_SQL = f"""
WITH logged AS (
  SELECT DISTINCT user_id FROM `{RAW}.session_logs`
  WHERE is_guest = FALSE AND user_id IS NOT NULL
)
SELECT
  DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS d,
  IF(user_id IN (SELECT user_id FROM logged), CONCAT('u:', user_id), CONCAT('p:', user_pseudo_id)) AS person,
  COUNTIF(event_name IN ({_EVENTS})) AS results,
  SUM(IFNULL((SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec'), 0)) / 1000 AS play_sec
FROM `{GA4}.events_*`
WHERE user_pseudo_id IS NOT NULL
GROUP BY 1, 2
"""


def ga4_person_days() -> pd.DataFrame:
    df = read_sql(GA4_SQL)
    df["d"] = pd.to_datetime(df["d"]).dt.date
    df["decor_chat"] = 0
    df["platform"] = "ga4"
    df["tended"] = df["results"] > 0
    return df


def agreement(ga: pd.DataFrame) -> None:
    sl = read_sql(SL_SQL)
    sl["d"] = pd.to_datetime(sl["d"]).dt.date
    sl_days = person_days(sl)[["person", "d", "results"]].rename(columns={"results": "sl_results"})
    logged = ga[ga["person"].str.startswith("u:")]
    m = logged.merge(sl_days, on=["person", "d"], how="left")
    ga_tended = m[m["tended"]]
    n = len(ga_tended)
    missing_row = int(ga_tended["sl_results"].isna().sum())
    zero = int((ga_tended["sl_results"] == 0).sum())
    both = n - missing_row - zero
    print(f"\n[agreement, logged-in keys] GA4 tended person-days={n}")
    print(f"  SL has no session that day:      {missing_row} ({missing_row / n:.1%})")
    print(f"  SL session exists but results=0: {zero} ({zero / n:.1%})")
    print(f"  SL also tended:                  {both} ({both / n:.1%})")


def main() -> None:
    ga = ga4_person_days()
    v1(ga, "GA4 raw")
    v1(ga, "GA4 raw w/o beta-week cohort", drop_beta_cohort=True)
    agreement(ga)


if __name__ == "__main__":
    main()
