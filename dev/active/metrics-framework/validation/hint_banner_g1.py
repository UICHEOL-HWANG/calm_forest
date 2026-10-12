"""Hint banner A/B G1 — data reliability (pre-registration: hint-banner-ab-prereg.md, fixed 2026-10-08).

Builds the session table ONCE with the pre-registered exclusions. Does NOT compute revisit (G2 after 10/14).
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/hint_banner_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import binomtest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import RAW, read_sql  # noqa: E402

SQL = f"""
WITH ce AS (
  SELECT session_id, client_id, variant, arm, origin, `at` AS at_ts
  FROM `{RAW}.churn_events`
  WHERE intervene AND DATE(`at`, 'Asia/Seoul') BETWEEN '2026-09-06' AND '2026-10-06'
),
sl AS (
  SELECT session_id, user_id, is_guest, client_id, started_at, updated_at
  FROM `{RAW}.session_logs`
  QUALIFY ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) = 1
),
p1 AS (   -- persona P1 rule fixed in the pre-registration
  SELECT user_id FROM `{RAW}.session_logs` WHERE user_id IS NOT NULL GROUP BY 1
  HAVING COUNT(DISTINCT client_id) >= 4 AND MIN(DATE(started_at, 'Asia/Seoul')) >= '2026-09-28'
)
SELECT ce.session_id,
  ANY_VALUE(ce.client_id) AS client_id,
  COUNT(DISTINCT ce.arm) AS n_arms, ANY_VALUE(ce.arm) AS arm,
  MIN(ce.at_ts) AS t0,
  LOGICAL_OR(IFNULL(ce.origin, '') = '' OR ce.origin LIKE 'http://localhost%' OR ce.origin LIKE 'http://127.0.0.1%') AS bad_origin,
  LOGICAL_OR(IFNULL(ce.variant, '') IN ('beta_A', 'beta_B')) AS beta,
  LOGICAL_OR(ce.origin LIKE '%itch.%') AS itch,
  ANY_VALUE(sl.user_id) AS sl_user, ANY_VALUE(sl.is_guest) AS sl_guest,
  LOGICAL_OR(sl.session_id IS NOT NULL) AS in_sl,
  LOGICAL_OR(sl.user_id IN (SELECT user_id FROM p1)) AS persona
FROM ce LEFT JOIN sl USING (session_id)
GROUP BY 1
"""


def main() -> None:
    d = read_sql(SQL)
    for c in ("bad_origin", "beta", "itch", "in_sl", "persona"):
        d[c] = d[c].fillna(False).astype(bool)
    d["t0"] = pd.to_datetime(d["t0"], utc=True)
    last = pd.to_datetime(read_sql(f"SELECT MAX(updated_at) m FROM `{RAW}.session_logs`").m[0], utc=True)
    print(f"[1] sessions with ≥1 intervene in 9/6~10/6: {len(d)} · session_logs last data {last.tz_convert('Asia/Seoul'):%Y-%m-%d %H:%M} KST")
    steps = [("bad origin (localhost/empty)", d.bad_origin), ("beta", d.beta), ("persona P1", d.persona),
             ("itch", d.itch), ("mixed arm", d.n_arms > 1)]
    keep = pd.Series(True, index=d.index)
    for name, m in steps:
        drop = keep & m
        print(f"    − {name}: {int(drop.sum())}")
        keep &= ~m
    k = d[keep].copy()
    print(f"    = eligible {len(k)} · by arm {k.arm.value_counts().to_dict()}")

    obs_now = k.t0 <= last - pd.Timedelta(days=7)
    cutoff_1014 = pd.Timestamp("2026-10-14 00:00", tz="Asia/Seoul") - pd.Timedelta(days=1)   # data lag ~1 day
    obs_1014 = k.t0 <= cutoff_1014 - pd.Timedelta(days=7)
    print(f"[2] 7-day observation secured — now: {int(obs_now.sum())} · by 10/14 (data to ~10/13): {int(obs_1014.sum())} of {len(k)}")

    a = k[obs_1014]
    t = int((a.arm == "treat").sum()); c = int((a.arm == "control").sum())
    print(f"[3] arm balance (10/14 sample): treat {t} · control {c} · binomial p = {binomtest(t, t + c, .5).pvalue:.3f}"
          f" · other arm labels: {sorted(set(a.arm) - {'treat', 'control'})}")

    print(f"[4] linkage: in session_logs {int(a.in_sl.sum())}/{len(a)} · logged-in key {int(a.sl_guest.fillna(True).astype(bool).eq(False).sum())}"
          f" · guest/unlinked → client key {len(a) - int(a.sl_guest.fillna(True).astype(bool).eq(False).sum())}")
    logged = a.sl_guest.fillna(True).astype(bool).eq(False).to_numpy()
    res = np.where(logged, "u:" + a.sl_user.astype(str), "c:" + a.client_id.astype(str))
    vc = pd.Series(res).value_counts()
    print(f"    residents {len(vc)} · sessions per resident median {vc.median():.0f} · max {vc.max()} · residents with ≥5 sessions {int((vc >= 5).sum())}")

    print("[5] minimum detectable effect (two-sided α .05, power .8, session level, ignoring clustering):")
    n = min(t, c)
    for p0 in (.2, .3, .4):
        mde = (1.96 + .8416) * np.sqrt(2 * p0 * (1 - p0) / n)
        print(f"    baseline {p0:.0%}: ≈ ±{mde * 100:.0f}%p")


if __name__ == "__main__":
    main()
