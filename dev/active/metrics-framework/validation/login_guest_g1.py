"""C6 G1 — data reliability for login-at-entry vs guest (pre-registration: login-guest-prereg.md).

Builds the web entrant table ONCE with the entry-session login methods. Does NOT compute revisit (G2).
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/login_guest_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from first5min_b3 import ENTRY_SQL  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402

ACCOUNT = ("google", "email", "apple")

SQL = f"""
WITH c AS ({ENTRY_SQL}),
l AS (
  SELECT user_pseudo_id AS pid, event_name,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'method') AS method
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND event_name IN ('login', 'guest_migrate')
)
SELECT c.person, c.platform, c.d0, c.sec,
  STRING_AGG(DISTINCT IF(l.event_name = 'login', l.method, NULL)) AS methods,
  COUNTIF(l.event_name = 'login') AS n_login
FROM c LEFT JOIN l ON l.pid = c.entry_pid AND l.sid = c.entry_sid
GROUP BY 1, 2, 3, 4
"""


def groups(p: pd.DataFrame) -> pd.Series:
    def g(m: str | None) -> str:
        ms = set(m.split(",")) - {""} if isinstance(m, str) else set()
        if ms & set(ACCOUNT):
            return "account"
        if ms == {"anonymous"}:
            return "guest"
        return "other" if ms else "no_login_event"
    return p.methods.map(g)


def main() -> None:
    p = read_sql(SQL).sort_values("person").reset_index(drop=True)
    print(f"[1] cohort n={len(p)} · platform: {p.platform.value_counts(dropna=False).to_dict()}")
    w = p[p.platform == "web"].copy()
    w["grp"] = groups(w)
    print(f"[2] web n={len(w)} · groups (cell sizes only): {w.grp.value_counts().to_dict()}")
    print(f"    method combos in entry session: {w.methods.fillna('(none)').value_counts().to_dict()}")
    a5 = w.sec.notna() & (w.sec <= 300)
    print(f"[3] C6-b cells (acquired ≤5 min) — sizes only: {w[a5].grp.value_counts().to_dict()}")
    print(f"[4] revisit window: latest first entry {pd.to_datetime(w.d0).max().date()} + 7 days ≤ data end 2026-10-11")
    gm = read_sql(f"SELECT MIN(_TABLE_SUFFIX) d0, COUNT(DISTINCT user_pseudo_id) dev FROM `{GA4}.events_*` "
                  f"WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND event_name = 'guest_migrate'")
    print(f"[5] guest_migrate first day {gm.d0[0]} · devices {gm.dev[0]} (secondary metric only)")


if __name__ == "__main__":
    main()
