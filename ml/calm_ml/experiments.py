# =============================================================
#  calm forest · 실험 요약 계산 (관리자 실험 페이지 · ml/scripts/experiment_summary.py)
#  ------------------------------------------------------------
#  BigQuery 에서 뽑은 표를 받아 화면이 쓰는 숫자(군별 n·성공 수·누적 추이·공식 검정)로 줄인다.
#  DB·네트워크를 모른다 — 테스트(ml/tests/test_experiments.py)가 그대로 부를 수 있게.
# =============================================================
from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd


def _is_true(v) -> bool:
    """BQ BOOL → pandas 는 numpy.bool_·pd.NA 로 준다. `is True` 비교는 numpy.bool_ 에서 틀리므로 값으로 판정."""
    if v is None:
        return False
    try:
        return bool(v)
    except TypeError:          # pd.NA — 알 수 없음은 '게스트 아님'으로 본다(user_id 가 있으면 계정 세션)
        return False


def resident_key(user_id, is_guest, client_id) -> str | None:
    """주민 키 — 로그인 계정이면 u:<user_id>, 아니면 기기 c:<client_id> (힌트 배너 사전등록 정의)."""
    if isinstance(user_id, str) and user_id and not _is_true(is_guest):
        return f"u:{user_id}"
    if isinstance(client_id, str) and client_id:
        return f"c:{client_id}"
    return None


def revisit_within(targets: pd.DataFrame, starts: pd.DataFrame, days: int = 7) -> pd.Series:
    """targets(session_id, resident, t0) 마다: 같은 주민이 t0 이후 days 일 안에 **다른 세션**을 시작했는가."""
    m = targets[["session_id", "resident", "t0"]].merge(
        starts[["resident", "session_id", "start"]].rename(columns={"session_id": "other"}), on="resident", how="left")
    hit = (m["other"] != m["session_id"]) & (m["start"] > m["t0"]) & (m["start"] <= m["t0"] + pd.Timedelta(days=days))
    by = hit.groupby(m["session_id"]).any()
    return targets["session_id"].map(by).fillna(False).astype(bool).reset_index(drop=True)


def prop_arms(df: pd.DataFrame, arm_col: str, y_col: str, order: Iterable[tuple[str, str]]) -> list[dict]:
    """비율 지표의 군별 표본 n·성공 x. order 의 첫 군이 처치."""
    out = []
    for key, label in order:
        g = df.loc[df[arm_col] == key, y_col]
        out.append({"key": key, "label": label, "n": int(g.size), "x": int(g.sum())})
    return out


def mean_arms(df: pd.DataFrame, arm_col: str, v_col: str, order: Iterable[tuple[str, str]]) -> list[dict]:
    """평균 지표의 군별 n·평균·표준편차(표본, n=1 이면 0)."""
    out = []
    for key, label in order:
        g = df.loc[df[arm_col] == key, v_col].astype(float)
        sd = float(g.std(ddof=1)) if g.size > 1 else 0.0
        out.append({"key": key, "label": label, "n": int(g.size), "mean": round(float(g.mean()), 3) if g.size else None,
                    "sd": round(sd, 3)})
    return out


def daily_cumulative(df: pd.DataFrame, day_col: str, arm_col: str, y_col: str, t: str, c: str) -> list[dict]:
    """날마다 누적한 [n, x] — 화면이 날짜별로 차이와 CI 띠를 다시 그린다."""
    days = sorted(df[day_col].astype(str).unique())
    out, nt, xt, nc, xc = [], 0, 0, 0, 0
    for d in days:
        g = df[df[day_col].astype(str) == d]
        gt, gc = g[g[arm_col] == t][y_col], g[g[arm_col] == c][y_col]
        nt, xt, nc, xc = nt + int(gt.size), xt + int(gt.sum()), nc + int(gc.size), xc + int(gc.sum())
        out.append({"day": d, "t": [nt, xt], "c": [nc, xc]})
    return out


def _diff(y: np.ndarray, arm: np.ndarray) -> float:
    return float(y[arm == 1].mean() - y[arm == 0].mean())


def randomization_pvalue(y, arm, n_perm: int = 10_000, seed: int = 0) -> float:
    """세션 단위 배정을 n_perm 번 다시 섞어 본 양측 p — 배정이 세션마다 독립이라 유효(사전등록 검정)."""
    y, arm = np.asarray(y, float), np.asarray(arm, int)
    obs = abs(_diff(y, arm))
    rng = np.random.default_rng(seed)
    hits = sum(abs(_diff(y, rng.permutation(arm))) >= obs - 1e-12 for _ in range(n_perm))
    return (hits + 1) / (n_perm + 1)


def cluster_bootstrap_ci(y, arm, cluster, n_boot: int = 2000, seed: int = 0, alpha: float = 0.05) -> tuple[float, float]:
    """주민 단위로 통째로 다시 뽑은 차이(처치 − 대조)의 95% 구간, %p. 한 주민의 여러 세션이 독립이 아니라서."""
    y, arm, cluster = np.asarray(y, float), np.asarray(arm, int), np.asarray(cluster)
    ids = np.unique(cluster)
    idx_by = {k: np.flatnonzero(cluster == k) for k in ids}
    rng = np.random.default_rng(seed)
    stats = []
    for _ in range(n_boot):
        pick = np.concatenate([idx_by[k] for k in rng.choice(ids, size=ids.size, replace=True)])
        a = arm[pick]
        if a.min() == a.max():
            continue                                      # 한쪽 군만 뽑힌 표본은 차이를 못 잰다
        stats.append(_diff(y[pick], a))
    lo, hi = np.quantile(stats, [alpha / 2, 1 - alpha / 2])
    return round(float(lo) * 100, 2), round(float(hi) * 100, 2)
