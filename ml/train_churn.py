# =============================================================
#  calm forest · 세션 이탈 예측 학습 — BQ → 계수 JSON
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §5
#  ▶ 손으로:  uv run --directory ml python train_churn.py --out /tmp/coef.json --no-wandb
#  ▶ 주 1회:  infra/airflow/dags/churn_train.py 가 이걸 호출한다
#
#  ⚠️ FEATURE_ORDER 는 js/features.js · ml/api/churn.py 와 순서까지 같아야 한다.
#     계수 벡터가 그 순서로 저장되고, API 가 그 순서로 내적을 계산한다.
# =============================================================
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import GroupKFold
from sklearn.preprocessing import StandardScaler

# js/features.js 의 FEATURE_ORDER 와 동일한 순서
FEATURE_ORDER = [
    "path_len", "net_disp", "wander_ratio", "yaw_total",
    "mouse_travel", "idle_ratio", "is_first_session", "trigger_kind",
]

# 학습 입력에 절대 넣지 않는다 — 라벨 자체이거나 세션 길이의 대리값
EXCLUDED = ["y", "span_sec", "pts", "remain_sec", "trigger_rn",
            "session_id", "client_id", "started_at"]

SQL = Path(__file__).parent / "sql" / "churn_trigger_sample.sql"
TRIGGERS = ("time15", "quest")


def _prepare(df: pd.DataFrame):
    """피처 행렬·라벨·그룹·대치값. EXCLUDED 컬럼은 아예 만지지 않는다."""
    impute: dict[str, float] = {}
    X = pd.DataFrame(index=df.index)
    for c in FEATURE_ORDER:
        col = df[c]
        if c == "trigger_kind" and not pd.api.types.is_numeric_dtype(col):
            # SQL 은 문자열('time15'/'quest'), JS·API 는 0/1 을 보낸다. 0/1 로 맞춘다.
            # ⚠️ dtype == object 로 검사하면 안 된다 — pandas 3 은 문자열을 Arrow 타입으로 잡는다.
            col = (col == "quest").astype(float)
        col = pd.to_numeric(col, errors="coerce").astype(float)
        # 대치값은 **결측이 없어도 항상** 싣는다. 학습 표본에 결측이 없더라도
        # 서빙에서는 net_disp=0 → wander_ratio=null 이 실제로 22% 나온다(실측).
        # 그때 API 가 쓸 값이 없으면 0.0 으로 떨어져 학습과 다른 입력이 된다.
        med = col.median()
        impute[c] = float(med) if np.isfinite(med) else 0.0
        X[c] = col.fillna(impute[c])
    return X.to_numpy(dtype=float), df["y"].to_numpy(dtype=int), df["client_id"].to_numpy(), impute


def _cv_oof(X, y, groups, n_splits=5):
    """GroupKFold OOF 예측 — 같은 클라이언트가 학습/검증에 동시에 들어가지 않게 한다."""
    n_splits = max(2, min(n_splits, len(np.unique(groups))))
    oof = np.zeros(len(y), dtype=float)
    for tr, te in GroupKFold(n_splits=n_splits).split(X, y, groups):
        if len(np.unique(y[tr])) < 2:
            oof[te] = y[tr].mean() if len(y[tr]) else 0.5
            continue
        sc = StandardScaler().fit(X[tr])
        clf = LogisticRegression(penalty="l2", C=1.0, max_iter=1000).fit(sc.transform(X[tr]), y[tr])
        oof[te] = clf.predict_proba(sc.transform(X[te]))[:, 1]
    return float(roc_auc_score(y, oof)), oof


def _bootstrap_ci(y, p, n_boot=1000, seed=0):
    rng = np.random.default_rng(seed)
    idx = np.arange(len(y))
    aucs = []
    for _ in range(n_boot):
        s = rng.choice(idx, size=len(idx), replace=True)
        if len(np.unique(y[s])) < 2:      # 한 클래스만 뽑히면 AUC 가 정의되지 않는다
            continue
        aucs.append(roc_auc_score(y[s], p[s]))
    if not aucs:
        return 0.0, 0.0
    return float(np.percentile(aucs, 2.5)), float(np.percentile(aucs, 97.5))


