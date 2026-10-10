"""관리자 실험 페이지 요약 — BigQuery 에서 실험별 숫자를 계산해 Supabase cf_experiment_results 에 넣는다.

매일 03:00 KST (.github/workflows/supabase-to-bq.yml, 적재 다음 단계). 수동:
    SUPABASE_URL=… SUPABASE_SERVICE_ROLE=… ml/.venv/bin/python ml/scripts/experiment_summary.py [--dry-run]

정의는 실험마다 고정 문서를 따른다:
  hint   dev/active/metrics-framework/hint-banner-ab-prereg.md (2026-10-08 고정 — 고치지 말 것)
  probe  docs/superpowers/specs/2026-09-22-difficulty-probe-design.md · sql/analytics/difficulty_probe.sql
  guide  무작위 배정 없음 — 설명용 숫자만(효과 판정 안 함)
  beta   docs/beta/BETA_AB_TEST_PLAN.md ① 번들 A/B (처치 = A)
화면이 하는 계산(차이·CI·SRM·최소 검출 효과)은 dashboards/js/admin-metrics.js 가 한다 — 여기선 원재료와
사전등록이 요구하는 공식 검정(randomization p · 주민 클러스터 부트스트랩)만 만든다.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if os.environ.get("GCP_SA_KEY"):   # GitHub Actions — export_to_bq.py 와 같은 방식으로 서비스계정 키를 쓴다
    _p = os.path.join(tempfile.gettempdir(), "gcp_sa.json")
    with open(_p, "w") as f:
        f.write(os.environ["GCP_SA_KEY"])
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _p

from calm_ml import bq  # noqa: E402
from calm_ml.experiments import (  # noqa: E402
    cluster_bootstrap_ci, daily_cumulative, mean_arms, prop_arms, randomization_pvalue, resident_key, revisit_within,
)

KST = "Asia/Seoul"
RAW = "`calm-forest.calm_forest_raw`"
GA4 = "`calm-forest.analytics_547127440.events_*`"

# 세션 요약 최신 행(세션당 여러 번 적재됨) — 주민 키·시작 시각의 원천
SESSIONS_SQL = f"""
select session_id, user_id, is_guest, nullif(client_id, '') as client_id, platform, variant,
       coalesce(started_at, updated_at) as start, updated_at, play_sec, counts
from (select *, row_number() over (partition by session_id order by updated_at desc) rn from {RAW}.session_logs)
where rn = 1
"""


def _starts(sessions: pd.DataFrame) -> pd.DataFrame:
    s = sessions.copy()
    s["resident"] = [resident_key(u, g, c) for u, g, c in zip(s.user_id, s.is_guest, s.client_id)]
    return s.dropna(subset=["resident"])


def _kst_day(ts: pd.Series) -> pd.Series:
    return pd.to_datetime(ts, utc=True).dt.tz_convert(KST).dt.strftime("%Y-%m-%d")


# ── 힌트 배너 개입(사전등록) ──────────────────────────────────────
HINT_SQL = f"""
select session_id,
       min(if(intervene, `at`, null)) as t0,
       array_agg(distinct arm ignore nulls) as arms,
       coalesce(logical_or(origin is null or origin = '' or regexp_contains(origin, r'localhost|127\\.0\\.0\\.1')), true) as bad_origin,
       coalesce(logical_or(variant in ('beta_A', 'beta_B')), false) as beta,   -- NULL 이면 NA 마스크로 세션이 조용히 빠진다
       any_value(nullif(client_id, '')) as ce_client
