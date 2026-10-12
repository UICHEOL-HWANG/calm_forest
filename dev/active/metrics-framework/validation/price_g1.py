"""Price response G1 — data reliability (pre-registration: price-response-prereg.md).

Loads shop_sell ONCE with the official exclusions and checks: recorded `rate` vs the code formula
(priceRate = 0.70 + (dateHash('price:'+item) % 61)/100, local-date string), one rate per item-day,
qty sanity, panel size. Does NOT fit P1/P2. Prints aggregates only (PUBLIC repo).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/price_g1.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hierarchy_baseline import DEV_CLIENTS, GA4, RAW, read_sql  # noqa: E402
from probe_g1 import persona_ids  # noqa: E402

START, END = "2026-08-06", "2026-10-11"
MIN_SALE_DAYS = 10


def date_hash(day: str, salt: str) -> int:
    """Port of js/game.js dateHash (31-multiplier string hash, 31-bit)."""
    h = 0
    for ch in f"{day}:{salt}":
        h = (h * 31 + ord(ch)) & 0x7FFFFFFF
    return h


def code_rate(day: str, item: str) -> int:
    return round((0.70 + (date_hash(day, "price:" + item) % 61) / 100) * 100)


def load() -> pd.DataFrame:
    lit = ", ".join(f"'{p}'" for p in persona_ids()) or "''"
    d = read_sql(f"""
    SELECT user_pseudo_id, user_id, event_timestamp AS ts,
      FORMAT_DATE('%Y-%m-%d', DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')) AS day,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'item') AS item,
      (SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'qty') AS qty,
      (SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'rate') AS rate,
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'via') AS via,
      COALESCE((SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'ab_variant'),
               (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'variant')) AS ab,
      IFNULL(user_id IN ({lit}), FALSE) AS persona,
      IFNULL(user_id IN (SELECT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL), FALSE) AS dev,
      IFNULL(user_id IN (SELECT DISTINCT user_id FROM `{RAW}.econ_logs` WHERE variant IN ('beta_A', 'beta_B') AND user_id IS NOT NULL), FALSE) AS beta_acct
    FROM `{GA4}.events_*`
    WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND event_name = 'shop_sell'""")
    d = d[(d.day >= START) & (d.day <= END)].copy()
    d["persona"] = d.persona.fillna(False).astype(bool)
    d["dev"] = d.dev.fillna(False).astype(bool)
    # GA4 shop_sell rarely carries the beta tag → also use beta accounts from the econ ledger (same rule: beta period only)
    d["beta"] = (d.ab.isin(["beta_A", "beta_B"]) | d.beta_acct.fillna(False).astype(bool)) & d.day.between("2026-09-09", "2026-09-15")
    d["merchant"] = d.via.eq("merchant")
    d["no_rate"] = d.rate.isna()
    return d.sort_values(["user_pseudo_id", "ts"]).reset_index(drop=True)


def main() -> None:
    d = load()
    print(f"[1] shop_sell {START}~{END}: {len(d)} rows")
    keep = pd.Series(True, index=d.index)
    for name in ("persona", "dev", "beta", "merchant", "no_rate"):
        drop = keep & d[name]
        print(f"    − {name}: {int(drop.sum())}")
        keep &= ~d[name]
    o = d[keep].copy()
    print(f"    = official {len(o)} rows · devices {o.user_pseudo_id.nunique()} · items {o.item.nunique()}")

    o["code_rate"] = [code_rate(day, it) for day, it in zip(o.day, o.item)]
    match = o.rate == o.code_rate
    print(f"[2] recorded rate == code formula (KST date): {int(match.sum())}/{len(o)} ({match.mean():.1%})")
    mism = o[~match]
    if len(mism):
        prev = [code_rate((pd.Timestamp(day) - pd.Timedelta(days=1)).strftime('%Y-%m-%d'), it) for day, it in zip(mism.day, mism.item)]
        print(f"    mismatches explained by previous-day date (non-KST device clock): {int((mism.rate.values == pd.Series(prev).values).sum())}")
    per = o.groupby(["item", "day"]).rate.nunique()
    print(f"    item-days with >1 recorded rate: {int((per > 1).sum())} / {len(per)}")

    print(f"[3] qty: null {int(o.qty.isna().sum())} · ≤0 {int((o.qty <= 0).sum())} · median {o.qty.median():.0f} · max {o.qty.max()}")
    days = o.groupby("item").day.nunique().sort_values(ascending=False)
    use = days[days >= MIN_SALE_DAYS].index.tolist()
    print(f"[4] items with ≥{MIN_SALE_DAYS} sale days: {days[days >= MIN_SALE_DAYS].to_dict()} · dropped: {days[days < MIN_SALE_DAYS].to_dict()}")
    n_days = len(pd.date_range(START, END))
    sale_days = o[o.item.isin(use)].day.nunique()
    print(f"    panel = {len(use)} items × {n_days} days = {len(use) * n_days} item-days · days with any sale {sale_days} (≥30 needed)")
    top = o.groupby("user_pseudo_id").qty.sum().nlargest(3).sum() / o.qty.sum()
    print(f"[5] top-3 devices share of sold qty: {top:.0%} (sensitivity planned)")
    print(f"    rate range in data: {o.rate.min()}~{o.rate.max()} (code range 70~130)")


if __name__ == "__main__":
    main()
