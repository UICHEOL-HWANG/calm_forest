"""NSM validation V1-V3 — criteria fixed in ../nsm-validation-prereg.md (commit 8aec0b3).

Run: ml/.venv/bin/python dev/active/metrics-framework/validation/nsm_validate.py
Prints aggregates only (PUBLIC repo — no per-user rows).
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from calm_ml.bq import RAW, read_sql  # noqa: E402

RESULT_ACTIONS = [
    "harvest_crop", "coop_collect", "honey_collect", "fishing_catch", "sea_catch",
    "firefly_catch", "forage_pick", "mine_ore", "craft_item", "craft_claim",
    "cooking_result", "cafe_serve", "carve_result", "quest_complete", "star_result",
    "duel_result",
]
DECOR_CHAT = [
    "place_decor", "color_unlock", "store_decor", "store_outdoor",
    "npc_chat_open", "npc_chat_done", "gift_give", "photo_capture",
]
RNG = np.random.default_rng(20261008)
N_BOOT = 1000


def _sum_keys(keys: list[str]) -> str:
    return " + ".join(
        f"IFNULL(SAFE_CAST(JSON_VALUE(counts, '$.{k}') AS INT64), 0)" for k in keys
    )


SQL = f"""
WITH latest AS (
  SELECT * EXCEPT(rn) FROM (
    SELECT *, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) rn
    FROM `{RAW}.session_logs`
  ) WHERE rn = 1
),
persona AS (
  SELECT user_id FROM `{RAW}.session_logs` WHERE user_id IS NOT NULL
  GROUP BY 1
  HAVING COUNT(DISTINCT client_id) >= 4 AND MIN(DATE(started_at, 'Asia/Seoul')) >= '2026-09-28'
)
SELECT
  DATE(started_at, 'Asia/Seoul') AS d,
  IF(is_guest = FALSE AND user_id IS NOT NULL, CONCAT('u:', user_id), CONCAT('c:', client_id)) AS person,
  client_id, user_id, is_guest, platform,
  LEAST(IFNULL(play_sec, 0), 3600) AS play_sec_cap,
  {_sum_keys(RESULT_ACTIONS)} AS results,
  {_sum_keys(DECOR_CHAT)} AS decor_chat,
  IFNULL(user_id IN (SELECT user_id FROM persona), FALSE) AS is_persona
