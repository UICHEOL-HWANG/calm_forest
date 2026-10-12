"""Web entry G1 — data reliability (pre-registration: web-entry-hypotheses.md).

Builds the device table ONCE and runs every G1 check on it. Does NOT compute W1~W4 outcomes
(screen-reach share among non-entrants, dwell values, entry rates by group) — that is G2.
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/web_entry_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import DEV_CLIENTS, PERSONA, RAW, GA4, read_sql  # noqa: E402

START, END = "2026-09-04", "2026-10-12"   # first_visit window [START, END)

SQL = f"""
WITH ev AS (
  SELECT user_pseudo_id, user_id, event_name, event_timestamp AS ts,
    DATETIME(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS t,
    (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform') AS up,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'platform') AS ep,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'reason') AS reason,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result') AS result,
    (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'engagement_time_msec') AS eng,
    device.category AS cat, device.web_info.browser AS br
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$')        -- daily tables only
),
excluded_uid AS (
  SELECT user_id FROM ({PERSONA})
  UNION DISTINCT
  SELECT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL
),
uid_first AS (SELECT user_id, MIN(t) AS first_seen FROM ev WHERE user_id IS NOT NULL GROUP BY 1),
scr AS (   -- first no_session login screen per device
  SELECT user_pseudo_id, MIN(ts) AS scr_ts FROM ev
  WHERE event_name = 'login_screen' AND reason = 'no_session' GROUP BY 1
)
SELECT ev.user_pseudo_id,
  COUNTIF(ev.event_name = 'first_visit') AS n_fv,
  MIN(IF(ev.event_name = 'first_visit', ev.t, NULL)) AS fv,
  LOGICAL_OR(ev.up = 'toss' OR ev.ep = 'toss') AS toss,
  LOGICAL_OR(ev.up IN ('itch', 'android', 'ios') OR ev.ep IN ('itch', 'android', 'ios')) AS other_platform,
  LOGICAL_OR(ev.up = 'android' OR ev.ep = 'android') AS android,
  LOGICAL_OR(ev.user_id IN (SELECT user_id FROM excluded_uid)) AS excluded,
  MIN(u.first_seen) AS acct_first_seen,
  MIN(IF(ev.user_id IS NOT NULL, ev.ts, NULL)) AS entry_ts,
  ANY_VALUE(s.scr_ts) AS scr_ts,
  COUNTIF(ev.event_name = 'login_screen') AS n_scr,
  COUNTIF(ev.ts > s.scr_ts) AS n_after_scr,                        -- events strictly after the screen
  COUNTIF(ev.ts >= s.scr_ts AND ev.eng IS NOT NULL) AS n_eng_after,   -- engagement_time_msec carriers from screen on
  COUNTIF(ev.event_name = 'pgs_connect') AS n_pgs,
  COUNTIF(ev.event_name = 'pgs_connect' AND ev.result = 'ok') AS n_pgs_ok,
  COUNTIF(ev.event_name = 'login_screen' AND ev.reason = 'pgs_fail') AS n_pgs_fail_scr,
  APPROX_TOP_COUNT(ev.cat, 1)[OFFSET(0)].value AS cat,
  APPROX_TOP_COUNT(ev.br, 1)[OFFSET(0)].value AS br,
  COUNT(DISTINCT ev.cat) AS n_cat, COUNT(DISTINCT ev.br) AS n_br
FROM ev LEFT JOIN uid_first u USING (user_id) LEFT JOIN scr s USING (user_pseudo_id)
GROUP BY 1
"""

BOOL = ("toss", "other_platform", "android", "excluded")


def build() -> pd.DataFrame:
    d = read_sql(SQL)
    d["fv"] = pd.to_datetime(d["fv"])
    d["acct_first_seen"] = pd.to_datetime(d["acct_first_seen"])
    for c in BOOL:
        d[c] = d[c].fillna(False).astype(bool)
    d = d[(d["fv"] >= START) & (d["fv"] < END)].copy()
    d["old_account"] = d["acct_first_seen"] < d["fv"] - pd.Timedelta(minutes=1)
    d["entered"] = d["entry_ts"].notna()
    d["screen"] = d["scr_ts"].notna()
    d["kept"] = ~d["toss"] & ~d["other_platform"] & ~d["excluded"] & ~d["old_account"]
    return d.sort_values("user_pseudo_id").reset_index(drop=True)


def main() -> None:
    d = build()
    print(f"[1] sample — first_visit {START} ~ {END} (exclusive), all devices = {len(d)}")
    print(pd.Series({
        "toss": d.toss.sum(), "android/itch/ios": (~d.toss & d.other_platform).sum(),
        "persona/dev": (~d.toss & ~d.other_platform & d.excluded).sum(),
        "old account on new device": (~d.toss & ~d.other_platform & ~d.excluded & d.old_account).sum(),
        "KEPT web devices": d.kept.sum(),
    }).to_string())
    k = d[d.kept]

    e = k[k.entered]
    print("\n[2] screen firing — kept web devices that ENTERED (new device, no saved session expected)")
    print(f"    entered n={len(e)} · saw no_session screen = {e.screen.sum()} ({e.screen.mean():.0%})"
          f" · screen at/before entry = {(e.scr_ts <= e.entry_ts).sum()}")

    s = k[k.screen]
    print("\n[3] dwell measurability — kept devices that saw the screen (entered or not)")
    print(f"    n={len(s)} · ≥1 event strictly after screen = {(s.n_after_scr > 0).sum()} ({(s.n_after_scr > 0).mean():.0%})"
          f" · ≥1 engagement_time carrier from screen on = {(s.n_eng_after > 0).sum()} ({(s.n_eng_after > 0).mean():.0%})")

    print("\n[4] device / browser fields — kept devices")
    print(f"    category null = {k.cat.isna().sum()} · browser null = {k.br.isna().sum()} ({k.br.isna().mean():.0%})"
          f" · >1 category per device = {(k.n_cat > 1).sum()} · >1 browser per device = {(k.n_br > 1).sum()}")
    print("    cell sizes (n per group, no outcome):")
    grp = k.br.fillna("(null)").map(lambda b: "in-app" if b in ("Safari (in-app)", "Android Webview") else ("(null)" if b == "(null)" else "regular"))
    print(pd.crosstab(k.cat.fillna("(null)"), grp, margins=True).to_string())
    print("    null-browser devices by category:", k[k.br.isna()].cat.value_counts(dropna=False).to_dict())

    print("\n[5] duplicates — kept devices with >1 first_visit =", int((k.n_fv > 1).sum()))

    a = d[d.android & ~d.toss]
    print(f"\n[6] android app devices (outside main analysis) n={len(a)} · with pgs_connect = {(a.n_pgs > 0).sum()}"
          f" · any pgs ok = {(a.n_pgs_ok > 0).sum()} · saw pgs_fail screen = {(a.n_pgs_fail_scr > 0).sum()}")


if __name__ == "__main__":
    main()
