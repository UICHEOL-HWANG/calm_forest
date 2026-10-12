"""H-N2 G2 — quest-chapter bundle (8/16~8/18) before/after (pre-registration: quest-chapter-prepost-prereg.md).
No control group; windows confounded by other deploys (see G1). Primary = first acquisition ≤ 5 min.
Secondary (not for verdict): acquisition ≤ 7 days, first-session npc_talk share.
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/quest_chapter_prepost.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/quest_chapter_g2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from first5min_b3 import ENTRY_SQL  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

PRE, POST = ("2026-08-04", "2026-08-15"), ("2026-08-19", "2026-08-29")
SQL = f"""
WITH c AS ({ENTRY_SQL})
SELECT c.person, c.d0, c.sec AS ttfa_sec,
  LOGICAL_OR(e.event_name = 'npc_talk') AS talk_s1
FROM c LEFT JOIN `{GA4}.events_*` e
  ON e.user_pseudo_id = c.entry_pid AND REGEXP_CONTAINS(e._TABLE_SUFFIX, r'^[0-9]{{8}}$')
  AND (SELECT value.int_value FROM UNNEST(e.event_params) WHERE key = 'ga_session_id') = c.entry_sid
GROUP BY 1, 2, 3
"""


def main() -> None:
    d = read_sql(SQL).sort_values("person").reset_index(drop=True)
    d["d0"] = pd.to_datetime(d["d0"])
    d["acq5"] = d.ttfa_sec.notna() & (d.ttfa_sec <= 300)
    d["acq7"] = d.ttfa_sec.notna()
    d["talk_s1"] = d["talk_s1"].fillna(False).astype(bool)
    pre = d[(d.d0 >= PRE[0]) & (d.d0 <= PRE[1])]
    post = d[(d.d0 >= POST[0]) & (d.d0 <= POST[1])]
    a, b = post.acq5.to_numpy(float), pre.acq5.to_numpy(float)
    diff = a.mean() - b.mean()
    rng = np.random.default_rng(20261012)
    bs = [rng.choice(a, len(a)).mean() - rng.choice(b, len(b)).mean() for _ in range(2000)]
    lo, hi = np.percentile(bs, [2.5, 97.5])
    print(f"before {PRE} n={len(pre)} · after {POST} n={len(post)}")
    print(f"5-min first acquisition: before {b.mean():.0%} · after {a.mean():.0%} · diff {diff * 100:+.1f}%p 95% CI [{lo * 100:+.1f}, {hi * 100:+.1f}]")
    if min(len(a), len(b)) < 30:
        v = "DIRECTION ONLY (a cohort has n < 30)"
    elif hi < 0 and diff <= -.15:
        v = "SUPPORTED"
    elif lo > 0:
        v = "OPPOSITE"
    else:
        v = "NOT DETERMINABLE"
    print(f"verdict (pre-registered): {v}")
    print(f"  secondary acq ≤7d: before {pre.acq7.mean():.0%} · after {post.acq7.mean():.0%}")
    print(f"  secondary first-session npc_talk: before {pre.talk_s1.mean():.0%} · after {post.talk_s1.mean():.0%}")

    report.setup()
    labels = [f"이전 8/4~8/15\n(n={len(pre)})", f"이후 8/19~8/29\n(n={len(post)})"]
    fig, ax = report.new("퀘스트 챕터화 묶음 전후 신규의 5분 안 첫 획득", len(pre) + len(post),
                         sub=f"대조군 없음 · 이후 기간에 다른 배포 다수(영어·도구바·의뢰 생성·바다터) · 차이 {diff * 100:+.0f}%p (95% CI {lo * 100:+.0f}~{hi * 100:+.0f}) · 방향만",
                         ylab="5분 안 첫 획득 (%)")
    vals = [b.mean() * 100, a.mean() * 100]
    bars = ax.bar(labels, vals, color=[report.PALETTE[1], report.PALETTE[0]], width=0.5)
    for bar, val in zip(bars, vals):
        ax.text(bar.get_x() + bar.get_width() / 2, val + 1.5, f"{val:.0f}%", ha="center", fontsize=11)
    ax.set_ylim(0, 100)
    print(report.check(report.save(fig, ax, "quest_chapter_prepost")))


if __name__ == "__main__":
    main()
