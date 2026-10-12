"""First-5-min G2 · B3-a — where did the quick leavers (no acquisition, first session < 2.1 min) stop?

Pre-registered in first5min-hypotheses.md (B3-a). Cohort = entered new users, first entry 8/17~9/27
(character_select logged from 8/4, intro from 8/17). Target = no acquisition within 7 days and entry
session stay < 2.1 min. Last stage reached in the entry session:
  1 before character select (no character_select)  2 onboarding (character/intro/tutorial, no play)
  3 play started (any play action — the ATTEMPT list of new_user_first_week plus the B2 lists)
Prints aggregates only (PUBLIC repo). Chart -> ml/reports/figs/first5min_b3a_stage.png
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_b3a.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[4] / "ml"))
from first5min_b3 import ENTRY_SQL, BASELINE_MIN  # noqa: E402
from first5min_g1 import B2_PRODUCE, B2_TALK, ONBOARD  # noqa: E402
from new_user_first_week import ATTEMPT  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402
from calm_ml import report  # noqa: E402

WINDOW = ("2026-08-17", "2026-09-27")
PLAY = sorted(set(ATTEMPT) | set(B2_TALK) | set(B2_PRODUCE))

SQL = f"""
WITH c AS ({ENTRY_SQL}),
ev AS (
  SELECT user_pseudo_id AS pid, (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'ga_session_id') AS sid,
    event_name, event_timestamp AS ts
  FROM `{GA4}.events_*`
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND user_pseudo_id IN (SELECT entry_pid FROM c)
)
SELECT c.person, c.platform, c.d0, c.sec AS ttfa_sec,
  (MAX(ev.ts) - MIN(ev.ts)) / 1e6 AS stay_sec,
  ARRAY_AGG(DISTINCT ev.event_name) AS names
FROM c JOIN ev ON ev.pid = c.entry_pid AND ev.sid = c.entry_sid
WHERE c.d0 BETWEEN '{WINDOW[0]}' AND '{WINDOW[1]}'
GROUP BY 1, 2, 3, 4
"""


def stage(names) -> int:
    s = set(names if names is not None else [])
    if s & set(PLAY):
        return 3
    if s & set(ONBOARD):
        return 2
    return 1


def main() -> None:
    d = read_sql(SQL).sort_values("person").reset_index(drop=True)
    t = d[d["ttfa_sec"].isna() & (d["stay_sec"] < BASELINE_MIN * 60)].copy()
    print(f"cohort {WINDOW[0]}~{WINDOW[1]}: {len(d)} · target (no acquisition 7d, first session < {BASELINE_MIN} min) {len(t)}")
    t["stage"] = t["names"].map(stage)
    share = t["stage"].value_counts(normalize=True).reindex([1, 2, 3], fill_value=0)
    cnt = t["stage"].value_counts().reindex([1, 2, 3], fill_value=0)
    pre_play = share[1] + share[2]
    rng = np.random.default_rng(20261012)
    arr = (t["stage"] < 3).to_numpy(float)
    lo, hi = np.percentile([rng.choice(arr, len(arr)).mean() for _ in range(2000)], [2.5, 97.5])
    print(f"  ① before character select {cnt[1]} ({share[1]:.0%}) · ② onboarding {cnt[2]} ({share[2]:.0%}) · ③ play started {cnt[3]} ({share[3]:.0%})")
    print(f"  ①+② = {pre_play:.0%}  95% CI [{lo:.0%}, {hi:.0%}]")
    v = ("DIRECTION ONLY (n < 30) — " if len(t) < 30 else "") + \
        ("SUPPORTED (left before any play → shorten/skip onboarding)" if pre_play > .5 else
         "REJECTED (play started → first play experience)" if share[3] > .5 else "TIE")
    print(f"verdict (pre-registered): {v}")
    for p in ("web", "toss"):
        s = t[t.platform == p]["stage"].value_counts().reindex([1, 2, 3], fill_value=0)
        print(f"  [{p}] n={int(s.sum())} ①{s[1]} ②{s[2]} ③{s[3]}")
    on = t[t.stage == 2]["names"].map(lambda xs: sorted(set(xs) & set(ONBOARD)))
    last_on = pd.Series([e for xs in on for e in xs]).value_counts()
    print("  stage ② onboarding events seen (people): " + " · ".join(f"{k} {v}" for k, v in last_on.items()))
    one = t[t.stage == 1]["names"].map(lambda xs: sorted(set(xs)))
    ev1 = pd.Series([e for xs in one for e in xs]).value_counts().head(8)
    print("  stage ① events seen (people): " + " · ".join(f"{k} {v}" for k, v in ev1.items()))
    print(f"  median stay: " + " · ".join(f"stage{k} {t[t.stage == k].stay_sec.median():.0f}s" for k in (1, 2, 3) if (t.stage == k).any()))

    report.setup()
    labels = ["① 캐릭터 선택 기록 없음", "② 온보딩 중", "③ 플레이 시작"]
    vals = [share[k] * 100 for k in (1, 2, 3)]
    fig, ax = report.new("2분 안에 떠난 사람이 마지막으로 도달한 단계", len(t),
                         sub=f"첫 진입 8/17~9/27 · 7일 안 획득 없음 · 첫 세션 {BASELINE_MIN}분 안 종료 · 플레이 전 이탈(①+②) {pre_play:.0%} (95% CI {lo:.0%}~{hi:.0%})",
                         ylab="비율 (%)")
    bars = ax.bar(labels, vals, color=[report.PALETTE[0], report.RAMP[1], report.PALETTE[2]], width=0.55)
    for b, k, val in zip(bars, (1, 2, 3), vals):
        ax.text(b.get_x() + b.get_width() / 2, val + 1.5, f"{val:.0f}% ({int(cnt[k])}명)", ha="center", fontsize=11)
    ax.set_ylim(0, 100)
    print(report.check(report.save(fig, ax, "first5min_b3a_stage")))


if __name__ == "__main__":
    main()
