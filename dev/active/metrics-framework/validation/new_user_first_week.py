"""New-user first week — evidence for the project topic sentence.

Cohort: first active day 2026-08-06 ~ 2026-09-16, web + toss, persona rule P1 excluded.
1) Return rate (days 8-21) by whether the user did any acquisition action in days 0-6
2) What the no-acquisition group did instead (system-only / onboarding-only / tried something)

Run: ml/.venv/bin/python dev/active/metrics-framework/validation/new_user_first_week.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nsm_validate import RAW, RESULT_ACTIONS  # noqa: E402
from calm_ml.bq import read_sql  # noqa: E402  (path set by nsm_validate)

COHORT = (pd.Timestamp("2026-08-06").date(), pd.Timestamp("2026-09-16").date())
ONBOARD = {
    "character_select", "nickname_set", "intro_start", "intro_skip", "intro_complete",
    "tutorial_start", "tutorial_step", "tutorial_skip", "tutorial_complete", "story_chapter_start",
}
ATTEMPT = {
    "plant_seed", "water_crop", "fishing_cast", "sea_cast", "chop_tree", "first_chop", "dig_plot",
    "quest_accept", "quest_offered", "npc_talk", "cooking_start", "kitchen_open", "enter_farm",
    "enter_mine", "boat_enter", "sea_enter", "shop_sell", "shop_open", "shop_enter", "zone_enter",
    "enter_cafe",
}

SQL = f"""
WITH latest AS (
  SELECT * EXCEPT(rn) FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) rn
    FROM `{RAW}.session_logs`
  ) WHERE rn = 1
),
persona AS (
  SELECT user_id FROM `{RAW}.session_logs` WHERE user_id IS NOT NULL GROUP BY 1
  HAVING COUNT(DISTINCT client_id) >= 4 AND MIN(DATE(started_at, 'Asia/Seoul')) >= '2026-09-28'
)
SELECT
  DATE(started_at, 'Asia/Seoul') AS d,
  IF(is_guest = FALSE AND user_id IS NOT NULL, CONCAT('u:', user_id), CONCAT('c:', client_id)) AS person,
  counts,
  LEAST(IFNULL(play_sec, 0), 3600) AS play_sec
FROM latest
WHERE platform IN ('web', 'toss')
  AND IFNULL(user_id NOT IN (SELECT user_id FROM persona), TRUE)
"""


def _counts(raw: str | None) -> dict[str, float]:
    try:
        return {k: v for k, v in json.loads(raw).items() if isinstance(v, (int, float)) and v > 0}
    except (TypeError, ValueError):
        return {}


def load() -> pd.DataFrame:
    s = read_sql(SQL)
    s["d"] = pd.to_datetime(s["d"]).dt.date
    first = s.groupby("person")["d"].min().rename("d0")
    s = s.join(first, on="person")
    s = s[(s["d0"] >= COHORT[0]) & (s["d0"] <= COHORT[1])].copy()
    s["k"] = (pd.to_datetime(s["d"]) - pd.to_datetime(s["d0"])).dt.days
    s["kv"] = s["counts"].map(_counts)
    return s


def per_person(s: pd.DataFrame) -> pd.DataFrame:
    w1 = s[s["k"].between(0, 6)]
    rows = []
    for person, g in w1.groupby("person"):
        keys: set[str] = set().union(*g["kv"].map(set))
        rows.append({
            "person": person,
            "acquired": bool(keys & set(RESULT_ACTIONS)),
            "onboard": bool(keys & ONBOARD),
            "attempts": sorted(keys & ATTEMPT),
            "days": g["d"].nunique(),
            "play_min": g["play_sec"].sum() / 60,
        })
    df = pd.DataFrame(rows).set_index("person")
    returned = s[s["k"].between(8, 21)].groupby("person").size().gt(0)
    df["returned"] = returned.reindex(df.index, fill_value=False)
    return df


def report(df: pd.DataFrame) -> None:
    print(f"cohort n={len(df)}")
    print("\n[1] return (days 8-21) by first-week acquisition")
    print(df.groupby("acquired")["returned"].agg(["count", "sum", "mean"]).to_string())
    print("\n    controlling first-week visit days")
    for label, mask in [("days == 1", df["days"] == 1), ("days >= 2", df["days"] >= 2)]:
        print(f"    {label}")
        print(df[mask].groupby("acquired")["returned"].agg(["count", "sum", "mean"]).to_string())

    none = df[~df["acquired"]].copy()
    none["bucket"] = [
        "tried something" if a else ("onboarding only" if o else "system only")
        for a, o in zip(none["attempts"].map(bool), none["onboard"])
    ]
    print(f"\n[2] no-acquisition group n={len(none)}")
    print(none.groupby("bucket").agg(n=("days", "size"), play_min_median=("play_min", "median")).to_string())
    tried = none[none["bucket"] == "tried something"]["attempts"].explode().value_counts()
    print("\n    attempts in 'tried something' (people)")
    print(tried.head(12).to_string())


if __name__ == "__main__":
    report(per_person(load()))