def _thresholds(df: pd.DataFrame, y: np.ndarray) -> dict[str, float]:
    """트리거별 임계값 = 그 트리거의 기저율.

    "이 트리거의 평균보다 위험할 때 개입한다"는 뜻이다.
    하나로 두면 안 되는 이유는 기저율이 크게 다르기 때문 — 실측 time15 52.8% vs quest 18.5%.
    0.5 하나를 쓰면 time15 에선 거의 항상, quest 에선 거의 안 띄운다(설계서 §4).
    """
    kinds = df["trigger_kind"]
    if pd.api.types.is_numeric_dtype(kinds):
        kinds = np.where(np.asarray(kinds) == 1, "quest", "time15")
    kinds = np.asarray(kinds, dtype=object)
    out = {}
    for k in TRIGGERS:
        m = np.asarray(kinds) == k
        out[k] = float(np.clip(y[m].mean(), 0.05, 0.95)) if m.sum() else 0.5
    return out


def fit_and_export(df: pd.DataFrame, out: Path | str, *, log_wandb: bool = True) -> dict:
    """표본 DataFrame → coef.json. 반환값은 저장한 dict 와 동일."""
    X, y, groups, impute = _prepare(df)

    auc, oof = _cv_oof(X, y, groups)
    ci_low, ci_high = _bootstrap_ci(y, oof)

    # 베이스라인 ① 다수 클래스 정확도 ② path_len 단일 피처 AUC
    base_majority = float(max(y.mean(), 1 - y.mean()))
    pl = X[:, FEATURE_ORDER.index("path_len")].reshape(-1, 1)
    base_auc, _ = _cv_oof(pl, y, groups)
    # ③ trigger_kind 단독 — 이게 전체 AUC 를 거의 다 설명하면 좌표 피처는 일을 안 하는 것이다
    tk = X[:, FEATURE_ORDER.index("trigger_kind")].reshape(-1, 1)
    tk_auc, _ = _cv_oof(tk, y, groups)

    # 최종 모델은 전체 표본으로 다시 적합한다(위 CV 는 성능 추정용)
    scaler = StandardScaler().fit(X)
    clf = LogisticRegression(penalty="l2", C=1.0, max_iter=1000).fit(scaler.transform(X), y)

    model = {
        "model_version": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "feature_order": FEATURE_ORDER,
        "coef": [float(v) for v in clf.coef_[0]],
        "intercept": float(clf.intercept_[0]),
        "scaler": {
            "mean": [float(v) for v in scaler.mean_],
            # scale 이 0이면 추론에서 0나눗셈 — 상수 피처를 대비해 1로 바닥을 깐다
            "scale": [float(v) if v > 1e-12 else 1.0 for v in scaler.scale_],
        },
        "impute": impute,
        "threshold": _thresholds(df, y),   # 트리거별 (설계서 §4)
        "enabled": True,
        "metrics": {
            "auc": auc,
            "auc_ci_low": ci_low,
            "auc_ci_high": ci_high,
            "baseline_majority": base_majority,
            "baseline_pathlen_auc": base_auc,
            "baseline_triggerkind_auc": tk_auc,
            "n": int(len(y)),
            "churn_rate": float(y.mean()),
        },
    }

    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # 원자적 교체 — API 가 반쯤 쓰인 파일을 읽지 않게 한다
    tmp = out.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(out)

    if log_wandb:
        from calm_ml.tracking import start_run
        run = start_run("churn-trigger", config={"cap": 20, "features": FEATURE_ORDER},
                        tags=["churn", "trigger"])
        run.log(model["metrics"])
        run.finish()

    return model


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/opt/calm-api/model/coef.json")
    ap.add_argument("--cap", type=int, default=20, help="클라이언트당 세션 상한")
    ap.add_argument("--no-wandb", action="store_true")
    a = ap.parse_args()

    from calm_ml import bq
    df = bq.read_sql_file(str(SQL), cap=a.cap)
    m = fit_and_export(df, a.out, log_wandb=not a.no_wandb)
    print(json.dumps(m["metrics"], indent=2, ensure_ascii=False))
    print("threshold:", json.dumps(m["threshold"], ensure_ascii=False))


if __name__ == "__main__":
    main()