from {RAW}.churn_events
group by session_id
having t0 is not null
"""
HINT_FROM = pd.Timestamp("2026-09-06", tz=KST)
HINT_TO = pd.Timestamp("2026-10-07", tz=KST)          # 10/6 끝까지
P1_SINCE = pd.Timestamp("2026-09-28", tz=KST)


def run_hint(sessions: pd.DataFrame) -> dict:
    ev = bq.read_sql(HINT_SQL)
    ev["t0"] = pd.to_datetime(ev["t0"], utc=True)
    ev = ev[(ev.t0 >= HINT_FROM) & (ev.t0 < HINT_TO)]
    n_mixed = int((ev.arms.map(len) != 1).sum())
    ev = ev[(ev.arms.map(len) == 1) & ~ev.bad_origin & ~ev.beta].copy()
    ev["arm"] = ev.arms.map(lambda a: a[0])

    st = _starts(sessions)
    ev = ev.merge(st[["session_id", "user_id", "is_guest", "client_id", "platform", "updated_at"]], on="session_id", how="left")
    ev = ev[ev.platform.fillna("") != "itch"]
    # 페르소나 P1(사전등록 그대로): 기기 4대+ 이고 첫 등장이 9/28 이후인 user_id
    per_user = st.dropna(subset=["user_id"]).groupby("user_id").agg(devices=("client_id", "nunique"), first=("start", "min"))
    p1 = set(per_user[(per_user.devices >= 4) & (pd.to_datetime(per_user["first"], utc=True) >= P1_SINCE)].index)
    ev = ev[~ev.user_id.isin(p1)]
    data_max = pd.to_datetime(st.updated_at, utc=True).max()
    ev = ev[ev.t0 <= data_max - pd.Timedelta(days=7)].copy()     # 7일 관측이 끝난 세션만
    ev["resident"] = [resident_key(u, g, c if c else cc) for u, g, c, cc in zip(ev.user_id, ev.is_guest, ev.client_id, ev.ce_client)]
    ev = ev.dropna(subset=["resident"]).reset_index(drop=True)

    st2 = st[["resident", "session_id", "start"]].copy()
    st2["start"] = pd.to_datetime(st2.start, utc=True)
    ev["y"] = revisit_within(ev[["session_id", "resident", "t0"]], st2, days=7).astype(int).values
    ev["y60"] = ((pd.to_datetime(ev.updated_at, utc=True) - ev.t0).dt.total_seconds() >= 60).astype(int)
    ev["day"] = _kst_day(ev.t0)

    order = [("treat", "배너 노출"), ("control", "보류")]
    arm01 = (ev.arm == "treat").astype(int).values
    official = None
    if ev.arm.nunique() == 2:
        lo, hi = cluster_bootstrap_ci(ev.y.values, arm01, ev.resident.values, n_boot=2000, seed=7)
        official = {
            "d": round(float(ev.y[arm01 == 1].mean() - ev.y[arm01 == 0].mean()) * 100, 2), "lo": lo, "hi": hi,
            "p": round(randomization_pvalue(ev.y.values, arm01, n_perm=10_000, seed=7), 4),
            "method": "randomization 10,000회 · 주민 클러스터 부트스트랩 2,000회",
            "complete": bool(data_max >= HINT_TO + pd.Timedelta(days=7)),
        }
    return {
        "type": "prop", "compare": ["treat", "control"],
        "arms": prop_arms(ev, "arm", "y", order),
        "secondary": [{"label": "개입 뒤 60초 더 머묾", "type": "prop", "arms": prop_arms(ev, "arm", "y60", order)}],
        "daily": daily_cumulative(ev, "day", "arm", "y", "treat", "control"),
        "official": official,
        "window": {"from": "2026-09-06", "to": "2026-10-06", "data_max": data_max.isoformat()},
        "notes": [f"arm 이 섞인 세션 {n_mixed}개 제외", f"페르소나 P1 user_id {len(p1)}개 제외", f"주민 {ev.resident.nunique()}명"],
    }


# ── 난이도 probe · 낚시 ─────────────────────────────────────────
PROBE_SQL = f"""
select date(timestamp_micros(event_timestamp), '{KST}') as day, user_pseudo_id, user_id,
       (select value.int_value from unnest(event_params) where key = 'arm') as arm,
       if(event_name = 'fishing_catch', 1, 0) as y
