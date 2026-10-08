"""Metric hierarchy baseline — every node's current value for the 4 full weeks 2026-09-07 ~ 10-04.

Official population: persona P1 excluded, beta sessions excluded only 9/9~9/15, web + toss, mixed person key.
Also checks the identity  tended person-days == visitors x days/visitor x tended-share.
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/hierarchy_baseline.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nsm_validate import RAW, RESULT_ACTIONS  # noqa: E402
from calm_ml.bq import GA4, read_sql  # noqa: E402  (path set by nsm_validate)

WEEKS = [pd.Timestamp(d).date() for d in ("2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28")]
END = pd.Timestamp("2026-10-04").date()
CATEGORY = {
    "farm": ["harvest_crop", "coop_collect", "honey_collect"],
    "catch": ["fishing_catch", "sea_catch", "firefly_catch", "forage_pick", "mine_ore"],
    "make": ["craft_item", "craft_claim", "cooking_result", "cafe_serve", "carve_result"],
    "village": ["quest_complete", "star_result", "duel_result"],
}
RNG = np.random.default_rng(20261008)

PERSONA = f"""
  SELECT user_id FROM `{RAW}.session_logs` WHERE user_id IS NOT NULL GROUP BY 1
  HAVING COUNT(DISTINCT client_id) >= 4 AND MIN(DATE(started_at, 'Asia/Seoul')) >= '2026-09-28'
"""

SL_SQL = f"""
WITH latest AS (
  SELECT * EXCEPT(rn) FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) rn
    FROM `{RAW}.session_logs`
  ) WHERE rn = 1
)
SELECT
  DATE(started_at, 'Asia/Seoul') AS d, started_at,
  IF(is_guest = FALSE AND user_id IS NOT NULL, CONCAT('u:', user_id), CONCAT('c:', client_id)) AS person,
  counts, last_place
FROM latest
WHERE platform IN ('web', 'toss')
  AND IFNULL(user_id NOT IN ({PERSONA}), TRUE)
  AND NOT (IFNULL(variant, '') IN ('beta_A', 'beta_B')
           AND DATE(started_at, 'Asia/Seoul') BETWEEN '2026-09-09' AND '2026-09-15')
