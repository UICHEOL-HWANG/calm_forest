"""Anomaly detection G2 — Phase II control charts on raw daily metrics (pre-registration: anomaly-detection-prereg.md).

Primary: trailing-14-day mean ± 3σ (alarmed days dropped from the baseline). Comparison: median ± 3·1.4826·MAD.
Negative control: the same charts on the official (persona/dev/beta-excluded) series.
Reuses the G1 series so inputs match. Prints aggregates only (PUBLIC repo).
Charts -> ml/reports/figs/anomaly_m1.png, anomaly_m2.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/anomaly_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from anomaly_g1 import I1, I2, persona_ids, series  # noqa: E402
from calm_ml import report  # noqa: E402

WARMUP, K, BUFFER = 14, 3.0, 2
INCIDENTS = {"I1": I1, "I2": I2}


def chart_alarms(x: pd.Series, method: str) -> pd.DataFrame:
    """Phase II individuals chart. Returns center/limits/alarm per day (NaN during warm-up)."""
    vals = x.to_numpy(float)
    alarm = np.zeros(len(vals), bool)
    rows = []
    for t in range(len(vals)):
        if t < WARMUP:
            rows.append((np.nan, np.nan, np.nan, False))
            continue
        base = np.array([vals[i] for i in range(t - WARMUP, t) if not alarm[i]])
        if len(base) < 2:
            rows.append((np.nan, np.nan, np.nan, False))
            continue
        if method == "mean":
            c, s = base.mean(), base.std(ddof=1)
        else:
            c = np.median(base)
            s = 1.4826 * np.median(np.abs(base - c))
        lo, hi = c - K * s, c + K * s
        alarm[t] = bool(vals[t] > hi or vals[t] < lo)
        rows.append((c, lo, hi, alarm[t]))
    return pd.DataFrame(rows, columns=["center", "lo", "hi", "alarm"], index=x.index)


def in_window(d: pd.Timestamp, buffer: int = 0) -> str | None:
    for k, (a, b) in INCIDENTS.items():
        if a <= d <= b + pd.Timedelta(days=buffer):
            return k
    return None


def evaluate(name: str, x: pd.Series, target: str, method: str) -> dict:
    ch = chart_alarms(x, method)
    a, b = INCIDENTS[target]
    hits = ch.index[ch.alarm & (ch.index >= a) & (ch.index <= a + pd.Timedelta(days=1))]
    first_in = ch.index[ch.alarm & (ch.index >= a) & (ch.index <= b)]
    monitored = ch.index[(~ch.center.isna()) & ch.index.map(lambda d: in_window(d, BUFFER) is None)]
    false = [d for d in monitored if ch.alarm[d]]
    rate = len(false) / len(monitored) * 30 if len(monitored) else np.nan
    return {"ch": ch, "x": x, "detected_2d": len(hits) > 0,
            "first_alarm": first_in[0].date() if len(first_in) else None,
            "lag": (first_in[0] - a).days if len(first_in) else None,
            "false": false, "monitored": len(monitored), "rate30": rate}


def main() -> None:
    sl, ec = series(persona_ids())
    sl, ec = sl.set_index("d"), ec.set_index("d")
    m1_raw, m1_off = sl.raw_devices.astype(float), sl.official_devices.astype(float)
    m2_raw = (ec.raw_net / ec.raw_dev).astype(float)
    m2_off = (ec.off_net / ec.off_dev).astype(float)

    results = {}
    for method in ("mean", "median"):
        for label, x, tgt in (("M1 raw", m1_raw, "I1"), ("M2 raw", m2_raw, "I2"),
                              ("M1 official", m1_off, "I1"), ("M2 official", m2_off, "I2")):
            r = evaluate(label, x, tgt, method)
            results[label, method] = r
            fa = ", ".join(f"{d.strftime('%m-%d')}({'+' if r['x'][d] > r['ch'].center[d] else '-'})" for d in r["false"])
            print(f"[{method:6}] {label:11} target {tgt}: detected≤2d={r['detected_2d']} first alarm in window={r['first_alarm']} "
                  f"(lag {r['lag']}) · false alarms {len(r['false'])}/{r['monitored']} days = {r['rate30']:.2f}/30d · {fa}")
        ad1 = int(results["M1 raw", method]["detected_2d"]) + int(results["M2 raw", method]["detected_2d"])
        ad1_v = {2: "SUPPORTED", 1: "PARTIAL", 0: "OPPOSITE"}[ad1]
        ad2_v = all(results[k, method]["rate30"] <= 1 for k in ("M1 raw", "M2 raw"))
        print(f"  => {method}: AD1 {ad1_v} ({ad1}/2) · AD2 {'OPERABLE' if ad2_v else 'NOT OPERABLE'}"
              f" (M1 {results['M1 raw', method]['rate30']:.2f}, M2 {results['M2 raw', method]['rate30']:.2f} per 30d)\n")

    report.setup()
    for key, title, ylab, zb in (("M1", "원본 하루 기기 수 — 평균±3σ 관리도 (직전 14일 기준선)", "기기 수", True),
                                 ("M2", "원본 하루 기기당 코인 순증가 — 평균±3σ 관리도 (직전 14일 기준선)", "코인 / 기기", False)):
        r = results[f"{key} raw", "mean"]
        off = results[f"{key} official", "mean"]["x"]
        ch, x = r["ch"], r["x"]
        fig, ax = report.new(title, len(x), ylab=ylab, figsize=(10, 4.6),
                             sub="회색 띠 = 정답지 사고 기간(I1 페르소나 10/2~10/9 · I2 베타 9/9~9/15) · 점선 = 공식 값(음성 대조) · 빨간 점 = 경보")
        for k, (a, b) in INCIDENTS.items():
            ax.axvspan(a - pd.Timedelta(hours=12), b + pd.Timedelta(hours=12), color=report.tint("#888888", .75), lw=0)
            ax.text(a, 1.0, f" {k}", transform=ax.get_xaxis_transform(), va="top", fontsize=9)
        ax.fill_between(ch.index, ch.lo, ch.hi, color=report.tint(report.PALETTE[1], .8), lw=0, label="관리 한계 (평균±3σ)")
        ax.plot(x.index, x.values, color=report.PALETTE[1], lw=1.4, label="원본")
        ax.plot(off.index, off.values, color=report.PALETTE[2], lw=1.1, ls="--", label="공식")
        al = ch.index[ch.alarm]
        ax.scatter(al, x[al], color=report.PALETTE[0], s=28, zorder=5, label="경보")
        ax.legend(frameon=False, fontsize=8, loc="upper left", ncol=4)
        print(report.check(report.save(fig, ax, f"anomaly_{key.lower()}", zero_base=zb)))


if __name__ == "__main__":
    main()
