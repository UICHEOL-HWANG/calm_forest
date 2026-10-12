"""Hint banner A/B G2 — verdict (pre-registration: hint-banner-ab-prereg.md, fixed 2026-10-08).

Primary: 7-day revisit = the same resident (logged-in session → u:+user_id, else c:+client_id, from session_logs)
started a different session within 7 days after t0 (first intervene). ITT by assigned arm.
Test: randomization (arm shuffled across sessions, 10,000) two-sided p. 95% CI: resident cluster bootstrap 2,000.
Verdict: p < 0.05 → effect (sign gives direction); else 'not determinable' + CI + MDE.
Secondary (not for verdict): 60-second survival after t0 · remaining minutes after t0. Sensitivity: first session per resident.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/hint_banner_ab.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/hint_banner_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from hint_banner_g1 import SQL as G1_SQL  # noqa: E402
from hierarchy_baseline import RAW, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

SEED = 20261012


def eligible() -> pd.DataFrame:
    d = read_sql(G1_SQL)
    for c in ("bad_origin", "beta", "itch", "in_sl", "persona"):
        d[c] = d[c].fillna(False).astype(bool)
    d = d[~(d.bad_origin | d.beta | d.persona | d.itch | (d.n_arms > 1))].copy()
    d["t0"] = pd.to_datetime(d.t0, utc=True)
    logged = d.sl_guest.fillna(True).astype(bool).eq(False)
    d["resident"] = np.where(logged, "u:" + d.sl_user.astype(str), "c:" + d.client_id.astype(str))
    return d.sort_values(["resident", "t0"]).reset_index(drop=True)


def all_sessions() -> pd.DataFrame:
    s = read_sql(f"""
    SELECT session_id, user_id, is_guest, client_id, started_at, updated_at
    FROM `{RAW}.session_logs`
    QUALIFY ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) = 1""")
    logged = s.is_guest.fillna(True).astype(bool).eq(False) & s.user_id.notna()
    s["resident"] = np.where(logged, "u:" + s.user_id.astype(str), "c:" + s.client_id.astype(str))
    s["started_at"] = pd.to_datetime(s.started_at, utc=True)
    s["updated_at"] = pd.to_datetime(s.updated_at, utc=True)
    return s


def outcomes(d: pd.DataFrame, s: pd.DataFrame) -> pd.DataFrame:
    by_res = {k: g for k, g in s.groupby("resident")}
    own = s.set_index("session_id").updated_at
    rev, surv, rem = [], [], []
    for r in d.itertuples():
        g = by_res.get(r.resident)
        later = g[(g.session_id != r.session_id) & (g.started_at > r.t0) & (g.started_at <= r.t0 + pd.Timedelta(days=7))] if g is not None else []
        rev.append(len(later) > 0)
        u = own.get(r.session_id)
        surv.append(bool(u is not None and (u - r.t0).total_seconds() >= 60))
        rem.append((u - r.t0).total_seconds() / 60 if u is not None else np.nan)
    return d.assign(revisit=rev, surv60=surv, remain_min=rem)


def analyse(d: pd.DataFrame, rng: np.random.Generator, label: str) -> tuple:
    y = d.revisit.to_numpy(float)
    t = d.arm.eq("treat").to_numpy()
    diff = y[t].mean() - y[~t].mean()
    perm = np.array([(lambda tt: y[tt].mean() - y[~tt].mean())(rng.permutation(t)) for _ in range(10_000)])
    p = float((np.abs(perm) >= abs(diff) - 1e-12).mean())
    res = np.array(sorted(d.resident.unique()))
    groups = {k: g for k, g in d.groupby("resident")}
    bs = []
    for _ in range(2000):
        q = pd.concat([groups[k] for k in rng.choice(res, len(res))], ignore_index=True)
        tt = q.arm.eq("treat")
        if tt.any() and (~tt).any():
            bs.append(q.revisit[tt].mean() - q.revisit[~tt].mean())
    lo, hi = np.percentile(bs, [2.5, 97.5])
    n = min(int(t.sum()), int((~t).sum()))
    p0 = y[~t].mean()
    mde = (1.96 + .8416) * np.sqrt(2 * p0 * (1 - p0) / n) if 0 < p0 < 1 else np.nan
    v = (("EFFECT — treat higher" if diff > 0 else "EFFECT — treat lower") if p < .05
         else "NOT DETERMINABLE")
    print(f"[{label}] 7-day revisit: treat {y[t].mean():.0%} (n={int(t.sum())}) vs control {y[~t].mean():.0%} (n={int((~t).sum())}) · "
          f"diff {diff * 100:+.1f}%p · randomization p {p:.3f} · resident-cluster 95% CI {lo * 100:+.1f}~{hi * 100:+.1f} · MDE ≈ ±{mde * 100:.0f}%p → {v}")
    return y[t].mean(), y[~t].mean(), int(t.sum()), int((~t).sum()), diff, p, lo, hi, v


def main() -> None:
    rng = np.random.default_rng(SEED)
    d = outcomes(eligible(), all_sessions())
    tr, ct, nt, nc, diff, p, lo, hi, v = analyse(d, rng, "PRIMARY")
    print("\n[secondary, not for verdict]")
    for a in ("treat", "control"):
        q = d[d.arm == a]
        print(f"   {a:7}: 60s survival {q.surv60.mean():.0%} · remaining minutes median {q.remain_min.median():.1f}")
    analyse(d.drop_duplicates("resident", keep="first").reset_index(drop=True), rng, "SENSITIVITY first session per resident")

    report.setup()
    fig, ax = report.new("힌트 배너 A/B — 이탈 직전 개입 후 7일 안 재방문", nt + nc,
                         sub=f"세션 단위 무작위 배정 9/6~10/6 · 배정 기준(ITT) · 차이 {diff * 100:+.0f}%p · 무작위화 검정 p={p:.2f} · 주민 단위 95% CI {lo * 100:+.0f}~{hi * 100:+.0f}%p",
                         ylab="7일 안 재방문 (%)")
    bars = ax.bar([f"배너 보여 줌\n(n={nt})", f"보류(대조)\n(n={nc})"], [tr * 100, ct * 100],
                  color=[report.PALETTE[2], report.PALETTE[1]], width=.5)
    for b, val in zip(bars, [tr * 100, ct * 100]):
        ax.text(b.get_x() + b.get_width() / 2, val + 1.5, f"{val:.0f}%", ha="center", fontsize=11)
    ax.set_ylim(0, 100)
    print(report.check(report.save(fig, ax, "hint_banner_ab")))


if __name__ == "__main__":
    main()
