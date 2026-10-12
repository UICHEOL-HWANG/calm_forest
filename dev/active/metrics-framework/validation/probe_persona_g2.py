"""X2-P G2 — per-game difficulty response model on persona plays (pre-registration: probe-persona-prereg.md).

Primary (verdict): logistic success ~ log(ease) per game (fish adds rod), account-cluster bootstrap 2,000.
Decision value: ease where predicted success = design target (fish .88 · sea .55 · mist .80).
Sensitivity (not verdict): success ~ log(e_probe) + log(dda) — e_probe is the randomized arm factor.
Check (not verdict): same primary model on real (non-persona, non-dev) players — direction only.
Data from 9/26 (fishing_miss logged from 9/26). Prints aggregates only. Chart -> ml/reports/figs/probe_persona_curves.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/probe_persona_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from probe_g1 import persona_ids  # noqa: E402
from hierarchy_baseline import DEV_CLIENTS, RAW, GA4, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

TARGET = {"fish": .88, "sea": .55, "mist": .80}
ARMS = {"fish": [.45, .65, 1.0], "sea": [1.0, 1.5, 2.2], "mist": [.7, 1.0, 1.3]}
NAME = {"fish": "🎣 낚시", "sea": "🌊 바다", "mist": "🌫️ 안개"}


def load() -> pd.DataFrame:
    lit = ", ".join(f"'{p}'" for p in persona_ids())
    sql = f"""
    WITH ev AS (
      SELECT user_id, user_pseudo_id, event_name,
        CASE WHEN event_name IN ('fishing_catch','fishing_miss') THEN 'fish'
             WHEN event_name IN ('sea_catch','sea_miss') THEN 'sea'
             WHEN event_name IN ('mist_soothe','mist_soothe_miss') THEN 'mist' END AS game,
        event_name IN ('fishing_catch','sea_catch','mist_soothe') AS success,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'arm') AS arm,
        (SELECT COALESCE(value.double_value, CAST(value.int_value AS FLOAT64)) FROM UNNEST(event_params) WHERE key = 'ease') AS ease,
        (SELECT COALESCE(value.double_value, CAST(value.int_value AS FLOAT64)) FROM UNNEST(event_params) WHERE key = 'dda') AS dda,
        (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'rod') AS rod
      FROM `{GA4}.events_*`
      WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND _TABLE_SUFFIX >= '20260926'
    ),
    dev AS (SELECT DISTINCT user_pseudo_id FROM ev WHERE user_id IN (
      SELECT user_id FROM `{RAW}.session_logs` WHERE client_id IN ({DEV_CLIENTS}) AND user_id IS NOT NULL))
    SELECT *, user_id IN ({lit}) AS persona, user_pseudo_id IN (SELECT user_pseudo_id FROM dev) AS devdev
    FROM ev WHERE game IS NOT NULL AND ease IS NOT NULL AND arm IS NOT NULL
    """
    d = read_sql(sql)
    d["persona"] = d["persona"].fillna(False).astype(bool)
    d["devdev"] = d["devdev"].fillna(False).astype(bool)
    d["unit"] = np.where(d["persona"], d["user_id"], d["user_pseudo_id"])
    return d.sort_values(["unit", "game", "arm"]).reset_index(drop=True)


def design(g: pd.DataFrame, game: str, kind: str) -> np.ndarray:
    if kind == "primary":
        cols = [np.log(g["ease"].to_numpy(float))]
    else:
        e_probe = np.array(ARMS[game])[g["arm"].to_numpy(int)]
        cols = [np.log(e_probe), np.log(g["dda"].fillna(1.0).clip(lower=.1).to_numpy(float))]
    if game == "fish":
        cols.append(g["rod"].fillna(0).to_numpy(float))
    return np.column_stack(cols)


def fit(X: np.ndarray, y: np.ndarray) -> np.ndarray:
    m = LogisticRegression(penalty=None, max_iter=2000).fit(X, y)
    return np.r_[m.intercept_, m.coef_.ravel()]


def ease_at(b: np.ndarray, target: float, rod: float = 0.0, fish: bool = False) -> float:
    if b[1] <= 0:
        return np.nan
    z = np.log(target / (1 - target)) - b[0] - (b[2] * rod if fish else 0)
    return float(np.exp(z / b[1]))


def boot(g: pd.DataFrame, game: str, kind: str, n: int = 2000) -> np.ndarray:
    rng = np.random.default_rng(20261012)
    units = g["unit"].unique()
    idx = {u: np.flatnonzero(g["unit"].to_numpy() == u) for u in units}
    out = []
    for _ in range(n):
        pick = np.concatenate([idx[u] for u in rng.choice(units, len(units))])
        s = g.iloc[pick]
        y = s["success"].to_numpy(int)
        if y.min() == y.max():
            continue
        out.append(fit(design(s, game, kind), y))
    return np.array(out)


def main() -> None:
    d = load()
    rows = []
    for game in ("fish", "sea", "mist"):
        p = d[(d.game == game) & d.persona]
        y = p["success"].to_numpy(int)
        b = fit(design(p, game, "primary"), y)
        B = boot(p, game, "primary")
        lo, hi = np.percentile(B[:, 1], [2.5, 97.5])
        v = "손잡이가 작동 (지지)" if lo > 0 else "반대" if hi < 0 else "판정 불가"
        fish = game == "fish"
        e_star = ease_at(b, TARGET[game], 0, fish)
        es = np.array([ease_at(bb, TARGET[game], 0, fish) for bb in B])
        es_lo, es_hi = np.nanpercentile(es, [2.5, 97.5]) if np.isfinite(es).any() else (np.nan, np.nan)
        print(f"\n[{game}] persona accounts {p.unit.nunique()} · plays {len(p)} · success {y.mean():.0%}")
        print(f"  by arm: " + " · ".join(f"arm{a} {p[p.arm == a].success.mean():.0%} (ease~{p[p.arm == a].ease.median():.2f})" for a in (0, 1, 2)))
        print(f"  PRIMARY slope log(ease) {b[1]:+.2f}  95% CI [{lo:+.2f}, {hi:+.2f}] → {v}")
        print(f"  ease for target {TARGET[game]:.2f}{' (rod=0)' if fish else ''}: {e_star:.2f}  95% CI [{es_lo:.2f}, {es_hi:.2f}]")
        if fish:
            print(f"  ease for target (rod=1): {ease_at(b, TARGET[game], 1, True):.2f}")
        bs = fit(design(p, game, "sens"), y)
        Bs = boot(p, game, "sens", 1000)
        slo, shi = np.percentile(Bs[:, 1], [2.5, 97.5])
        print(f"  SENSITIVITY slope log(e_probe) {bs[1]:+.2f}  95% CI [{slo:+.2f}, {shi:+.2f}] (dda coef {bs[2]:+.2f})")
        r = d[(d.game == game) & ~d.persona & ~d.devdev]
        if len(r) and r.success.nunique() > 1:
            br = fit(design(r, game, "primary"), r.success.to_numpy(int))
            print(f"  CHECK real players {r.unit.nunique()} · plays {len(r)} · success {r.success.mean():.0%} · slope {br[1]:+.2f} ({'same direction' if np.sign(br[1]) == np.sign(b[1]) else 'opposite'})")
        rows.append((game, p, b))

    report.setup()
    fig, ax = report.new("팔(무작위 배정 난이도)이 쉬워질수록 성공률이 오른다 — 페르소나 시뮬레이션", int(sum(len(p) for _, p, _ in rows)),
                         sub="점 = 팔별 성공률 · 세로선 = 계정 단위 부트스트랩 95% CI · 점선 = 설계 목표 성공률 · x 는 팔의 난이도 배율(e_probe, 클수록 쉬움)",
                         ylab="성공률 (%)", figsize=(9, 4.8))
    colors = {"fish": report.PALETTE[1], "sea": report.PALETTE[2], "mist": report.PALETTE[3]}
    rng = np.random.default_rng(20261012)
    for game, p, b in rows:
        xs, ys, los, his = [], [], [], []
        units = p["unit"].unique()
        for a, e in enumerate(ARMS[game]):
            q = p[p.arm == a]
            xs.append(e); ys.append(q.success.mean() * 100)
            bs = []
            for _ in range(1000):
                pick = rng.choice(units, len(units))
                qq = q[q.unit.isin(pick)]
                w = qq.unit.map(pd.Series(pick).value_counts())
                bs.append(np.average(qq.success, weights=w) * 100 if len(qq) else np.nan)
            l, h = np.nanpercentile(bs, [2.5, 97.5]); los.append(l); his.append(h)
        ax.plot(xs, ys, color=colors[game], lw=2, marker="o", label=NAME[game].split(" ")[1])
        ax.vlines(xs, los, his, color=colors[game], lw=1.2)
        ax.axhline(TARGET[game] * 100, color=colors[game], lw=1, ls=":")
    ax.set_xlabel("팔의 난이도 배율 e_probe (클수록 쉬움)")
    ax.set_ylim(0, 105)
    ax.legend(frameon=False, fontsize=9, loc="lower right")
    print(report.check(report.save(fig, ax, "probe_persona_curves")))


if __name__ == "__main__":
    main()
