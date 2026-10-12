"""F2 G1 — data reliability for publish-day inflow (pre-registration: publish-day-prereg.md).

Builds the device table ONCE (web entry G1 table + first_visit host/country) for 9/14~10/11.
Does NOT compare impact vs other days (G2). Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/publish_day_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from web_entry_g1 import build  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402

START, END = pd.Timestamp("2026-09-14"), pd.Timestamp("2026-10-11")
IMPACT = pd.to_datetime(["2026-09-14", "2026-09-15", "2026-09-16", "2026-10-06",
                         "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10"])


def table() -> pd.DataFrame:
    k = build()
    k = k[k.kept & (k.fv >= START) & (k.fv < END + pd.Timedelta(days=1))].copy()
    ids = ",".join(f"'{x}'" for x in k.user_pseudo_id)
    geo = read_sql(f"""
    SELECT user_pseudo_id, ANY_VALUE(geo.country) AS country,
      ANY_VALUE(NET.HOST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location'))) AS host
    FROM `{GA4}.events_*`
    WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND user_pseudo_id IN ({ids}) AND event_name = 'first_visit'
    GROUP BY 1""")
    k = k.merge(geo, on="user_pseudo_id", how="left")
    k["day"] = k.fv.dt.normalize()
    k["impact"] = k.day.isin(IMPACT)
    k["pop"] = ~k.host.isin(["localhost", "127.0.0.1"]) & k.country.eq("South Korea")
    return k.sort_values("user_pseudo_id").reset_index(drop=True)


def main() -> None:
    k = table()
    print(f"[1] web kept first-visit devices 9/14~10/11 = {len(k)} · host null {k.host.isna().sum()} · country null {k.country.isna().sum()}")
    print(f"    excluded: localhost {k.host.isin(['localhost', '127.0.0.1']).sum()} · non-Korea {(~k.country.eq('South Korea')).sum()} · POPULATION {k['pop'].sum()}")
    p = k[k["pop"]]
    days = pd.date_range(START, END)
    per = p.groupby("day").size().reindex(days, fill_value=0)
    print(f"[2] days {len(days)} · impact days {int(pd.Series(days).isin(IMPACT).sum())} · days with 0 devices {int((per == 0).sum())}")
    print(f"[3] cell sizes: impact-day devices {int(p.impact.sum())} · other-day devices {int((~p.impact).sum())}")
    print(f"[4] entry flag defined for all: {p.entered.notna().all()} (user_id-based, guest included)")


if __name__ == "__main__":
    main()