"""

FUNNEL_SQL = f"""
WITH ev AS (
  SELECT user_pseudo_id, user_id, event_name, PARSE_DATE('%Y%m%d', event_date) AS d,
    (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform') AS platform
  FROM `{GA4}.events_*`
),
fv AS (
  SELECT user_pseudo_id, MIN(d) AS d0 FROM ev WHERE event_name = 'first_visit' GROUP BY 1
  HAVING MIN(d) BETWEEN '2026-08-06' AND '2026-09-27'
),
persona_pseudo AS (
  SELECT DISTINCT user_pseudo_id FROM ev WHERE user_id IN ({PERSONA})
),
w AS (
  SELECT e.* FROM ev e JOIN fv USING (user_pseudo_id)
  WHERE e.d BETWEEN fv.d0 AND DATE_ADD(fv.d0, INTERVAL 6 DAY)
)
SELECT
  fv.user_pseudo_id,
  ANY_VALUE(w.platform) AS platform,
  LOGICAL_OR(w.user_id IS NOT NULL) AS entered,
  LOGICAL_OR(w.event_name = 'character_select') AS onboarded,
  LOGICAL_OR(w.event_name IN ({", ".join(f"'{a}'" for a in RESULT_ACTIONS)})) AS activated
FROM fv LEFT JOIN w USING (user_pseudo_id)
WHERE fv.user_pseudo_id NOT IN (SELECT user_pseudo_id FROM persona_pseudo)
GROUP BY 1
"""

GUARD_SQL = f"""
SELECT DATE_TRUNC(PARSE_DATE('%Y%m%d', event_date), WEEK(MONDAY)) AS wk,
  COUNTIF(event_name = 'save_load_failed') AS save_failed,
  COUNTIF(event_name = 'session_start') AS sessions
FROM `{GA4}.events_*`
WHERE _TABLE_SUFFIX BETWEEN '20260907' AND '20261004'
GROUP BY 1 ORDER BY 1
"""

ECON_SQL = f"""
SELECT DATE_TRUNC(DATE(created_at, 'Asia/Seoul'), WEEK(MONDAY)) AS wk,
  COUNT(DISTINCT client_id) AS econ_clients,
  COUNT(DISTINCT IF(amount < 0, client_id, NULL)) AS spenders,
  SUM(amount) AS net_coins
FROM `{RAW}.econ_logs`
WHERE DATE(created_at, 'Asia/Seoul') BETWEEN '2026-09-07' AND '2026-10-04'
  AND platform IN ('web', 'toss')
  AND IFNULL(user_id NOT IN ({PERSONA}), TRUE)
GROUP BY 1 ORDER BY 1
"""


def _counts(raw: str | None) -> dict[str, float]:
    try:
        return {k: v for k, v in json.loads(raw).items() if isinstance(v, (int, float)) and v > 0}
    except (TypeError, ValueError):
        return {}


def person_days() -> pd.DataFrame:
    s = read_sql(SL_SQL)
    s["d"] = pd.to_datetime(s["d"]).dt.date
    s["kv"] = s["counts"].map(_counts)
    for cat, keys in CATEGORY.items():
        s[cat] = s["kv"].map(lambda kv, ks=keys: sum(kv.get(k, 0) for k in ks))
    s = s.sort_values("started_at")
    g = s.groupby(["person", "d"]).agg(
        **{c: (c, "sum") for c in CATEGORY}, last_place=("last_place", "last")
    ).reset_index()
    g["results"] = g[list(CATEGORY)].sum(axis=1)
    g["tended"] = g["results"] > 0
    g["wk"] = [d - pd.Timedelta(days=d.weekday()) for d in g["d"]]
    return g


def l1(pd_df: pd.DataFrame) -> None:
    first_wk = pd_df.groupby("person")["wk"].min()
    by_wk = pd_df.groupby("wk")["person"].apply(set)
    print("[L1 decomposition — calendar weeks, official]")
    print("  week   W(visitors)  F(days/visitor)  Q(tended share)  W*F*Q  tended  NSM/day [95% CI]  new  kept  back  habit(4d+)")
    for wk in WEEKS:
        g = pd_df[pd_df["wk"] == wk]
        per = g.groupby("person").agg(days=("d", "nunique"), tdays=("tended", "sum"))
        W, days, tended = len(per), int(per["days"].sum()), int(per["tdays"].sum())
        F, Q = days / W, tended / days
        boots = [RNG.choice(per["tdays"].to_numpy(), W).sum() / 7 for _ in range(1000)]
        lo, hi = np.percentile(boots, [2.5, 97.5])
        prev = by_wk.get(wk - pd.Timedelta(days=7), set())
        people = set(per.index)
        new = sum(first_wk[p] == wk for p in people)
        kept = len(people & prev)
        back = W - new - kept
        habit = int((per["days"] >= 4).sum())
        print(f"  {wk}  {W:5d}  {F:10.2f}  {Q:13.1%}  {W*F*Q:8.1f}  {tended:5d}  "
              f"{tended/7:5.2f} [{lo:.2f}, {hi:.2f}]  {new:4d} {kept:4d} {back:4d}  {habit} ({habit/W:.0%})")


def l2(pd_df: pd.DataFrame) -> None:
    win = pd_df[(pd_df["d"] >= WEEKS[0]) & (pd_df["d"] <= END)]
    gaps = []
    for _, g in win.groupby("person"):
        ds = sorted(set(g["d"]))
        gaps += [(b - a).days for a, b in zip(ds, ds[1:])]
    gaps = pd.Series(gaps, dtype=float)
    print(f"\n[L2 frequency] visit gap (consecutive visit days, 4 weeks): n={len(gaps)}, "
          f"median {gaps.median():.1f}d, mean {gaps.mean():.1f}d, share next-day {(gaps == 1).mean():.0%}")
    t = win[win["tended"]]
    print(f"[L2 quality] category presence on tended days (n={len(t)}):")
    for cat in CATEGORY:
        print(f"  {cat:8s} {(t[cat] > 0).mean():.0%}")
    e = win[~win["tended"]]
    print(f"[L2 quality] empty-handed visit days n={len(e)} — last_place top 5:")
    print(e["last_place"].fillna("(none)").value_counts().head(5).to_string())


def funnel() -> None:
    f = read_sql(FUNNEL_SQL)
    print("\n[Activation funnel — GA4 cohort, first visit 8/6~9/27, first 7 days, persona excluded]")
    for label, df in [("all", f), ("web", f[f["platform"] == "web"]), ("toss", f[f["platform"] == "toss"])]:
        n = len(df)
        if not n:
            continue
        e = int(df["entered"].sum())
        o = int((df["entered"] & df["onboarded"]).sum())
        a = int((df["entered"] & df["activated"]).sum())
        print(f"  {label:5s} visit {n} → entered {e} ({e/n:.0%}) → onboarded {o} ({o/max(e,1):.0%} of entered) "
              f"→ activated {a} ({a/max(e,1):.0%} of entered, {a/n:.0%} of visits)")
    odd = int((f["activated"] & ~f["onboarded"]).sum())
    print(f"  note: activated without character_select in window = {odd}")


def guards(pd_df: pd.DataFrame) -> None:
    ec = read_sql(ECON_SQL)
    gu = read_sql(GUARD_SQL)
    print("\n[Guardrails + revenue lead]")
    print("  week   empty-handed share  coin net/econ-client  spender share  save_failed/sessions")
    for wk in WEEKS:
        g = pd_df[pd_df["wk"] == wk]
        empty = 1 - g["tended"].mean()
        e = ec[pd.to_datetime(ec["wk"]).dt.date == wk]
        u = gu[pd.to_datetime(gu["wk"]).dt.date == wk]
        net = float(e["net_coins"].iloc[0]) / float(e["econ_clients"].iloc[0]) if len(e) else float("nan")
        sp = float(e["spenders"].iloc[0]) / float(e["econ_clients"].iloc[0]) if len(e) else float("nan")
        sf = f"{int(u['save_failed'].iloc[0])}/{int(u['sessions'].iloc[0])}" if len(u) else "-"
        print(f"  {wk}  {empty:12.0%}  {net:16.0f}  {sp:12.0%}  {sf:>14s}")


def main() -> None:
    pd_df = person_days()
    l1(pd_df)
    l2(pd_df)
    funnel()
    guards(pd_df)


if __name__ == "__main__":
    main()