from {GA4}
where regexp_contains(_TABLE_SUFFIX, r'^[0-9]{{8}}$') and _TABLE_SUFFIX >= '20260926'   -- events_intraday_* 는 다음 날 events_* 와 겹친다
  and (event_name in ('fishing_catch', 'fishing_miss')
       or (event_name = 'minigame_abandon'
           and (select value.string_value from unnest(event_params) where key = 'game') = 'fish'
           and coalesce((select value.string_value from unnest(event_params) where key = 'stage'), '') != 'wait'))
  and (select coalesce(value.int_value, safe_cast(value.string_value as int64)) from unnest(event_params) where key = 'probe_v') = 2
  and (user_id is null or user_id not in unnest(@persona_ids))
"""


def run_probe(persona_ids: list[str]) -> dict:
    df = bq.read_sql(PROBE_SQL, persona_ids=persona_ids)
    df = df.dropna(subset=["arm"]).copy()
    df["arm"] = df.arm.astype(int).astype(str)
    df["day"] = df.day.astype(str)
    order = [("0", "어려움 ×0.45"), ("1", "중간 ×0.65"), ("2", "기본 ×1.0")]   # js/tuning.js DIFFICULTY.fish.arms
    return {
        "type": "prop", "compare": ["0", "2"],
        "arms": prop_arms(df, "arm", "y", order),
        "secondary": [],
        "daily": daily_cumulative(df, "day", "arm", "y", "0", "2"),
        "official": None,
        "window": {"from": "2026-09-26", "to": None},
        "notes": [f"플레이어 {df.user_pseudo_id.nunique()}명 · 페르소나 제외 · probe_v=2(블록 셔플)만",
                  "입질 뒤 포기는 실패로 셈 · 입질 전(wait) 포기는 팔을 겪기 전이라 제외",
                  "판 단위 Wald 근사 — 한 사람의 여러 판이 묶여 있어 공식 분석은 계층 로지스틱"],
    }


# ── 리텐션 안내 배너(정책 · 무작위 아님) ─────────────────────────
GUIDE_SQL = f"""
select session_id, min(created_at) as t0, coalesce(logical_or(final_eligible), false) as shown,
       any_value(user_id) as user_id, any_value(nullif(client_id, '')) as client_id, logical_and(is_guest) as is_guest
