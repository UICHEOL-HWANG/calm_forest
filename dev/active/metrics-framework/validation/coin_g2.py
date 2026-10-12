"""Coin economy G2 — C1~C5 verdicts (pre-registration: coin-economy-prereg.md, §3-1 decisions fixed 2026-10-12).

Main population = official rows minus boot-grant-only devices never seen in session_logs; sensitivity includes them.
C4/C5 main = balance column (week-end balance minus previous active week-end balance); sensitivity = that week's amount sum.
Device-cluster bootstrap 2,000 (devices sorted). Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/coin_economy.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/coin_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from coin_g1 import load, persona_ids  # noqa: E402
from hierarchy_baseline import RAW, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

B, SEED = 2000, 20261012
BOOT_GRANTS = {"daily_bonus", "badge", "story"}
NEED_WEEKS = {"pre": 3, "post": 4}      # majority of 5 / 6 phase-weeks
OPP_WEEKS = {"pre": 1, "post": 1}       # ≤ a quarter


def population(o: pd.DataFrame) -> pd.Series:
    sl = set(read_sql(f"SELECT DISTINCT client_id FROM `{RAW}.session_logs` WHERE client_id IS NOT NULL").client_id)
    srcs = o.groupby("client_id").source.agg(set)
    boot_only = {c for c, s in srcs.items() if s <= BOOT_GRANTS and c not in sl}
    return ~o.client_id.isin(boot_only)


def cluster_boot(df: pd.DataFrame, stat, rng: np.random.Generator) -> tuple[float, float]:
    devs = np.array(sorted(df.client_id.unique()))
    groups = {k: g for k, g in df.groupby("client_id")}
    out = []
    for _ in range(B):
        pick = rng.choice(devs, len(devs))
        out.append(stat(pd.concat([groups[k] for k in pick], ignore_index=True)))
    return tuple(np.nanpercentile(out, [2.5, 97.5]))


def c1(o: pd.DataFrame) -> dict:
    res = {}
    for ph in ("pre", "post"):
        q = o[o.phase == ph]
        shares = []
        for wk, g in q.groupby("wk"):
            pos = g.groupby("client_id").amount.sum().clip(lower=0)
            shares.append((wk.date(), pos.nlargest(3).sum() / pos.sum() if pos.sum() > 0 else np.nan, len(pos)))
        hit = sum(s >= .5 for _, s, _ in shares)
        v = "SUPPORTED" if hit >= NEED_WEEKS[ph] else ("OPPOSITE" if hit <= OPP_WEEKS[ph] else "NOT DETERMINABLE")
        res[ph] = (shares, hit, v)
    return res


def c2(o: pd.DataFrame, rng) -> dict:
    res = {}
    for ph in ("pre", "post"):
        inc = o[(o.phase == ph) & (o.amount > 0)]
        share = inc.groupby("source").amount.sum().sort_values(ascending=False) / inc.amount.sum()
        f = lambda g: g.loc[g.source == "shop_sell", "amount"].sum() / g.amount.sum()
        lo, hi = cluster_boot(inc, f, rng)
        top = share.index[0]
        v = "OPPOSITE" if top != "shop_sell" else ("SUPPORTED" if lo > .30 else "NOT DETERMINABLE")
        res[ph] = (share, share.get("shop_sell", 0.0), lo, hi, v)
    return res


def c3(o: pd.DataFrame, rng) -> tuple:
    q = o[o.phase == "post"]
    f = lambda g: -g.loc[g.amount < 0, "amount"].sum() / g.loc[g.amount > 0, "amount"].sum()
    lo, hi = cluster_boot(q, f, rng)
    r = f(q)
    v = "SUPPORTED" if hi < .20 else ("OPPOSITE" if lo > .50 else "NOT DETERMINABLE")
    return r, lo, hi, v


def week_pairs(o: pd.DataFrame) -> pd.DataFrame:
    """One row per device × active week that has a previous active week in the same phase."""
    o = o.sort_values(["client_id", "created_at", "id"])
    wk = o.groupby(["client_id", "phase", "wk"]).agg(end_bal=("balance", "last"), net=("amount", "sum")).reset_index()
    wk = wk.sort_values(["client_id", "phase", "wk"])
    wk["prev_end"] = wk.groupby(["client_id", "phase"]).end_bal.shift()
    p = wk[wk.prev_end.notna()].copy()
    p["growth_bal"] = p.end_bal - p.prev_end
    return p


def c4_c5(o: pd.DataFrame, col: str, rng) -> dict:
    p = week_pairs(o)
    out = {}
    for ph in ("pre", "post"):
        q = p[p.phase == ph]
        med = float(q[col].median()) if len(q) else np.nan
        lo, hi = cluster_boot(q, lambda g: g[col].median(), rng) if len(q) else (np.nan, np.nan)
        n = q.client_id.nunique()
        v = ("DIRECTION ONLY (n < 30)" if n < 30 else
             "SUPPORTED" if med > 0 and lo > 0 else "OPPOSITE" if hi < 0 else "NOT DETERMINABLE")
        out[ph] = (len(q), n, med, lo, hi, v)
    a, b = p[p.phase == "post"], p[p.phase == "pre"]
    da = {k: g for k, g in a.groupby("client_id")}
    db = {k: g for k, g in b.groupby("client_id")}
    ka, kb = np.array(sorted(da)), np.array(sorted(db))
    diffs = [pd.concat([da[k] for k in rng.choice(ka, len(ka))])[col].median()
             - pd.concat([db[k] for k in rng.choice(kb, len(kb))])[col].median() for _ in range(B)]
    lo, hi = np.percentile(diffs, [2.5, 97.5])
    d = a[col].median() - b[col].median()
    nmin = min(len(ka), len(kb))
    v5 = ("DIRECTION ONLY (n < 30)" if nmin < 30 else
          "SUPPORTED" if hi < 0 else "OPPOSITE" if lo > 0 else "NOT DETERMINABLE")
    out["C5"] = (d, lo, hi, v5)
    return out


def run(o: pd.DataFrame, label: str, rng) -> None:
    print(f"\n===== {label}: rows {len(o)} · devices pre {o[o.phase == 'pre'].client_id.nunique()} / post {o[o.phase == 'post'].client_id.nunique()}")
    for ph, (shares, hit, v) in c1(o).items():
        print(f"[C1] {ph}: top-3 share by week " + " · ".join(f"{w.strftime('%m-%d')} {s:.0%}(n{n})" for w, s, n in shares)
              + f" → {hit} weeks ≥50% → {v}")
    for ph, (share, ss, lo, hi, v) in c2(o, rng).items():
        top = " · ".join(f"{k} {x:.0%}" for k, x in share.head(4).items())
        print(f"[C2] {ph}: {top} · shop_sell {ss:.0%} (CI {lo:.0%}~{hi:.0%}) → {v}")
    r, lo, hi, v = c3(o, rng)
    print(f"[C3] post: spend ÷ income {r:.1%} (CI {lo:.1%}~{hi:.1%}) → {v}")
    for col, name in (("growth_bal", "balance column (main)"), ("net", "weekly amount sum (sensitivity)")):
        res = c4_c5(o, col, rng)
        for ph in ("pre", "post"):
            k, n, med, lo, hi, v = res[ph]
            print(f"[C4] {name} {ph}: pairs {k} devices {n} · median weekly growth {med:+.0f} (CI {lo:+.0f}~{hi:+.0f}) → {v}")
        d, lo, hi, v = res["C5"]
        print(f"[C5] {name}: post − pre median {d:+.0f} (CI {lo:+.0f}~{hi:+.0f}) → {v}")


def chart(o: pd.DataFrame) -> None:
    report.setup()
    inc = o[o.amount > 0].copy()
    top = inc.groupby("source").amount.sum().nlargest(4).index.tolist()
    inc["src"] = inc.source.where(inc.source.isin(top), "기타")
    by = inc.pivot_table(index="wk", columns="src", values="amount", aggfunc="sum", fill_value=0)
    spend = o[o.amount < 0].groupby("wk").amount.sum().reindex(by.index, fill_value=0)
    devs = o.groupby("wk").client_id.nunique().reindex(by.index)
    names = {"shop_sell": "판매", "daily_bonus": "일일 보너스", "quest_reward": "의뢰 보상", "badge": "배지",
             "story": "스토리", "cafe_serve": "카페", "sea_catch": "바다 낚시", "기타": "기타"}
    fig, ax = report.new("주간 코인 소득원과 소비 — 실제로 플레이한 기기 (공식)", len(o),
                         sub="막대 위 = 소득원별 코인(주 합계) · 아래 = 소비 · 점선 세로 = 9/5 코인 첫 루프(소비처 생김) · 숫자 = 그 주 경제 활동 기기",
                         ylab="코인 (주 합계)", figsize=(10, 5))
    x = np.arange(len(by))
    bottom = np.zeros(len(by))
    cols = top + (["기타"] if "기타" in by.columns else [])
    for i, c in enumerate(cols):
        ax.bar(x, by[c].values, bottom=bottom, color=report.PALETTE[i % len(report.PALETTE)] if c != "기타" else "#9a9a9a",
               width=.7, label=names.get(c, c))
        bottom += by[c].values
    ax.bar(x, spend.values, color=report.tint(report.PALETTE[0], .45), width=.7, label="소비")
    for xi, b, n in zip(x, bottom, devs.values):
        ax.text(xi, b + bottom.max() * .02, f"{n}대", ha="center", fontsize=8)
    ax.axhline(0, color="#555", lw=.8)
    split = list(by.index).index(pd.Timestamp("2026-08-31")) if pd.Timestamp("2026-08-31") in by.index else None
    if split is not None:
        ax.axvline(split + .3, color="#444", ls=":", lw=1)
    ax.set_xticks(x, [w.strftime("%m/%d") for w in by.index])
    ax.legend(frameon=False, fontsize=8, ncol=6, loc="upper left")
    print(report.check(report.save(fig, ax, "coin_economy", zero_base=False)))


def main() -> None:
    rng = np.random.default_rng(SEED)
    d = load(persona_ids())
    o = d[d.official].copy()
    keep = population(o)
    print(f"boot-grant-only devices excluded: {o[~keep].client_id.nunique()} ({(~keep).sum()} rows)")
    run(o[keep].copy(), "MAIN (played devices)", rng)
    run(o.copy(), "SENSITIVITY (all official devices)", rng)
    chart(o[keep].copy())


if __name__ == "__main__":
    main()
