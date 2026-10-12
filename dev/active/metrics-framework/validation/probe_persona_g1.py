"""X2-P G1 — persona plays per game: counts, ease coverage, arm balance, cooking stage parse (no outcome).
Pre-registration: probe-persona-prereg.md. Persona ids from Supabase (memory only). Aggregates only.
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/probe_persona_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from probe_g1 import GAME, persona_ids  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402


def main() -> None:
    lit = ", ".join(f"'{p}'" for p in persona_ids())
    sql = f"""
    WITH ev AS (
      SELECT user_id, event_name,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'arm') AS arm,
        (SELECT COALESCE(value.double_value, CAST(value.int_value AS FLOAT64)) FROM UNNEST(event_params) WHERE key = 'ease') AS ease,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'probe_v') AS pv,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'eases') AS eases,
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'stage_scores') AS stage_scores,
        {GAME} AS game
      FROM `{GA4}.events_*`
      WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND _TABLE_SUFFIX >= '20260923' AND user_id IN ({lit})
    )
    SELECT game, COUNT(DISTINCT user_id) accounts, COUNT(*) plays,
      COUNTIF(arm = 0) a0, COUNTIF(arm = 1) a1, COUNTIF(arm = 2) a2,
      COUNTIF(ease IS NULL) ease_null, COUNTIF(pv = 2) probe_v2,
      COUNTIF(eases IS NOT NULL) has_eases, COUNTIF(stage_scores IS NOT NULL) has_stage_scores
    FROM ev WHERE game IS NOT NULL GROUP BY 1 ORDER BY 1
    """
    d = read_sql(sql)
    print(d.to_string(index=False))
    for _, r in d.iterrows():
        arms = [r.a0, r.a1, r.a2]
        bal = max(arms) <= 2 * max(1, min(arms)) if sum(arms) else None
        print(f"  {r.game}: ease null {r.ease_null / r.plays:.1%} · arm balance {'OK' if bal else 'n/a' if bal is None else 'BROKEN'}")


if __name__ == "__main__":
    main()
