"""First-5-min — exploratory segmentation (NOT a verdict; hypothesis generation only).

Rules fixed before looking: cells with n < 30 are greyed (no direction read); a cell is "notable" only
when the overall rate lies outside the cell's 95% Wilson interval; many cells are compared at once, so
notable cells can be chance. Cohort = entered new users 7/27~9/27 (time_to_first_acquisition rules).
Outcomes: quick = entry-session stay < 2.1 min · acq5 = first acquisition ≤ 5 min · acq7 = within 7 days.
Prints aggregates only (PUBLIC repo). Writes ml/reports/first5min_segments.csv (aggregates only).
Run: ml/.venv/bin/python dev/active/metrics-framework/validation/first5min_segments.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from first5min_b3 import ENTRY_SQL, BASELINE_MIN  # noqa: E402
from ltv_engagement import channel_of  # noqa: E402
from hierarchy_baseline import GA4, read_sql  # noqa: E402

MIN_N = 30
OUT = Path(__file__).resolve().parents[4] / "ml" / "reports" / "first5min_segments.csv"
FARM_Q = {"plant", "water", "collect_crop", "harvest", "till", "crop"}
FISH_Q = {"fish", "fish_rare", "forage", "mine", "boat", "sea"}

SQL = f"""
WITH c AS ({ENTRY_SQL}),
ev AS (
  SELECT e.*, (SELECT value.int_value FROM UNNEST(e.event_params) WHERE key = 'ga_session_id') AS sid
  FROM `{GA4}.events_*` e
  WHERE REGEXP_CONTAINS(_TABLE_SUFFIX, r'^[0-9]{{8}}$') AND e.user_pseudo_id IN (SELECT entry_pid FROM c)
),
dev AS (
  SELECT user_pseudo_id AS pid,
    ARRAY_AGG(STRUCT(device.category AS cat, device.operating_system AS os, device.web_info.browser AS br,
                     geo.country AS country, device.language AS lang, traffic_source.source AS src, traffic_source.medium AS med)
              ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] AS d
  FROM ev GROUP BY 1
),
sess AS (
  SELECT c.person,
    (MAX(ev.event_timestamp) - MIN(ev.event_timestamp)) / 1e6 AS stay_sec,
    ARRAY_AGG(IF(ev.event_name = 'login', (SELECT value.string_value FROM UNNEST(ev.event_params) WHERE key = 'method'), NULL) IGNORE NULLS ORDER BY ev.event_timestamp LIMIT 1)[SAFE_OFFSET(0)] AS login_method,
    ARRAY_AGG(IF(ev.event_name = 'character_select', (SELECT value.string_value FROM UNNEST(ev.event_params) WHERE key = 'animal'), NULL) IGNORE NULLS ORDER BY ev.event_timestamp LIMIT 1)[SAFE_OFFSET(0)] AS animal,
    ARRAY_AGG(IF(ev.event_name = 'tutorial_skip', (SELECT COALESCE(value.string_value, CAST(value.int_value AS STRING)) FROM UNNEST(ev.event_params) WHERE key = 'at'), NULL) IGNORE NULLS ORDER BY ev.event_timestamp LIMIT 1)[SAFE_OFFSET(0)] AS skip_at,
    LOGICAL_OR(ev.event_name = 'tutorial_complete') AS tut_done,
    LOGICAL_OR(ev.event_name = 'tutorial_start') AS tut_start,
    ARRAY_AGG(IF(ev.event_name = 'quest_offered', (SELECT value.string_value FROM UNNEST(ev.event_params) WHERE key = 'quest_type'), NULL) IGNORE NULLS ORDER BY ev.event_timestamp LIMIT 1)[SAFE_OFFSET(0)] AS first_qtype
  FROM c JOIN ev ON ev.user_pseudo_id = c.entry_pid AND ev.sid = c.entry_sid
  GROUP BY 1
)
SELECT c.person, c.platform, c.d0, c.entry_ts, c.sec AS ttfa_sec, s.stay_sec, s.login_method, s.animal, s.skip_at,
  s.tut_done, s.tut_start, s.first_qtype, dev.d.cat, dev.d.os, dev.d.br, dev.d.country, dev.d.lang, dev.d.src, dev.d.med
