"""E3 space link — baseline for the pre-registration (no treatment exists yet; descriptive only).

Trigger population: real new devices (persona/dev/beta excluded, same rules as space_vs_minigame.py) whose first
fish catch (fishing_catch or sea_catch) happens on KST day T. Both arms are identical until that moment, so the
trigger subset is unbiased. Outcome: any event on T+1..T+7. Only triggers with T <= 2026-10-08 (window closed).
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/e3_baseline.py
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from hierarchy_baseline import DEV_CLIENTS, RAW, GA4, read_sql  # noqa: E402
from probe_g1 import persona_ids  # noqa: E402
from first5min_segments import wilson  # noqa: E402

LAST_T = "2026-10-08"
LIFT = 0.15


def sql(pids: list[str]) -> str:
    lit = ", ".join(f"'{p}'" for p in pids) or "''"
    return f"""
WITH ev AS (
  SELECT user_pseudo_id AS pid, user_id, event_name,
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS day,
    (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'ab_variant') AS ab,
    (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform') AS platform
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND user_pseudo_id IS NOT NULL
),
dev_users AS (
  SELECT DISTINCT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL
),
dev AS (
  SELECT pid, MIN(day) AS d0,
    MIN(IF(event_name IN ('fishing_catch', 'sea_catch'), day, NULL)) AS t,
    LOGICAL_OR(user_id IN ({lit})) AS persona,
    LOGICAL_OR(user_id IN (SELECT user_id FROM dev_users)) AS developer,
    LOGICAL_OR(REGEXP_CONTAINS(COALESCE(ab, ''), r'^beta_[AB]$')) AS beta,
    COALESCE(LOGICAL_OR(platform = 'toss'), FALSE) AS toss
  FROM ev GROUP BY 1
)
SELECT d.d0, d.t, d.toss,
  COUNTIF(e.day BETWEEN DATE_ADD(d.t, INTERVAL 1 DAY) AND DATE_ADD(d.t, INTERVAL 7 DAY)) > 0 AS returned
FROM dev d JOIN ev e USING (pid)
WHERE d.t IS NOT NULL AND d.t <= DATE '{LAST_T}' AND NOT d.persona AND NOT d.developer AND NOT d.beta
GROUP BY d.pid, 1, 2, 3
"""


def n_per_arm(p0: float, p1: float) -> int:
    za, zb = 1.959964, 0.841621
    pbar = (p0 + p1) / 2
    num = (za * math.sqrt(2 * pbar * (1 - pbar)) + zb * math.sqrt(p0 * (1 - p0) + p1 * (1 - p1))) ** 2
    return math.ceil(num / (p1 - p0) ** 2)


def main() -> None:
    d = read_sql(sql(persona_ids()))
    d["t"] = pd.to_datetime(d["t"])
    k, n = int(d.returned.sum()), len(d)
    lo, hi = wilson(k, n)
    print(f"triggered devices {n} · return T+1~7 {k}/{n} = {k / n:.0%} [{lo:.0%},{hi:.0%}]")
    print(f"same-day trigger (T = d0): {(d.t == pd.to_datetime(d.d0)).mean():.0%}")
    for name, g in (("web", d[~d.toss]), ("toss", d[d.toss])):
        print(f"  {name}: {int(g.returned.sum())}/{len(g)} = {g.returned.mean():.0%}")
    recent = d[d.t >= pd.Timestamp("2026-09-15")]
    weeks = (pd.Timestamp(LAST_T) - pd.Timestamp("2026-09-15")).days / 7 + 1 / 7
    rate = len(recent) / weeks
    print(f"triggers per week since 9/15: {rate:.1f}")
    p0 = k / n
    m = n_per_arm(p0, p0 + LIFT)
    print(f"n per arm for {p0:.0%} -> {p0 + LIFT:.0%} (alpha .05 two-sided, power .8): {m} · total {2 * m} · "
          f"weeks at current rate {2 * m / rate:.0f}")


if __name__ == "__main__":
    main()