from {RAW}.retention_guidance_scores
group by session_id
"""


def run_guide(sessions: pd.DataFrame, persona_ids: list[str]) -> dict:
    g = bq.read_sql(GUIDE_SQL)
    g["t0"] = pd.to_datetime(g.t0, utc=True)
    g = g[~g.user_id.isin(persona_ids)]
    st = _starts(sessions)
    data_max = pd.to_datetime(st.updated_at, utc=True).max()
    g = g[g.t0 <= data_max - pd.Timedelta(days=7)].copy()
    g["resident"] = [resident_key(u, gu, c) for u, gu, c in zip(g.user_id, g.is_guest, g.client_id)]
    g = g.dropna(subset=["resident"]).reset_index(drop=True)
    st2 = st[["resident", "session_id", "start"]].copy()
    st2["start"] = pd.to_datetime(st2.start, utc=True)
    g["y"] = revisit_within(g[["session_id", "resident", "t0"]], st2, days=7).astype(int).values
    g["arm"] = g.shown.map({True: "shown", False: "held"})
    return {
        "type": "prop", "compare": ["shown", "held"],
        "arms": prop_arms(g, "arm", "y", [("shown", "안내 노출"), ("held", "대상이었으나 억제")]),
        "secondary": [], "daily": [], "official": None,
        "window": {"from": "2026-09-19", "to": None, "data_max": data_max.isoformat()},
        "notes": ["억제 이유(세션당 1회·메뉴·바다 등)가 무작위가 아니다 — 차이는 효과가 아니다"],
    }


# ── 베타 번들 A/B (처치 = A) ───────────────────────────────────
ACTIVITIES = ("plant_seed", "water_crop", "harvest_crop", "chop_tree", "forage_pick", "mine_ore", "fishing_cast", "sea_cast",
              "boat_start", "mist_enter", "cooking_start", "carve_start", "cafe_serve", "craft_item", "coop_feed",
              "coop_collect", "shop_buy", "shop_sell", "npc_talk", "quest_complete", "firefly_swing")


def run_beta(sessions: pd.DataFrame) -> dict:
    s = sessions[sessions.variant.isin(["beta_A", "beta_B"])].copy()
    s["day"] = _kst_day(s.start)
    s = s[(s.day >= "2026-09-09") & (s.day <= "2026-09-15")]            # 테스트 주간(계획서 §3)
    s["user"] = s.user_id.fillna(s.client_id)

    def kinds(counts_list) -> int:
        seen = set()
        for c in counts_list:
            try:
                obj = json.loads(c) if isinstance(c, str) else (c or {})
            except json.JSONDecodeError:
                obj = {}
            seen |= {k for k, v in obj.items() if k in ACTIVITIES and str(v).isdigit() and int(v) > 0}
        return len(seen)

    per = s.groupby("user").agg(arm=("variant", "first"), sessions=("session_id", "nunique"), days=("day", "nunique"),
                                play=("play_sec", "sum"), counts=("counts", list)).reset_index()
    per["kinds"] = per["counts"].map(kinds)
    per["extra_visits"] = per.sessions - per.days                       # 하루 1회 초과 접속
    per["play_min"] = per.play.fillna(0) / 60
    order = [("beta_A", "번들 A(처치)"), ("beta_B", "번들 B")]
    return {
        "type": "mean", "compare": ["beta_A", "beta_B"], "unit_label": "가지",
        "arms": mean_arms(per, "arm", "kinds", order),
        "secondary": [{"label": "자발 접속(하루 1회 초과)", "type": "mean", "unit_label": "회", "arms": mean_arms(per, "arm", "extra_visits", order)},
                      {"label": "총 플레이 시간", "type": "mean", "unit_label": "분", "arms": mean_arms(per, "arm", "play_min", order)}],
        "daily": [], "official": None,
        "window": {"from": "2026-09-09", "to": "2026-09-15"},
        "notes": ["계획서 판단: 방향만 — 세 지표가 같은 방향이면 신호, 갈리면 무효"],
    }


# ── Supabase 쓰기 ────────────────────────────────────────────────
def _headers() -> dict:
    key = os.environ["SUPABASE_SERVICE_ROLE"]
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def persona_ids() -> list[str]:
    r = requests.post(f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/rpc/cf_persona_user_ids", headers=_headers(), json={}, timeout=60)
    r.raise_for_status()
    return [x if isinstance(x, str) else x.get("cf_persona_user_ids") for x in r.json()]


def upsert(exp_id: str, result: dict) -> None:
    row = {"exp_id": exp_id, "computed_at": datetime.now(timezone.utc).isoformat(), "source": "bq", "result": result}
    r = requests.post(f"{os.environ['SUPABASE_URL'].rstrip('/')}/rest/v1/cf_experiment_results?on_conflict=exp_id",
                      headers={**_headers(), "Prefer": "resolution=merge-duplicates,return=minimal"}, json=row, timeout=60)
    r.raise_for_status()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    pids = persona_ids()
    sessions = bq.read_sql(SESSIONS_SQL)
    jobs = {"hint": lambda: run_hint(sessions), "probe": lambda: run_probe(pids),
            "guide": lambda: run_guide(sessions, pids), "beta": lambda: run_beta(sessions)}
    failed = []
    for exp_id, job in jobs.items():
        try:
            res = job()
        except Exception as e:      # 한 실험이 실패해도 나머지는 갱신하고, 끝에서 실패로 알린다
            failed.append(f"{exp_id}: {e!r}")
            continue
        arms = ", ".join(f"{x['key']} n={x['n']}" for x in res["arms"])
        print(f"[{exp_id}] {arms}" + (f" · official p={res['official']['p']}" if res.get("official") else ""))
        if not a.dry_run:
            upsert(exp_id, res)
    if failed:
        raise SystemExit("실험 요약 실패: " + " | ".join(failed))


if __name__ == "__main__":
    main()