FROM c LEFT JOIN sess s USING (person) LEFT JOIN dev ON dev.pid = c.entry_pid
"""


def wilson(k: int, n: int) -> tuple[float, float]:
    if n == 0:
        return (np.nan, np.nan)
    z, p = 1.96, k / n
    den = 1 + z * z / n
    mid = (p + z * z / (2 * n)) / den
    half = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return mid - half, mid + half


def browser_kind(br) -> str:
    if br is None or br != br:
        return "미상"
    return "앱 안 브라우저" if ("in-app" in br or "Webview" in br) else "일반 브라우저"


def build() -> pd.DataFrame:
    d = read_sql(SQL).sort_values("person").reset_index(drop=True)
    d["quick"] = d["stay_sec"] < BASELINE_MIN * 60
    d["acq5"] = d["ttfa_sec"].notna() & (d["ttfa_sec"] <= 300)
    d["acq7"] = d["ttfa_sec"].notna()
    t = pd.to_datetime(d["entry_ts"], unit="us", utc=True).dt.tz_convert("Asia/Seoul")
    d0 = pd.to_datetime(d["d0"])
    ax = {}
    ax["플랫폼"] = d["platform"]
    ax["기기"] = d["cat"].fillna("미상")
    ax["OS"] = d["os"].fillna("미상")
    ax["브라우저 종류"] = d["br"].map(browser_kind)
    ax["국가"] = np.where(d["country"] == "South Korea", "한국", "해외")
    ax["언어"] = np.where(d["lang"].fillna("").str.startswith("ko"), "한국어", "그 외")
    ax["유입 채널"] = channel_of(pd.DataFrame({"toss": d["platform"].eq("toss"), "src": d["src"], "med": d["med"]})).map(
        {"toss": "토스", "social": "소셜·커뮤니티", "organic_direct": "자연·직접", "meta_paid": "메타 광고"})
    ax["진입 시기"] = pd.cut(d0, pd.to_datetime(["2026-07-27", "2026-08-11", "2026-08-25", "2026-09-08", "2026-09-28"]),
                         labels=["7/27~8/10", "8/11~8/24", "8/25~9/7", "9/8~9/27"], right=False).astype(str)
    ax["요일"] = np.where(t.dt.dayofweek >= 5, "주말", "평일")
    ax["진입 시각"] = pd.cut(t.dt.hour, [-1, 6, 12, 18, 23], labels=["0~6시", "7~12시", "13~18시", "19~23시"]).astype(str)
    ax["로그인 방식"] = d["login_method"].fillna("기록 없음")
    ax["캐릭터"] = d["animal"].fillna("선택 기록 없음")
    sk = d["skip_at"].astype(str)
    ax["튜토리얼"] = np.select([d["tut_done"].fillna(False), d["skip_at"].notna() & sk.isin(["welcome", "-1", "0"]),
                             d["skip_at"].notna(), d["tut_start"].fillna(False)],
                            ["끝까지 봄", "시작하자마자 건너뜀", "도중에 건너뜀", "보다가 나감"], "튜토리얼 없음")
    q = d["first_qtype"]
    ax["첫 의뢰 종류"] = np.select([q.isin(FARM_Q), q.isin(FISH_Q), q.notna()], ["농사 의뢰", "낚시·채집·광산 의뢰", "마을 의뢰"], "첫 세션 의뢰 없음")
    for k, v in ax.items():
        d[f"seg::{k}"] = np.asarray(v)
    return d


def table(d: pd.DataFrame) -> pd.DataFrame:
    rows = []
    overall = {m: d[m].mean() for m in ("quick", "acq5", "acq7")}
    for col in [c for c in d.columns if c.startswith("seg::")]:
        axis = col.split("::", 1)[1]
        for val, g in d.groupby(col):
            n = len(g)
            r = {"axis": axis, "value": val, "n": n}
            for m in ("quick", "acq5", "acq7"):
                k = int(g[m].sum()); lo, hi = wilson(k, n)
                r[m] = k / n
                r[f"{m}_flag"] = "" if n < MIN_N else ("▲" if lo > overall[m] else "▼" if hi < overall[m] else "")
            rows.append(r)
    return pd.DataFrame(rows), overall


def main() -> None:
    d = build()
    t, overall = table(d)
    print(f"cohort {len(d)} · overall quick {overall['quick']:.0%} · acq5 {overall['acq5']:.0%} · acq7 {overall['acq7']:.0%}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    t.to_csv(OUT, index=False)
    for axis, g in t.groupby("axis", sort=False):
        print(f"\n[{axis}]")
        for _, r in g.sort_values("n", ascending=False).iterrows():
            grey = "  (n<30)" if r.n < MIN_N else ""
            print(f"  {str(r.value):18s} n={r.n:3d}  2분안이탈 {r.quick:4.0%}{r.quick_flag:1s}  5분획득 {r.acq5:4.0%}{r.acq5_flag:1s}  7일획득 {r.acq7:4.0%}{r.acq7_flag:1s}{grey}")


if __name__ == "__main__":
    main()
