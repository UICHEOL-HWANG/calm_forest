"""H-N1 G1 — data reliability for the Toss mTLS outage DiD (pre-registration: toss-outage-did-prereg.md).

Builds the device table ONCE and runs every G1 check on it. Does NOT compute the primary
outcome (entry rate) — that is G2/analysis. Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/toss_outage_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import DEV_CLIENTS, PERSONA, RAW, GA4, read_sql  # noqa: E402

OUTAGE_START, FIX, POST_END = "2026-09-05 14:13:00", "2026-09-13 18:30:00", "2026-09-22 02:47:00"

SQL = f"""
WITH ev AS (
  SELECT user_pseudo_id, user_id, event_name,
    DATETIME(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS t,
    (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform') AS up,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result') AS tc_result
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$')        -- daily tables only (no intraday duplicates)
),
excluded_uid AS (
  SELECT user_id FROM ({PERSONA})
  UNION DISTINCT
  SELECT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL
),
uid_first AS (SELECT user_id, MIN(t) AS first_seen FROM ev WHERE user_id IS NOT NULL GROUP BY 1)
SELECT ev.user_pseudo_id,
  MIN(IF(ev.event_name = 'first_visit', ev.t, NULL)) AS fv,
  MIN(ev.t) AS first_any,
  LOGICAL_OR(ev.up = 'toss') AS toss,
  LOGICAL_OR(ev.up IN ('itch', 'android', 'ios')) AS other_platform,
  LOGICAL_OR(ev.user_id IN (SELECT user_id FROM excluded_uid)) AS excluded,
  LOGICAL_OR(ev.event_name = 'toss_connect') AS tc,
  LOGICAL_OR(ev.event_name = 'toss_connect' AND ev.tc_result = 'fail') AS tc_fail,
  LOGICAL_OR(ev.event_name = 'toss_connect' AND ev.tc_result = 'ok') AS tc_ok,
  MIN(u.first_seen) AS acct_first_seen     -- earliest appearance of any account this device used
FROM ev LEFT JOIN uid_first u USING (user_id)
GROUP BY 1
"""


def build() -> pd.DataFrame:
    d = read_sql(SQL)
    for c in ("fv", "first_any", "acct_first_seen"):
        d[c] = pd.to_datetime(d[c])
    d = d[d["fv"].notna()].copy()
    for c in ("toss", "other_platform", "excluded", "tc", "tc_fail", "tc_ok"):   # SQL NULL (no tag / no account) -> False
        d[c] = d[c].fillna(False).astype(bool)
    o, f, p = (pd.Timestamp(x) for x in (OUTAGE_START, FIX, POST_END))
    d["period"] = pd.cut(d["fv"], [pd.Timestamp("2000-01-01"), o, f, p, pd.Timestamp("2100-01-01")],
                         labels=["pre", "outage", "post", "later"], right=False)
    d["plat"] = d["toss"].map({True: "toss", False: "web"})
    d["old_account"] = d["acct_first_seen"] < d["fv"] - pd.Timedelta(minutes=1)
    d["kept"] = ~d["excluded"] & ~d["other_platform"] & ~d["old_account"]
    return d


def main() -> None:
    d = build()
    w = d[d["period"].isin(["outage", "post"])]
    print("[1] cells — first_visit in window (before / after exclusions)")
    g = w.groupby(["plat", "period"], observed=True)
    print(pd.DataFrame({
        "all": g.size(), "persona_dev": g["excluded"].sum(), "other_platform": g["other_platform"].sum(),
        "old_account_new_device": g["old_account"].sum(), "kept": g["kept"].sum(),
    }).to_string())
    t = w[w["plat"] == "toss"]
    print("\n[2] treatment check — toss devices (all, before exclusions)")
    print(t.groupby("period", observed=True)[["tc", "tc_fail", "tc_ok"]].sum().assign(n=t.groupby("period", observed=True).size()).to_string())
    k = t[t["kept"]]
    print("\n[3] kept toss devices without any toss_connect event, by period")
    print(k.groupby("period", observed=True)["tc"].agg(n="size", with_tc="sum").assign(without_tc=lambda x: x.n - x.with_tc).to_string())
    print("\n[4] platform tag: toss_connect devices lacking a toss user_property =",
          int((d["tc"] & ~d["toss"]).sum()))


if __name__ == "__main__":
    main()
