"""Space (decorate/house) vs minigame — what returners did on day 0 and in week 1 (descriptive, NOT causal).

Population: all GA4 devices over the full export history whose first event (KST day d0) is on or before
2026-10-08, so the 7-day return window ends inside the data (last table 2026-10-15).
Excluded: persona accounts (Supabase auth.users email pattern, kept in memory), dev devices (localhost
clients via session_logs user_id), beta-marked devices (ab_variant beta_A/B), and devices with no game
action on d0 (never entered play — composition undefined; counted and printed).
Label: returned = any event on d0+1..d0+7.
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/space_vs_minigame.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from hierarchy_baseline import DEV_CLIENTS, RAW, GA4, read_sql  # noqa: E402
from probe_g1 import persona_ids  # noqa: E402
from first5min_segments import wilson  # noqa: E402

LAST_D0 = "2026-10-08"
CATS = {
    "house": ["house_build", "house_complete", "house_expand", "house_addon_buy", "house_floor",
              "craft_station_build"],
    "decor": ["place_decor", "pick_decor", "move_decor", "store_decor", "move_outdoor", "pick_outdoor",
              "store_outdoor", "decor_buy_coins", "decor_buy_shard"],
    "neighbor": ["neighbors_open", "neighbor_visit_start", "neighbor_react", "neighbor_indoor_enter"],
    "farm": ["plant_seed", "water_crop", "harvest_crop", "chop_tree", "first_chop", "dig_plot", "weed_pull",
             "sapling_plant", "tree_water", "fruit_harvest", "coop_feed", "coop_collect", "honey_collect",
             "forage_pick", "mine_ore"],
    "minigame": ["fishing_cast", "sea_cast", "boat_start", "cooking_start", "carve_start", "mist_purify_start",
                 "mist_practice_start", "firefly_swing", "star_start", "duel_start", "ferry_quiz_start",
                 "cafe_serve"],
    "quest": ["npc_talk", "npc_chat_open", "quest_accept", "quest_complete", "gift_give"],
    "collect": ["museum_enter", "dex_open", "museum_exhibit_view", "photo_capture"],
}
LABEL = {"house": "집 짓기·증축", "decor": "꾸미기(배치)","neighbor": "이웃 마을 구경", "farm": "농사·채집",
         "minigame": "미니게임", "quest": "주민·의뢰", "collect": "도감·박물관"}


def sql(pids: list[str]) -> str:
    lit = ", ".join(f"'{p}'" for p in pids) or "''"
    case = "\n".join(f"      WHEN event_name IN ({', '.join(repr(e) for e in v)}) THEN '{k}'" for k, v in CATS.items())
    return f"""
