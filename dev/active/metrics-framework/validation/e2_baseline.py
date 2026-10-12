"""E2 baseline — first-session play-action rate of web first-visit devices, for the sample-size calculation only.

Population = E2 analysis population applied to past data: web devices from web_entry_g1.build (kept),
minus localhost/127.0.0.1 hosts and non-Korea geo. Window 2026-09-04 ~ 10-11 (first_visit).
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/e2_baseline.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web_entry_g1 import build  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402
from nsm_validate import RESULT_ACTIONS  # noqa: E402

# play action = a production attempt or an acquisition; movement, zone entry, talk, quest, shop browsing excluded
PLAY_E2 = sorted({"plant_seed", "water_crop", "fishing_cast", "sea_cast", "chop_tree", "first_chop",
                  "dig_plot", "cooking_start", "shop_sell"} | set(RESULT_ACTIONS))
LOCAL_HOSTS = ("localhost", "127.0.0.1")


def main() -> None:
    k = build()
    k = k[k.kept]
    ids = ",".join(f"'{x}'" for x in k.user_pseudo_id)
    names = ",".join(f"'{x}'" for x in PLAY_E2)
    q = f"""
    WITH ev AS (
      SELECT user_pseudo_id, event_name, geo.country AS country,
        NET.HOST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location')) AS host,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid
      FROM `{GA4}.events_*`
      WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND user_pseudo_id IN ({ids})
    ), fv AS (
      SELECT user_pseudo_id, ANY_VALUE(sid) AS sid0, ANY_VALUE(country) AS country, ANY_VALUE(host) AS host
      FROM ev WHERE event_name = 'first_visit' GROUP BY 1
    )
    SELECT fv.user_pseudo_id, fv.country, fv.host,
      LOGICAL_OR(ev.event_name IN ({names}) AND ev.sid = fv.sid0) AS play_s1
    FROM fv LEFT JOIN ev USING (user_pseudo_id) GROUP BY 1, 2, 3
    """
    x = k.merge(read_sql(q), on="user_pseudo_id", how="left")
    x["play_s1"] = x["play_s1"].fillna(False).astype(bool)
    pop = x[~x.host.isin(LOCAL_HOSTS) & x.country.eq("South Korea")]
    weeks = (pop.fv.max() - pop.fv.min()).days / 7
    p = pop.play_s1.mean()
    print(f"E2 population (past) n={len(pop)} over {weeks:.1f} weeks = {len(pop) / weeks:.1f}/week")
    print(f"first-session play action: {pop.play_s1.sum()}/{len(pop)} = {p:.0%}")
    print(f"  among entrants {pop[pop.entered].play_s1.mean():.0%} (n={pop.entered.sum()})")
    # two-proportion sample size, alpha .05 two-sided, power .80
    for p2 in (p + .25, p + .30, .75):
        pb = (p + p2) / 2
        n = (1.96 * np.sqrt(2 * pb * (1 - pb)) + .8416 * np.sqrt(p * (1 - p) + p2 * (1 - p2))) ** 2 / (p2 - p) ** 2
        print(f"  target {p2:.0%}: n per arm = {int(np.ceil(n))}")


if __name__ == "__main__":
    main()
