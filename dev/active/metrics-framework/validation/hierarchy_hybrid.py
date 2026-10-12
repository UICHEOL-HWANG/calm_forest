"""Metric hierarchy over the full launch period — 10 calendar weeks 2026-07-27 ~ 10-04.

Sources (decision 2026-10-11): session_logs only exists from 2026-08-06 (first commit of the
logger, 58a11f8), so
  - 2026-07-27 ~ 08-05 -> GA4 events (same 16 acquisition actions, same filters)
  - 2026-08-06 ~ 10-04 -> session_logs (official source)
The two are joined on user_id (Supabase uid, guest uid included): a GA4 user_id that appears in
session_logs takes that person's stitched key, so a launch-week player is not re-counted as new
on 8/6. GA4 rows whose user_id never reaches session_logs keep u:<uid> / p:<pseudo>.
Visit day on GA4 = a day the person entered the game (user_id present).
econ_logs also starts 8/6 -> coin guardrails are blank for the first 1.5 weeks.

Run: ml/.venv/bin/python dev/active/metrics-framework/validation/hierarchy_hybrid.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import (  # noqa: E402
    CATEGORY, DEV_CLIENTS, ECON_SQL, FUNNEL_SQL, GUARD_SQL, PERSONA, RAW, SL_SQL, GA4, _counts, read_sql,
)
from nsm_validate import RESULT_ACTIONS  # noqa: E402
from person_key import stitch_person  # noqa: E402

START = pd.Timestamp("2026-07-27").date()   # game launch (Monday)
SL_FROM = pd.Timestamp("2026-08-06").date()  # first session_logs row
END = pd.Timestamp("2026-10-04").date()     # last full week (user decision 2026-10-11)
WEEKS = [START + pd.Timedelta(days=7 * i) for i in range(10)]
FUNNEL_LAST = "2026-09-27"                  # first-visit cohorts with a full 7-day window by 10/4
RNG = np.random.default_rng(20261011)

_EV = lambda names: ", ".join(f"'{e}'" for e in names)  # noqa: E731
_CAT_COLS = ",\n  ".join(f"LOGICAL_OR(event_name IN ({_EV(v)})) AS {k}" for k, v in CATEGORY.items())

GA4_PRE_SQL = f"""
WITH excluded AS (
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
pseudo_uid AS (
  SELECT user_pseudo_id, ANY_VALUE(user_id) AS uid FROM ev WHERE user_id IS NOT NULL
  GROUP BY 1 HAVING COUNT(DISTINCT user_id) = 1
)
SELECT ev.user_pseudo_id, u.uid, ev.d,
  LOGICAL_OR(ev.user_id IS NOT NULL) AS entered,
  LOGICAL_OR(event_name IN ({_EV(RESULT_ACTIONS)})) AS tended,
  {_CAT_COLS}
FROM ev LEFT JOIN pseudo_uid u USING (user_pseudo_id)
WHERE ev.platform IN ('web', 'toss')
  AND ev.d BETWEEN '{START}' AND '{SL_FROM - pd.Timedelta(days=1)}'
  AND ev.user_pseudo_id NOT IN (SELECT user_pseudo_id FROM pseudo_out)
GROUP BY 1, 2, 3
"""


def sl_part() -> tuple[pd.DataFrame, dict[str, str]]:
    s = read_sql(SL_SQL)
    s, report = stitch_person(s)
    print(f"[person key] session_logs stitch — {report}")
    uid_to_person = (s.dropna(subset=["user_id"]).groupby("user_id")["person"]
                     .agg(lambda x: x.value_counts().index[0]).to_dict())
    s["d"] = pd.to_datetime(s["d"]).dt.date
    s["kv"] = s["counts"].map(_counts)
    for cat, keys in CATEGORY.items():
        s[cat] = s["kv"].map(lambda kv, ks=keys: sum(kv.get(k, 0) for k in ks)) > 0
    s = s.sort_values("started_at")
    g = s.groupby(["person", "d"]).agg(**{c: (c, "any") for c in CATEGORY},
                                       last_place=("last_place", "last")).reset_index()
    g["tended"] = g[list(CATEGORY)].any(axis=1)
    g["src"] = "SL"
    return g[(g["d"] >= SL_FROM) & (g["d"] <= END)], uid_to_person


def ga4_part(uid_to_person: dict[str, str]) -> pd.DataFrame:
    e = read_sql(GA4_PRE_SQL)
    e["d"] = pd.to_datetime(e["d"]).dt.date
    e = e[e["entered"]].copy()
    bridged = e["uid"].map(uid_to_person)
    e["person"] = bridged.fillna(e["uid"].map(lambda u: f"u:{u}" if isinstance(u, str) else None))
    e["person"] = e["person"].fillna("p:" + e["user_pseudo_id"])
    n_bridge = e.loc[bridged.notna(), "person"].nunique()
    print(f"[bridge] GA4 launch-week people {e['person'].nunique()} · matched to a session_logs person {n_bridge}")
    g = e.groupby(["person", "d"])[list(CATEGORY) + ["tended"]].any().reset_index()
    g["last_place"] = None
    g["src"] = "GA4"
    return g


def person_days() -> pd.DataFrame:
    sl, uid_map = sl_part()
    df = pd.concat([ga4_part(uid_map), sl], ignore_index=True)
    df["tended"] = df["tended"].astype(bool)
    df["wk"] = [d - pd.Timedelta(days=d.weekday()) for d in df["d"]]
    return df


def l1(pd_df: pd.DataFrame) -> None:
    first_wk = pd_df.groupby("person")["wk"].min()
    by_wk = pd_df.groupby("wk")["person"].apply(set)
    print("\n[L1 decomposition — calendar weeks from launch]  src: GA4 until 8/5, session_logs from 8/6")
    print("  week        W   F     Q      W*F*Q tended  NSM/day [95% CI]     new kept back  power(4d+)  src")
    for wk in WEEKS:
        g = pd_df[pd_df["wk"] == wk]
        per = g.groupby("person").agg(days=("d", "nunique"), tdays=("tended", "sum"))
        W, days, tended = len(per), int(per["days"].sum()), int(per["tdays"].sum())
        F, Q = days / W, tended / days
        boots = [RNG.choice(per["tdays"].to_numpy(), W).sum() / 7 for _ in range(1000)]
        lo, hi = np.percentile(boots, [2.5, 97.5])
        people = set(per.index)
        new = sum(first_wk[p] == wk for p in people)
        kept = len(people & by_wk.get(wk - pd.Timedelta(days=7), set()))
        back = W - new - kept
        power = int((per["days"] >= 4).sum())
        src = "+".join(sorted(g["src"].unique()))
        print(f"  {wk}  {W:3d}  {F:.2f}  {Q:5.1%}  {W*F*Q:6.1f}  {tended:4d}  {tended/7:5.2f} [{lo:.2f}, {hi:.2f}]"
              f"  {new:3d} {kept:4d} {back:4d}  {power:3d} ({power/W:.0%})  {src}")
    tot = int(pd_df["tended"].sum())
    print(f"  10 weeks: acquired user-days {tot} · mean NSM {tot / 70:.2f}/day · people {pd_df['person'].nunique()}")


def l2(pd_df: pd.DataFrame) -> None:
    gaps = []
    for _, g in pd_df.groupby("person"):
        ds = sorted(set(g["d"]))
        gaps += [(b - a).days for a, b in zip(ds, ds[1:])]
    gaps = pd.Series(gaps, dtype=float)
    print(f"\n[L2 frequency] visit gap, 10 weeks: n={len(gaps)}, median {gaps.median():.1f}d, "
          f"share next-day {(gaps == 1).mean():.0%}")
    t = pd_df[pd_df["tended"]]
    print(f"[L2 quality] category presence on acquired days (n={len(t)}): "
          + " · ".join(f"{c} {t[c].mean():.0%}" for c in CATEGORY))
    e = pd_df[(~pd_df["tended"]) & (pd_df["src"] == "SL")]
    top = e["last_place"].fillna("(none)").value_counts()
    print(f"[L2 quality] no-acquisition visit days (session_logs part, n={len(e)}) last place: "
          + " · ".join(f"{k} {v}" for k, v in top.head(4).items()))


def funnel() -> None:
    sql = FUNNEL_SQL.replace("BETWEEN '2026-08-06' AND '2026-09-27'", f"BETWEEN '{START}' AND '{FUNNEL_LAST}'")
    assert sql != FUNNEL_SQL, "funnel window placeholder not found"
    f = read_sql(sql)
    f["platform"] = f["platform"].fillna("web")
    f = f[f["platform"].isin(["web", "toss"])]
    print(f"\n[Activation funnel — GA4 cohort, first visit {START}~{FUNNEL_LAST}, first 7 days]")
    for label, df in [("all", f)] + [(p, f[f["platform"] == p]) for p in ("web", "toss")]:
        n = len(df)
        e = int(df["entered"].sum())
        o = int((df["entered"] & df["onboarded"]).sum())
        a = int((df["entered"] & df["activated"]).sum())
        print(f"  {label:5s} visit {n} → entered {e} ({e/n:.0%}) → onboarded {o} ({o/max(e,1):.0%}) "
              f"→ first acquisition {a} ({a/max(e,1):.0%} of entered)")


def guards(pd_df: pd.DataFrame) -> None:
    ec = read_sql(ECON_SQL.replace("BETWEEN '2026-09-07' AND '2026-10-04'", f"BETWEEN '{START}' AND '{END}'"))
    gu = read_sql(GUARD_SQL.replace("BETWEEN '20260907' AND '20261004'", f"BETWEEN '{START:%Y%m%d}' AND '{END:%Y%m%d}'"))
    print("\n[Guardrails + revenue lead]  (econ_logs from 8/6 · save_load_failed from 9/14)")
    print("  week        no-acq share  coin net/econ-client  spender share  unrecovered/failed")
    for wk in WEEKS:
        g = pd_df[pd_df["wk"] == wk]
        e = ec[pd.to_datetime(ec["wk"]).dt.date == wk]
        u = gu[pd.to_datetime(gu["wk"]).dt.date == wk]
        net = f"{float(e['net_coins'].iloc[0]) / float(e['econ_clients'].iloc[0]):.0f}" if len(e) else "-"
        sp = f"{float(e['spenders'].iloc[0]) / float(e['econ_clients'].iloc[0]):.0%}" if len(e) else "-"
        sf = f"{int(u['save_failed'].iloc[0])}/{int(u['failed_sessions'].iloc[0])}" if len(u) else "-"
        print(f"  {wk}  {1 - g['tended'].mean():10.0%}  {net:>16s}  {sp:>12s}  {sf:>12s}")


def main() -> None:
    pd_df = person_days()
    l1(pd_df)
    l2(pd_df)
    funnel()
    guards(pd_df)


if __name__ == "__main__":
    main()