FROM latest
WHERE client_id IS NOT NULL OR user_id IS NOT NULL
"""


def person_days(sessions: pd.DataFrame) -> pd.DataFrame:
    g = sessions.groupby(["person", "d"], as_index=False).agg(
        results=("results", "sum"),
        decor_chat=("decor_chat", "sum"),
        play_sec=("play_sec_cap", "sum"),
        platform=("platform", "last"),
    )
    g["tended"] = g["results"] > 0
    return g


def _boot_auc(y: np.ndarray, x: np.ndarray) -> list[float]:
    out = []
    n = len(y)
    for _ in range(N_BOOT):
        idx = RNG.integers(0, n, n)
        if y[idx].min() != y[idx].max():
            out.append(roc_auc_score(y[idx], x[idx]))
    return out


def v1(pdays: pd.DataFrame, label: str, drop_beta_cohort: bool = False) -> None:
    first = pdays.groupby("person")["d"].min().rename("d0")
    df = pdays.join(first, on="person")
    df["k"] = (pd.to_datetime(df["d"]) - pd.to_datetime(df["d0"])).dt.days
    lo_d, hi_d = pd.Timestamp("2026-08-06").date(), pd.Timestamp("2026-09-16").date()
    cohort = first[(first >= lo_d) & (first <= hi_d)]
    if drop_beta_cohort:
        b0, b1 = pd.Timestamp("2026-09-09").date(), pd.Timestamp("2026-09-15").date()
        cohort = cohort[~((cohort >= b0) & (cohort <= b1))]
    df = df[df["person"].isin(cohort.index)]
    w1 = df[df["k"].between(0, 6)].groupby("person").agg(
        tending_days=("tended", "sum"),
        active_days=("d", "nunique"),
        play_hours=("play_sec", lambda s: s.sum() / 3600),
        result_actions=("results", "sum"),
    )
    returned = df[df["k"].between(8, 21)].groupby("person").size().gt(0)
    y = returned.reindex(w1.index, fill_value=False).astype(int).to_numpy()
    print(f"\n[V1 {label}] cohort n={len(w1)}, returned={y.sum()} ({y.mean():.1%})")
    if y.min() == y.max():
        print("  label has one class — cannot compute AUC")
        return
    points = {}
    for f in ["tending_days", "active_days", "play_hours", "result_actions"]:
        x = w1[f].to_numpy(dtype=float)
        points[f] = roc_auc_score(y, x)
        lo, hi = np.percentile(_boot_auc(y, x), [2.5, 97.5])
        print(f"  AUC {f:15s} {points[f]:.3f}  [{lo:.3f}, {hi:.3f}]")
    xt, xa = w1["tending_days"].to_numpy(float), w1["active_days"].to_numpy(float)
    diffs = []
    n = len(y)
    for _ in range(N_BOOT):
        idx = RNG.integers(0, n, n)
        if y[idx].min() != y[idx].max():
            diffs.append(roc_auc_score(y[idx], xt[idx]) - roc_auc_score(y[idx], xa[idx]))
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    d = points["tending_days"] - points["active_days"]
    print(f"  diff tending-active {d:+.3f}  [{lo:+.3f}, {hi:+.3f}]  → {'PASS' if d >= 0 else 'FAIL'}")


def v2(pdays: pd.DataFrame, label: str) -> None:
    df = pdays.copy()
    df["decor_only"] = (~df["tended"]) & (df["decor_chat"] > 0)
    share = df["decor_only"].mean()
    day_sets = df.groupby("person")["d"].apply(set)
    df["ret7"] = [
        any(0 < (x - d).days <= 7 for x in day_sets[p]) for p, d in zip(df["person"], df["d"])
    ]
    cutoff = df["d"].max() - pd.Timedelta(days=7)
    obs = df[df["d"] <= cutoff]
    r_decor = obs.loc[obs["decor_only"], "ret7"].mean()
    r_tend = obs.loc[obs["tended"], "ret7"].mean()
    keep = share < 0.10 or (r_decor < r_tend)
    print(f"\n[V2 {label}] active person-days={len(df)}, decor/chat-only share={share:.1%}")
    print(f"  7-day return: decor/chat-only {r_decor:.1%} (n={int(obs['decor_only'].sum())}) "
          f"vs tended {r_tend:.1%} (n={int(obs['tended'].sum())})")
    print(f"  → {'PASS (keep definition)' if keep else 'FAIL (add decor/chat)'}")


def v3(sessions: pd.DataFrame, pdays: pd.DataFrame, label: str) -> None:
    logged_clients = set(sessions.loc[sessions["person"].str.startswith("u:"), "client_id"].dropna())
    guest_tended = pdays[pdays["tended"] & pdays["person"].str.startswith("c:")]
    dup = int(guest_tended["person"].str[2:].isin(logged_clients).sum())
    total = int(pdays["tended"].sum())
    share = dup / total if total else 0.0
    print(f"\n[V3 {label}] double-count: {dup}/{total} tended person-days = {share:.1%} "
          f"→ {'PASS' if share < 0.05 else 'FAIL'}")
    df = pdays.copy()
    df["wk"] = pd.to_datetime(df["d"]).dt.to_period("W-SUN").dt.start_time.dt.date
    print("  week        NSM/day  95% CI          half  | tended person-days web/toss/itch")
    for wk, g in df.groupby("wk"):
        per = g.groupby("person")["tended"].sum().to_numpy()
        point = per.sum() / 7
        boots = [RNG.choice(per, len(per)).sum() / 7 for _ in range(N_BOOT)]
        lo, hi = np.percentile(boots, [2.5, 97.5])
        plat = g[g["tended"]].groupby("platform").size()
        print(f"  {wk}  {point:6.2f}   [{lo:5.2f}, {hi:5.2f}]  {(hi - lo) / 2:5.2f} "
              f"| {plat.get('web', 0)}/{plat.get('toss', 0)}/{plat.get('itch', 0)}")


def main() -> None:
    sessions = read_sql(SQL)
    sessions["d"] = pd.to_datetime(sessions["d"]).dt.date
    populations = {
        "raw": sessions,
        "filtered(P1)": sessions[~sessions["is_persona"]],
    }
    for label, s in populations.items():
        pdays = person_days(s)
        v1(pdays, label)
        v1(pdays, label + " w/o beta-week cohort", drop_beta_cohort=True)
        v2(pdays, label)
        v3(s, pdays, label)


if __name__ == "__main__":
    main()
