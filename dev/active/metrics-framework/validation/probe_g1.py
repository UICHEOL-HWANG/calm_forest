"""X2 difficulty probe — G1: how many real players and plays remain per game and arm (no outcome computed).
Persona accounts are taken from Supabase auth.users by email pattern (kept in memory only, never written).
Dev devices = churn_events localhost clients. Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/probe_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from hierarchy_baseline import DEV_CLIENTS, RAW, GA4, read_sql  # noqa: E402
from calm_ml import db  # noqa: E402

GAME = """CASE WHEN event_name IN ('fishing_catch','fishing_miss') THEN 'fish'
  WHEN event_name IN ('sea_catch','sea_miss') THEN 'sea'
  WHEN event_name IN ('mist_soothe','mist_soothe_miss') THEN 'mist'
  WHEN event_name = 'cooking_result' THEN 'cook' END"""


def persona_ids() -> list[str]:
    conn = db.connect()
    try:
        rows = conn.run("select id::text from auth.users where email like 'persona-%'")
    finally:
        conn.close()
    return [r[0] for r in rows]


def main() -> None:
    pids = persona_ids()
    print(f"persona accounts (email pattern): {len(pids)}")
    lit = ", ".join(f"'{p}'" for p in pids) or "''"
    sql = f"""
    WITH ev AS (
      SELECT user_pseudo_id, user_id, event_name,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'arm') AS arm,
        {GAME} AS game
      FROM `{GA4}.events_*`
      WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND _TABLE_SUFFIX >= '20260923'
    ),
    bad AS (
      SELECT DISTINCT user_pseudo_id FROM ev WHERE user_id IN ({lit})
      UNION DISTINCT
      SELECT DISTINCT user_pseudo_id FROM ev WHERE user_id IN (
        SELECT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL)
    )
    SELECT game, IF(user_pseudo_id IN (SELECT user_pseudo_id FROM bad), 'excluded', 'kept') AS who,
      COUNT(DISTINCT user_pseudo_id) AS devices,
      COUNTIF(arm = 0) AS arm0, COUNTIF(arm = 1) AS arm1, COUNTIF(arm = 2) AS arm2, COUNT(*) AS plays
    FROM ev WHERE game IS NOT NULL
    GROUP BY 1, 2 ORDER BY 1, 2
    """
    print(read_sql(sql).to_string(index=False))


if __name__ == "__main__":
    main()