WITH ev AS (
  SELECT user_pseudo_id AS pid, user_id, event_name,
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS day,
    (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'ab_variant') AS ab,
    (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform') AS platform,
    CASE
{case}
    END AS cat
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND user_pseudo_id IS NOT NULL
),
dev_users AS (
  SELECT DISTINCT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL
),
dev AS (
  SELECT pid, MIN(day) AS d0,
    LOGICAL_OR(user_id IN ({lit})) AS persona,
    LOGICAL_OR(user_id IN (SELECT user_id FROM dev_users)) AS developer,
    LOGICAL_OR(REGEXP_CONTAINS(COALESCE(ab, ''), r'^beta_[AB]$')) AS beta,
    ARRAY_AGG(platform IGNORE NULLS ORDER BY day LIMIT 1)[SAFE_OFFSET(0)] AS platform
  FROM ev GROUP BY 1
)
SELECT d.pid, d.d0, d.persona, d.developer, d.beta, COALESCE(d.platform, 'web') AS platform,
  COUNTIF(e.day BETWEEN DATE_ADD(d.d0, INTERVAL 1 DAY) AND DATE_ADD(d.d0, INTERVAL 7 DAY)) > 0 AS returned,
  COUNT(DISTINCT IF(e.day BETWEEN d.d0 AND DATE_ADD(d.d0, INTERVAL 7 DAY), e.day, NULL)) AS active_days_w1,
  COUNTIF(e.day = d.d0 AND e.cat IS NOT NULL) AS d0_actions,
  {", ".join(f"COUNTIF(e.day = d.d0 AND e.cat = '{k}') AS d0_{k}" for k in CATS)},
  {", ".join(f"COUNTIF(e.day BETWEEN d.d0 AND DATE_ADD(d.d0, INTERVAL 7 DAY) AND e.cat = '{k}') AS w1_{k}" for k in CATS)}
FROM dev d JOIN ev e USING (pid)
WHERE d.d0 <= DATE '{LAST_D0}'
GROUP BY 1, 2, 3, 4, 5, 6
"""


def load() -> pd.DataFrame:
    d = read_sql(sql(persona_ids()))
    steps = [("all devices d0<=" + LAST_D0, len(d))]
    for col in ("persona", "developer", "beta"):
        d = d[~d[col]]
        steps.append((f"- {col}", len(d)))
    d = d[d["d0_actions"] > 0]
    steps.append(("- no game action on d0", len(d)))
    for name, n in steps:
        print(f"  {name:28s} {n:4d}")
    return d.reset_index(drop=True)


def reach_table(d: pd.DataFrame, prefix: str) -> pd.DataFrame:
    rows = []
    for k in CATS:
        did = d[f"{prefix}_{k}"] > 0
        for grp, g in (("returned", d[d.returned]), ("left", d[~d.returned])):
            kk, n = int((g[f"{prefix}_{k}"] > 0).sum()), len(g)
            lo, hi = wilson(kk, n)
            rows.append({"cat": k, "group": grp, "k": kk, "n": n, "p": kk / n, "lo": lo, "hi": hi})
        kk, n = int(d.loc[did, "returned"].sum()), int(did.sum())
        lo, hi = wilson(kk, n) if n else (np.nan, np.nan)
        rows.append({"cat": k, "group": "ret_if_did", "k": kk, "n": n, "p": kk / n if n else np.nan, "lo": lo, "hi": hi})
    return pd.DataFrame(rows)


def main() -> None:
    d = load()
    r = d.returned.mean()
    print(f"\ncohort {len(d)} · returned d1~7 {int(d.returned.sum())} ({r:.0%}) · "
          f"web {int((d.platform == 'web').sum())} · toss {int((d.platform == 'toss').sum())}")
    for prefix, title in (("d0", "DAY 0 reach"), ("w1", "WEEK 1 (d0~d7) reach")):
        t = reach_table(d, prefix)
        print(f"\n[{title}]  returned vs left  |  return rate among those who did it")
        for k in CATS:
            a = t[(t.cat == k) & (t.group == "returned")].iloc[0]
            b = t[(t.cat == k) & (t.group == "left")].iloc[0]
            c = t[(t.cat == k) & (t.group == "ret_if_did")].iloc[0]
            print(f"  {LABEL[k]:10s} returned {a.p:4.0%} [{a.lo:.0%},{a.hi:.0%}] ({a.k}/{a.n})  "
                  f"left {b.p:4.0%} [{b.lo:.0%},{b.hi:.0%}] ({b.k}/{b.n})  |  "
                  f"ret {c.p:4.0%} [{c.lo:.0%},{c.hi:.0%}] ({c.k}/{c.n})")
    hi = d.d0_actions >= d.d0_actions.median()
    print(f"\n[DAY 0 return rate by category, split at median d0 actions = {d.d0_actions.median():.0f}]")
    for name, g in (("light d0", d[~hi]), ("heavy d0", d[hi])):
        print(f"  {name}: n={len(g)} · base return {g.returned.mean():.0%}")
        for k in CATS:
            did = g[f"d0_{k}"] > 0
            n, kk = int(did.sum()), int(g.loc[did, "returned"].sum())
            nn, kn = int((~did).sum()), int(g.loc[~did, "returned"].sum())
            if n:
                print(f"    {LABEL[k]:10s} did {kk}/{n} ({kk / n:.0%})  vs not {kn}/{nn} ({kn / nn:.0%})")
    ret = d[d.returned]
    tot =ret[[f"w1_{k}" for k in CATS]].sum()
    print("\n[WEEK 1 action-event share among returners]")
    for k in CATS:
        print(f"  {LABEL[k]:10s} {tot[f'w1_{k}']:6d}  {tot[f'w1_{k}'] / tot.sum():5.1%}")
    out = Path(__file__).resolve().parents[4] / "ml" / "reports" / "space_vs_minigame_devices.parquet"
    d.drop(columns=["pid"]).to_parquet(out, index=False)
    print(f"\nsaved {out.name} (no ids)")


if __name__ == "__main__":
    main()
