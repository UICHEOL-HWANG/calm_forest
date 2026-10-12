"""Anomaly detection G1 — data reliability (pre-registration: anomaly-detection-prereg.md).

Builds the daily raw/official series ONCE and checks they are measurable and that the two ground-truth
incidents are really present in the raw data. Does NOT run any control chart (that is G2).
Persona IDs come from Supabase (email pattern) and stay in memory. Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/anomaly_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import DEV_CLIENTS, RAW, read_sql  # noqa: E402
from probe_g1 import persona_ids  # noqa: E402

START, END = "2026-08-06", "2026-10-11"
I1 = (pd.Timestamp("2026-10-02"), pd.Timestamp("2026-10-09"))   # persona runs, KST dates
I2 = (pd.Timestamp("2026-09-09"), pd.Timestamp("2026-09-15"))   # beta bundle
BETA = "IFNULL(variant, '') IN ('beta_A', 'beta_B') AND {d} BETWEEN '2026-09-09' AND '2026-09-15'"


def series(pids: list[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    lit = ", ".join(f"'{p}'" for p in pids) or "''"
    sl = read_sql(f"""
    WITH s AS (
      SELECT *, DATE(started_at, 'Asia/Seoul') AS d FROM `{RAW}.session_logs`
      QUALIFY ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) = 1
    )
    SELECT d,
      COUNT(DISTINCT client_id) AS raw_devices,
      COUNT(DISTINCT IF(IFNULL(user_id IN ({lit}), FALSE), client_id, NULL)) AS persona_devices,
      COUNT(DISTINCT IF(platform IN ('web', 'toss') AND NOT IFNULL(user_id IN ({lit}), FALSE)
        AND client_id NOT IN ({DEV_CLIENTS}) AND NOT ({BETA.format(d='d')}), client_id, NULL)) AS official_devices,
      COUNTIF(client_id IS NULL) AS null_client_rows, COUNT(*) AS sessions
    FROM s WHERE d BETWEEN '{START}' AND '{END}' GROUP BY 1 ORDER BY 1""")
    ec = read_sql(f"""
    WITH e AS (SELECT *, DATE(created_at, 'Asia/Seoul') AS d FROM `{RAW}.econ_logs`)
    SELECT d,
      SUM(amount) AS raw_net, COUNT(DISTINCT client_id) AS raw_dev,
      COUNTIF({BETA.format(d='d')}) AS beta_rows,
      COUNTIF(IFNULL(variant, '') IN ('beta_A', 'beta_B')) AS beta_tag_rows_any_date,
      SUM(IF(platform IN ('web', 'toss') AND NOT IFNULL(user_id IN ({lit}), FALSE)
        AND IFNULL(client_id NOT IN ({DEV_CLIENTS}), TRUE) AND NOT ({BETA.format(d='d')}), amount, 0)) AS off_net,
      COUNT(DISTINCT IF(platform IN ('web', 'toss') AND NOT IFNULL(user_id IN ({lit}), FALSE)
        AND IFNULL(client_id NOT IN ({DEV_CLIENTS}), TRUE) AND NOT ({BETA.format(d='d')}), client_id, NULL)) AS off_dev,
      COUNTIF(client_id IS NULL) AS null_client_rows, COUNT(*) AS n_rows
    FROM e WHERE d BETWEEN '{START}' AND '{END}' GROUP BY 1 ORDER BY 1""")
    for df in (sl, ec):
        df["d"] = pd.to_datetime(df["d"])
    return sl, ec


def inside(d: pd.Series, w: tuple[pd.Timestamp, pd.Timestamp]) -> pd.Series:
    return (d >= w[0]) & (d <= w[1])


def main() -> None:
    pids = persona_ids()
    print(f"persona accounts (email pattern): {len(pids)}")
    sl, ec = series(pids)
    days = pd.date_range(START, END)
    print(f"\n[1] coverage {START}~{END} = {len(days)} days")
    print(f"    M1 session_logs days with rows = {sl.d.nunique()} · missing = {len(set(days) - set(sl.d))}")
    print(f"    M2 econ_logs days with rows = {ec.d.nunique()} · missing = {len(set(days) - set(ec.d))}"
          f" · days with 0 official econ devices = {(ec.off_dev == 0).sum()}")

    print("\n[2] ground truth I1 (persona) present in raw M1?")
    for lab, m in (("inside I1", inside(sl.d, I1)), ("outside I1", ~inside(sl.d, I1))):
        q = sl[m]
        print(f"    {lab}: days {len(q)} · days with persona devices {int((q.persona_devices > 0).sum())}"
              f" · persona devices/day median {q.persona_devices.median():.0f}")

    print("\n[3] ground truth I2 (beta) present in raw M2?")
    print(f"    beta-tagged econ rows inside I2 = {int(ec[inside(ec.d, I2)].beta_rows.sum())}"
          f" · beta-tagged rows on dates outside I2 = {int(ec[~inside(ec.d, I2)].beta_tag_rows_any_date.sum())}")

    print("\n[4] keys")
    print(f"    session_logs rows with null client_id = {int(sl.null_client_rows.sum())} / {int(sl.sessions.sum())}")
    print(f"    econ_logs rows with null client_id = {int(ec.null_client_rows.sum())} / {int(ec.n_rows.sum())}")

    print("\n[5] official series computable (negative control): "
          f"M1 official days > 0 = {(sl.official_devices > 0).sum()}/{len(sl)} · "
          f"M2 official days with devices = {(ec.off_dev > 0).sum()}/{len(ec)}")
    print(f"\n[6] warm-up: first 14 days end {(pd.Timestamp(START) + pd.Timedelta(days=13)).date()} — "
          f"I2 starts {I2[0].date()} ({(I2[0] - pd.Timestamp(START)).days} days after start)")


if __name__ == "__main__":
    main()
