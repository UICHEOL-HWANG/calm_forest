"""C6 G2 — login-at-entry vs guest, 1~7 day revisit (pre-registration: login-guest-prereg.md).

Reuses the G1 table and the R1~R5 revisit definition (ga4_person_days, visited, judge: +10%p rule, n<30 → direction only).
Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/login_guest_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from login_guest_g1 import SQL, groups  # noqa: E402
from first5min_r_g2 import DATA_END, OBS21, judge, visited  # noqa: E402
from ltv_engagement import ga4_person_days  # noqa: E402
from hierarchy_baseline import read_sql  # noqa: E402


def main() -> None:
    p = read_sql(SQL).sort_values("person").reset_index(drop=True)
    w = p[p.platform == "web"].copy()
    w["grp"] = groups(w)
    w = w[w.grp.isin(["account", "guest"])].reset_index(drop=True)
    w["d0"] = pd.to_datetime(w["d0"]).dt.date
    days = ga4_person_days()
    days = days[(days["d"] <= DATA_END) & days["person"].isin(w["person"])].merge(w[["person", "d0"]], on="person")
    days["k"] = (pd.to_datetime(days["d"]) - pd.to_datetime(days["d0"])).dt.days
    w["ret7"] = visited(days, w["person"], 1, 7)
    w["acq5"] = w.sec.notna() & (w.sec <= 300)

    acc, gst = w[w.grp == "account"], w[w.grp == "guest"]
    judge("C6 계정 vs 게스트 · 1~7일차 재방문", acc.ret7.to_numpy(float), gst.ret7.to_numpy(float))
    a5, g5 = acc[acc.acq5], gst[gst.acq5]
    judge("C6-b 첫 5분 획득자끼리 · 1~7일차 재방문", a5.ret7.to_numpy(float), g5.ret7.to_numpy(float))

    print("\n[secondary, not for verdict]")
    obs = w[w.d0 <= OBS21].copy()
    obs["ret21"] = visited(days, obs["person"], 8, 21)
    for g in ("account", "guest"):
        q, o = w[w.grp == g], obs[obs.grp == g]
        print(f"   {g:7}: n={len(q)} · ≤5min acq {q.acq5.mean():.0%} · ret 1~7 {q.ret7.mean():.0%} · ret 8~21 {o.ret21.mean():.0%} (n={len(o)})")


if __name__ == "__main__":
    main()
