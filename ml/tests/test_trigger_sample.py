"""표본 SQL 이 재현 가능하고 누수가 없는지 검증한다. BQ 를 실제로 친다(읽기 전용)."""
from pathlib import Path

import pandas as pd

from calm_ml import bq

SQL = str(Path(__file__).resolve().parents[1] / "sql" / "churn_trigger_sample.sql")

# 라벨/진단 컬럼 — 학습 입력에 절대 섞이면 안 되는 것들
LEAK = {"span_sec", "pts", "y", "remain_sec", "trigger_rn", "session_id", "client_id", "started_at"}
CAP = 20   # 설계서 §5 — 클라이언트당 세션 상한(실측으로 5보다 나음)

FEATURES = ["path_len", "net_disp", "wander_ratio", "yaw_total",
            "mouse_travel", "idle_ratio", "is_first_session", "trigger_kind"]


def test_columns_exact():
    df = bq.read_sql_file(SQL, cap=CAP)
    for c in FEATURES:
        assert c in df.columns, f"피처 {c} 가 없다"
    assert "y" in df.columns


def test_no_leak_columns_in_features():
    """피처 목록과 누수 블랙리스트가 겹치면 안 된다."""
    assert not (set(FEATURES) & LEAK)


def test_reproducible():
    """같은 파라미터로 두 번 돌리면 완전히 같은 표본이 나와야 한다."""
    key = ["session_id", "trigger_kind", "trigger_rn"]
    a = bq.read_sql_file(SQL, cap=CAP).sort_values(key).reset_index(drop=True)
    b = bq.read_sql_file(SQL, cap=CAP).sort_values(key).reset_index(drop=True)
    pd.testing.assert_frame_equal(a, b)


def test_label_has_variance():
    """라벨이 한쪽으로 쏠리면(>95%) 학습할 게 없다 — 스펙 §2 의 기기 단위 실패를 반복하지 않는다."""
    df = bq.read_sql_file(SQL, cap=CAP)
    rate = df["y"].mean()
    assert 0.05 < rate < 0.95, f"라벨 쏠림: y={rate:.1%}"


def test_both_triggers_present():
    df = bq.read_sql_file(SQL, cap=CAP)
    kinds = set(df["trigger_kind"].unique())
    assert kinds == {"time15", "quest"}, f"트리거 종류가 예상과 다르다: {kinds}"


def test_sample_size_near_measured():
    """표본이 실측 확정치에서 크게 벗어나면 조인이나 필터가 바뀐 것이다."""
    df = bq.read_sql_file(SQL, cap=CAP)
    assert 400 <= len(df) <= 650, f"표본 507건 근처여야 한다: {len(df)}"
    n = df.groupby("trigger_kind").size()
    assert n["time15"] > 150 and n["quest"] > 150, f"트리거별 표본이 무너졌다: {dict(n)}"


def test_trigger_base_rates_differ():
    """설계서 §4 의 전제 — 트리거별 기저율이 다르므로 임계값을 따로 둬야 한다."""
    df = bq.read_sql_file(SQL, cap=CAP)
    r = df.groupby("trigger_kind")["y"].mean()
    assert r["time15"] > r["quest"], "time15 기저율이 quest 보다 높아야 한다"
