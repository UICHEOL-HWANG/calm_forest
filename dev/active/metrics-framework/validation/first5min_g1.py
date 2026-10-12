"""First-5-min diagnosis — G1 data reliability (hypotheses: first5min-hypotheses.md).

Checks only whether the hypotheses CAN be measured; computes no hypothesis outcome.
1) cohort reproduces (entered new users 7/27~9/27, same rules as time_to_first_acquisition)
2) ga_session_id coverage on cohort events (B3 session boundaries)
3) first-seen date of every event the hypotheses use (B2/B1/C2)
4) duplicate rows (same device, event, timestamp)
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from time_to_first_acquisition import SQL as TTFA_SQL  # noqa: E402  (cohort definition reused, not copied)
from hierarchy_baseline import GA4, read_sql  # noqa: E402

ONBOARD = ["character_select", "intro_start", "intro_skip", "intro_complete", "tutorial_start", "tutorial_step",
           "tutorial_skip", "tutorial_complete", "nickname_set"]
B2_TALK = ["npc_talk", "quest_offered", "quest_accept"]
B2_PRODUCE = ["plant_seed", "water_crop", "fishing_cast", "chop_tree", "enter_farm", "zone_enter", "sea_enter"]
B1_PLACE = ["enter_farm", "zone_enter", "fishing_cast", "sea_enter", "enter_mine"]
C2 = ["harvest_crop"]
EVENTS = sorted(set(ONBOARD + B2_TALK + B2_PRODUCE + B1_PLACE + C2))
DAILY = r"REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{8}$')"


def main() -> None:
    cohort = read_sql(TTFA_SQL)
    print(f"[1] cohort reproduce: entered new users 7/27~9/27 = {len(cohort)} (expected 203)")

    cov = read_sql(f"""
      SELECT COUNT(*) n, COUNTIF((SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') IS NOT NULL) with_sid
      FROM `{GA4}.events_*`
      WHERE {DAILY} AND _TABLE_SUFFIX BETWEEN '20260727' AND '20261011' AND user_id IS NOT NULL""")
    n, w = int(cov.n[0]), int(cov.with_sid[0])
    print(f"[2] ga_session_id coverage on entered-user events 7/27~10/11: {w}/{n} = {w/n:.1%} (pass ≥ 95%)")

    names = ", ".join(f"'{e}'" for e in EVENTS)
    fs = read_sql(f"""
      SELECT event_name, MIN(PARSE_DATE('%Y%m%d', event_date)) first_day, COUNT(DISTINCT user_pseudo_id) devices
      FROM `{GA4}.events_*` WHERE {DAILY} AND event_name IN ({names}) GROUP BY 1 ORDER BY 2""")
    print("[3] first-seen date of hypothesis events (cohort starts 2026-07-27; B1 cohort starts 2026-08-12):")
    seen = set(fs.event_name)
    for _, r in fs.iterrows():
        use = [h for h, evs in (("B2talk", B2_TALK), ("B2prod", B2_PRODUCE), ("B1", B1_PLACE), ("C2", C2), ("onboard", ONBOARD)) if r.event_name in evs]
        late = " ⚠️ after cohort start" if str(r.first_day) > "2026-07-27" else ""
        print(f"    {r.event_name:18s} {r.first_day}  devices {int(r.devices):4d}  [{','.join(use)}]{late}")
    for e in EVENTS:
        if e not in seen:
            print(f"    {e:18s} — never seen")

    dup = read_sql(f"""
      SELECT COUNT(*) rows_, COUNT(DISTINCT FORMAT('%s|%s|%d', user_pseudo_id, event_name, event_timestamp)) uniq
      FROM `{GA4}.events_*` WHERE {DAILY} AND _TABLE_SUFFIX BETWEEN '20260727' AND '20261011' AND event_name IN ({names})""")
    r, u = int(dup.rows_[0]), int(dup.uniq[0])
    print(f"[4] duplicate rows (device, event, timestamp) among hypothesis events: {r - u} of {r}")


if __name__ == "__main__":
    main()
