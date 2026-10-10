"""Engagement LTV — value unit = acquired days (the north-star unit), not cash.

LTV(k) = acquired days a new user accumulates in days 0..k-1 after their first visit.
Population/key rules are the official ones from hierarchy_baseline.person_days (spec §2).
Only cohorts fully observable for 28 days are included.
Activation comparison uses days 8-28 only (days 0-6 define activation itself).

Run: ml/.venv/bin/python dev/active/metrics-framework/validation/ltv_engagement.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import DEV_CLIENTS, PERSONA, person_days  # noqa: E402
from nsm_validate import RESULT_ACTIONS  # noqa: E402
from calm_ml.bq import GA4, RAW, read_sql  # noqa: E402

GA4_START = "2000-01-01"  # no floor: from the first day GA4 has (game launch 7/26 account, 7/27 first events)
_EV = ", ".join(f"'{e}'" for e in RESULT_ACTIONS)
GA4_SQL = f"""
-- GA4 version of the person-day table, so cohorts can start before session_logs (8/6)
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
    IFNULL((SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform'), 'web') AS platform
  FROM `{GA4}.events_*`
),
pseudo_out AS (SELECT DISTINCT user_pseudo_id FROM ev WHERE user_id IN (SELECT user_id FROM excluded)),
pseudo_acct AS (
  SELECT user_pseudo_id, ANY_VALUE(user_id) AS acct FROM ev
  WHERE user_id IN (SELECT user_id FROM logged) GROUP BY 1 HAVING COUNT(DISTINCT user_id) = 1
)
SELECT IF(a.acct IS NOT NULL, CONCAT('u:', a.acct), CONCAT('p:', ev.user_pseudo_id)) AS person, ev.d,
  LOGICAL_OR(ev.event_name IN ({_EV})) AS tended,
  LOGICAL_OR(ev.user_id IS NOT NULL) AS entered
FROM ev LEFT JOIN pseudo_acct a USING (user_pseudo_id)
WHERE ev.platform IN ('web', 'toss') AND ev.d >= '{GA4_START}'
  AND ev.user_pseudo_id NOT IN (SELECT user_pseudo_id FROM pseudo_out)
GROUP BY 1, 2
"""


HORIZONS = (7, 14, 28)
RNG = np.random.default_rng(20261010)
N_BOOT = 2000


def _ci(values: np.ndarray) -> tuple[float, float]:
    if len(values) == 0:
        return float("nan"), float("nan")
    boots = [RNG.choice(values, len(values)).mean() for _ in range(N_BOOT)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    return float(lo), float(hi)


def cohort_table(pd_df: pd.DataFrame) -> pd.DataFrame:
    first = pd_df.groupby("person")["d"].min().rename("d0")
    df = pd_df.join(first, on="person")
    df["k"] = (pd.to_datetime(df["d"]) - pd.to_datetime(df["d0"])).dt.days
    last_day = df["d"].max()
    eligible = first[first <= last_day - pd.Timedelta(days=max(HORIZONS) - 1)]
    df = df[df["person"].isin(eligible.index)]
    per = pd.DataFrame(index=eligible.index)
    for h in HORIZONS:
        per[f"ltv{h}"] = df[df["k"] < h].groupby("person")["tended"].sum().reindex(per.index, fill_value=0)
    per["post_8_28"] = df[df["k"].between(7, 27)].groupby("person")["tended"].sum().reindex(per.index, fill_value=0)
    per["activated"] = per["ltv7"] > 0
    print(f"cohort: first visit {eligible.min()} ~ {eligible.max()} (28-day observable), data until {last_day}")
    return per


def report(per: pd.DataFrame) -> None:
    n = len(per)
    print(f"\n[engagement LTV, all new users] n={n}")
    for h in HORIZONS:
        v = per[f"ltv{h}"].to_numpy(float)
        lo, hi = _ci(v)
        print(f"  LTV{h:<2d} mean {v.mean():.2f} acquired days [{lo:.2f}, {hi:.2f}] · "
              f"median {np.median(v):.0f} · zero-share {(v == 0).mean():.0%}")
    print("\n[days 8-28 acquired days by first-week activation]")
    for label, g in [("activated (acquired in days 0-6)", per[per["activated"]]),
                     ("not activated", per[~per["activated"]])]:
        v = g["post_8_28"].to_numpy(float)
        lo, hi = _ci(v)
        print(f"  {label:34s} n={len(g):3d}  mean {v.mean():.2f} [{lo:.2f}, {hi:.2f}]  any>0 {(v > 0).mean():.0%}")
    a = per.loc[per["activated"], "post_8_28"].to_numpy(float)
    b = per.loc[~per["activated"], "post_8_28"].to_numpy(float)
    if len(a) and len(b) and b.mean() > 0:
        print(f"  ratio activated/not = {a.mean() / b.mean():.1f}x")
    ranked = per["ltv28"].sort_values(ascending=False)
    top = ranked.head(max(1, int(round(n * 0.10)))).sum() / max(ranked.sum(), 1)
    print(f"\n[concentration] top 10% of new users hold {top:.0%} of 28-day acquired days")


def ga4_person_days() -> pd.DataFrame:
    df = read_sql(GA4_SQL)
    df["d"] = pd.to_datetime(df["d"]).dt.date
    return df


def main() -> None:
    src = "ga4" if "--ga4" in sys.argv else "sl"
    print(f"[source] {src}")
    days = ga4_person_days() if src == "ga4" else person_days()
    if src == "ga4" and "--entered" in sys.argv:
        entered = days.groupby("person")["entered"].any()
        days = days[days["person"].isin(entered[entered].index)]
        print("[cohort] game-entered users only (user_id appeared) — same population as session_logs")
    per = cohort_table(days)
    report(per)


if __name__ == "__main__":
    main()
