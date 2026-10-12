"""LTV early prediction G1 — data reliability (pre-registration: ltv-early-prereg.md).

Builds the person table ONCE: day-0 features + y (acquired days on days 1~28), same person rules as
ltv_engagement.GA4_SQL. Does NOT fit any model (G2). Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/ltv_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ltv_engagement import GA4_SQL  # noqa: E402
from first5min_b3 import ENTRY_SQL  # noqa: E402
from first5min_r_g1 import _CAT  # noqa: E402
from hierarchy_baseline import read_sql  # noqa: E402

C0, C1 = "2026-07-27", "2026-09-13"     # first entry window (28-day follow-up ends 10/11)
FEATURES = ["acq_d0", "n_acq_d0", "n_cat_d0", "acq5", "sessions_d0", "stay_min_d0",
            "coach_d0", "account_d0", "toss", "spend_d0"]

_EV_PARAMS = """IFNULL((SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform'), 'web') AS platform,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid,
    (SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'amount') AS amount,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'method') AS method,
    CASE {cat} END AS cat"""


def person_day_sql() -> str:
    head, _ = GA4_SQL.split("SELECT IF(a.acct IS NOT NULL", 1)
    old = "IFNULL((SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform'), 'web') AS platform"
    assert head.count(old) == 1
    head = head.replace(old, _EV_PARAMS.format(cat=_CAT.replace("e.event_name", "event_name")))
    return head + """SELECT IF(a.acct IS NOT NULL, CONCAT('u:', a.acct), CONCAT('p:', ev.user_pseudo_id)) AS person, ev.d,
  LOGICAL_OR(ev.cat IS NOT NULL) AS tended,
  COUNTIF(ev.cat IS NOT NULL) AS n_acq,
  COUNT(DISTINCT ev.cat) AS n_cat,
  LOGICAL_OR(ev.user_id IS NOT NULL) AS entered,
  LOGICAL_OR(ev.platform = 'toss') AS toss,
  COUNT(DISTINCT IF(ev.sid IS NOT NULL, FORMAT('%s|%d', ev.user_pseudo_id, ev.sid), NULL)) AS sessions,
  (MAX(ev.event_timestamp) - MIN(ev.event_timestamp)) / 6e7 AS stay_min,
  LOGICAL_OR(ev.event_name = 'tutorial_start') AS coach,
  LOGICAL_OR(ev.event_name = 'login' AND ev.method IN ('google', 'email', 'apple')) AS account,
  LOGICAL_OR(ev.event_name = 'econ_tx' AND ev.amount < 0) AS spend
FROM ev LEFT JOIN pseudo_acct a USING (user_pseudo_id)
WHERE ev.platform IN ('web', 'toss') AND ev.d >= '2026-07-27'
  AND ev.user_pseudo_id NOT IN (SELECT user_pseudo_id FROM pseudo_out)
GROUP BY 1, 2
"""


def build() -> pd.DataFrame:
    days = read_sql(person_day_sql())
    days["d"] = pd.to_datetime(days["d"])
    ent = days[days.entered.fillna(False).astype(bool)]
    d0 = ent.groupby("person").d.min().rename("d0")
    coh = d0[(d0 >= C0) & (d0 <= C1)]
    x = days[days.person.isin(coh.index)].merge(coh, left_on="person", right_index=True)
    x["k"] = (x.d - x.d0).dt.days
    f = x[x.k == 0].set_index("person")
    y = x[(x.k >= 1) & (x.k <= 28) & x.tended.fillna(False).astype(bool)].groupby("person").size()
    t = read_sql(f"SELECT person, sec FROM ({ENTRY_SQL})").set_index("person").sec
    p = pd.DataFrame(index=coh.index.sort_values())
    p["acq_d0"] = f.tended.reindex(p.index).fillna(False).astype(int)
    p["n_acq_d0"] = f.n_acq.reindex(p.index).fillna(0)
    p["n_cat_d0"] = f.n_cat.reindex(p.index).fillna(0)
    p["acq5"] = (t.reindex(p.index) <= 300).fillna(False).astype(int)
    p["sessions_d0"] = f.sessions.reindex(p.index).fillna(0)
    p["stay_min_d0"] = f.stay_min.reindex(p.index).fillna(0)
    p["coach_d0"] = f.coach.reindex(p.index).fillna(False).astype(int)
    p["account_d0"] = f.account.reindex(p.index).fillna(False).astype(int)
    p["toss"] = x.groupby("person").toss.any().reindex(p.index).fillna(False).astype(int)
    p["spend_d0"] = f.spend.reindex(p.index).fillna(False).astype(int)
    p["y"] = y.reindex(p.index).fillna(0).astype(int)
    p["in_entry_cohort"] = p.index.isin(t.index)
    return p


def main() -> None:
    p = build()
    print(f"[1] cohort (first entry {C0}~{C1}) n = {len(p)} (expected 160)")
    print(f"[2] y = acquired days on days 1~28: >0 for {int((p.y > 0).sum())} · distribution {p.y.value_counts().sort_index().to_dict()}")
    print(f"[3] person key join with first-5-min cohort (for acq5): {int(p.in_entry_cohort.sum())}/{len(p)}")
    print("[4] day-0 feature summary (mean · share non-zero):")
    for c in FEATURES:
        print(f"    {c:12} mean {p[c].mean():7.2f} · non-zero {(p[c] > 0).mean():.0%}")
    print(f"[5] leakage check: features use day 0 only (k == 0); y uses days 1~28 · stay_min max {p.stay_min_d0.max():.0f} min")


if __name__ == "__main__":
    main()
