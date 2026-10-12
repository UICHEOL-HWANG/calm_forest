"""Coin economy G1 — data reliability (pre-registration: coin-economy-prereg.md).

Loads official econ rows ONCE and checks coverage, the balance column, duplicates and cell sizes.
Does NOT compute C1~C5 outcomes. Persona IDs from Supabase stay in memory. Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/coin_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import DEV_CLIENTS, RAW, read_sql  # noqa: E402
from probe_g1 import persona_ids  # noqa: E402

START, SPLIT, END = "2026-08-06", "2026-09-05", "2026-10-11"


def load(pids: list[str]) -> pd.DataFrame:
    lit = ", ".join(f"'{p}'" for p in pids) or "''"
    d = read_sql(f"""
    SELECT id, client_id, source, currency, amount, balance, created_at,
      DATE(created_at, 'Asia/Seoul') AS d,
      platform IN ('web', 'toss') AS plat_ok,
      IFNULL(user_id IN ({lit}), FALSE) AS persona,
      IFNULL(client_id IN ({DEV_CLIENTS}), FALSE) AS dev,
      (IFNULL(variant, '') IN ('beta_A', 'beta_B') AND DATE(created_at, 'Asia/Seoul') BETWEEN '2026-09-09' AND '2026-09-15') AS beta
    FROM `{RAW}.econ_logs`
    WHERE DATE(created_at, 'Asia/Seoul') BETWEEN '{START}' AND '{END}'""")
    d["d"] = pd.to_datetime(d["d"])
    for c in ("plat_ok", "persona", "dev", "beta"):
        d[c] = d[c].fillna(False).astype(bool)
    d["official"] = d.plat_ok & ~d.persona & ~d.dev & ~d.beta
    d["phase"] = (d.d >= SPLIT).map({False: "pre", True: "post"})
    d["wk"] = d.d - pd.to_timedelta(d.d.dt.weekday, unit="D")
    return d.sort_values(["client_id", "created_at", "id"]).reset_index(drop=True)


def main() -> None:
    d = load(persona_ids())
    print(f"[1] rows {START}~{END}: all {len(d)} · excluded platform {(~d.plat_ok).sum()} · persona {d.persona.sum()}"
          f" · dev {d.dev.sum()} · beta {d.beta.sum()} · OFFICIAL {d.official.sum()}")
    o = d[d.official].copy()
    print(f"    currency values = {o.currency.value_counts(dropna=False).to_dict()} · amount == 0 rows = {(o.amount == 0).sum()}")
    print("    official by phase: rows / devices / weeks")
    print(o.groupby("phase").agg(rows=("id", "size"), devices=("client_id", "nunique"), weeks=("wk", "nunique")).to_string())

    print("\n[2] balance column (official rows)")
    print(f"    null {o.balance.isna().sum()} · negative {(o.balance < 0).sum()}")
    o["prev_bal"] = o.groupby("client_id").balance.shift()
    chain = o[o.prev_bal.notna()]
    ok = (chain.prev_bal + chain.amount == chain.balance)
    print(f"    consecutive rows of the same device: {len(chain)} · balance = previous balance + amount: {ok.sum()} ({ok.mean():.0%})")
    print(f"    devices with any break: {chain.loc[~ok, 'client_id'].nunique()} / {o.client_id.nunique()}")

    print("\n[3] duplicates (official): same id =", int(o.id.duplicated().sum()),
          "· same device+time+source+amount =", int(o.duplicated(["client_id", "created_at", "source", "amount"]).sum()))

    print("\n[4] source coverage by phase (row counts, income only)")
    inc = o[o.amount > 0]
    print(inc.pivot_table(index="source", columns="phase", values="id", aggfunc="size", fill_value=0)
          .sort_values("post", ascending=False).to_string())
    print(f"    spend rows by phase: {o[o.amount < 0].groupby('phase').size().to_dict()}")

    print("\n[5] cell sizes for C4/C5 (devices with ≥2 active weeks in the phase) and C1 (devices per week)")
    for ph in ("pre", "post"):
        q = o[o.phase == ph]
        wk = q.groupby("client_id").wk.nunique()
        print(f"    {ph}: devices ≥2 active weeks = {(wk >= 2).sum()} · device-week pairs with a previous active week = {int((wk - 1).clip(lower=0).sum())}")
    print("    devices per week:", o.groupby("wk").client_id.nunique().to_dict())


if __name__ == "__main__":
    main()
