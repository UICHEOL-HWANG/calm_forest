from __future__ import annotations

import datetime as dt
import importlib.util
import sys
import types
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
DAG_PATH = REPO_ROOT / "infra" / "airflow" / "dags" / "ads_funnel_daily.py"
D = dt.date
SERIAL_1015 = (D(2026, 10, 15) - D(1899, 12, 30)).days


class _StubDAG:
    def __init__(self, dag_id=None, **kwargs):
        self.dag_id = dag_id
        self.kwargs = kwargs

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class _StubPythonOperator:
    def __init__(self, **kwargs):
        self.kwargs = kwargs

    def __rshift__(self, other):
        return other


@pytest.fixture
def m(monkeypatch):
    airflow_stub = types.ModuleType("airflow")
    airflow_stub.DAG = _StubDAG
    ops = types.ModuleType("airflow.operators")
    ops_py = types.ModuleType("airflow.operators.python")
    ops_py.PythonOperator = _StubPythonOperator
    pend = types.ModuleType("pendulum")
    pend.timezone = lambda name: types.SimpleNamespace(name=name)
    pend.datetime = lambda *a, tz=None: types.SimpleNamespace(args=a, tz=tz)
    for name, mod in {"airflow": airflow_stub, "airflow.operators": ops,
                      "airflow.operators.python": ops_py, "pendulum": pend}.items():
        monkeypatch.setitem(sys.modules, name, mod)
    spec = importlib.util.spec_from_file_location("ads_funnel_daily_dag", DAG_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _row(d, **kw):
    base = dict(d=d, landed=10, first_play=6, harvest=3, shown_aos=2, shown_ios=1, holdout=0,
                click_aos=1, click_ios=0, open_aos=1, open_ios=0, app_login=1, app_d1=0, no_campaign=0)
    base.update(kw)
    return base


def test_dag_runs_after_ga4_export_lands(m):
    assert m.dag_ads.dag_id == "ads_funnel_daily"
    assert m.dag_ads.kwargs["schedule"] == "0 10,20 * * *"
    assert m.dag_ads.kwargs["catchup"] is False
    assert m.dag_ads.kwargs["start_date"].tz.name == "Asia/Seoul"


@pytest.mark.parametrize("cell,expected", [
    (SERIAL_1015, D(2026, 10, 15)),
    (float(SERIAL_1015), D(2026, 10, 15)),
    ("2026-10-15", D(2026, 10, 15)),
    ("2026. 10. 15", D(2026, 10, 15)),
    ("", None),
    (None, None),
])
def test_to_date_reads_sheet_serials_and_text(m, cell, expected):
    assert m.to_date(cell) == expected


def test_to_date_rejects_garbage(m):
    with pytest.raises(ValueError):
        m.to_date("next monday")


def test_window_without_start_previews_last_14_days_and_skips_sheet(m):
    w = m.resolve_window(None, latest=D(2026, 10, 14))
    assert w == {"start": D(2026, 10, 1), "land_end": D(2026, 10, 14), "end": D(2026, 10, 14), "publish": False}


def test_window_caps_landing_at_14_days_but_keeps_following_events(m):
    w = m.resolve_window(D(2026, 10, 20), latest=D(2026, 11, 6))
    assert w == {"start": D(2026, 10, 20), "land_end": D(2026, 11, 2), "end": D(2026, 11, 6), "publish": True}


def test_window_before_campaign_has_no_data_yet(m):
    assert m.resolve_window(D(2026, 10, 20), latest=D(2026, 10, 18)) is None


def test_sheet_updates_touch_only_auto_columns_and_blank_unfinished_d1(m):
    dates = [SERIAL_1015, SERIAL_1015 + 1, SERIAL_1015 + 2, "", "합계"]
    daily = {D(2026, 10, 15): _row(D(2026, 10, 15)), D(2026, 10, 16): _row(D(2026, 10, 16))}
    ups = m.sheet_updates(dates, daily, end=D(2026, 10, 17))
    assert ups == [
        {"range": "H3:O3", "values": [[10, 6, 3, 2, 1, 0, 1, 0]]},
        {"range": "T3:W3", "values": [[1, 0, 1, 0]]},
        {"range": "H4:O4", "values": [[10, 6, 3, 2, 1, 0, 1, 0]]},
        {"range": "T4:W4", "values": [[1, 0, 1, ""]]},
        {"range": "H5:O5", "values": [[0] * 8]},
        {"range": "T5:W5", "values": [[0, 0, 0, ""]]},
    ]


def test_sheet_updates_empty_when_campaign_not_in_data(m):
    assert m.sheet_updates([SERIAL_1015 + 5, ""], {}, end=D(2026, 10, 15)) == []


def test_shrinking_days_blocks_overwriting_published_history(m):
    dates = [SERIAL_1015, SERIAL_1015 + 1, SERIAL_1015 + 2]
    published = [12, "", 3]
    daily = {D(2026, 10, 15): _row(D(2026, 10, 15), landed=11), D(2026, 10, 17): _row(D(2026, 10, 17), landed=3)}
    msgs = m.shrinking_days(dates, published, daily)
    assert len(msgs) == 1 and "2026-10-15" in msgs[0]


def _q(m, rows, *, start=D(2026, 10, 1), land_end=D(2026, 10, 8), latest=D(2026, 10, 8),
       today=D(2026, 10, 9), sl_latest=D(2026, 10, 8)):
    return m.quality(rows, start=start, land_end=land_end, latest=latest, today=today, sl_latest=sl_latest)


def test_quality_hard_fails_on_stale_ga4_export(m):
    hard, _ = _q(m, [], latest=D(2026, 10, 5), land_end=D(2026, 10, 5))
    assert len(hard) == 1 and "GA4" in hard[0]


def test_quality_hard_fails_when_session_logs_lag_behind_ga4(m):
    hard, _ = _q(m, [_row(D(2026, 10, d)) for d in range(1, 9)], sl_latest=D(2026, 10, 7))
    assert len(hard) == 1 and "session_logs" in hard[0]


def test_quality_soft_warns_on_out_of_order_banner_steps(m):
    rows = [_row(D(2026, 10, d)) for d in range(1, 8)] + [_row(D(2026, 10, 8), click_ios=3, shown_ios=1)]
    hard, soft = _q(m, rows)
    assert hard == [] and len(soft) == 1


def test_quality_soft_warns_on_missing_utm_and_spike_on_last_landing_day(m):
    rows = [_row(D(2026, 10, d), landed=8, first_play=4) for d in range(1, 8)]
    rows.append(_row(D(2026, 10, 8), landed=80, first_play=4, no_campaign=40))
    hard, soft = _q(m, rows)
    assert hard == [] and len(soft) == 2


def test_quality_judges_the_window_end_even_when_it_had_no_landings(m):
    rows = [_row(D(2026, 10, d), landed=12, first_play=4, no_campaign=12) for d in range(1, 8)]
    hard, soft = _q(m, rows)
    assert hard == [] and soft == []


def test_quality_clean_window_is_silent(m):
    assert _q(m, [_row(D(2026, 10, d)) for d in range(1, 9)]) == ([], [])


def test_sql_file_has_all_params_and_marts():
    sql = (REPO_ROOT / "sql" / "analytics" / "ads_funnel.sql").read_text()
    for p in ("@start", "@end", "@land_end", "@src"):
        assert p in sql
    for t in ("ads.funnel_user", "ads.funnel_daily", "ads.creative_daily"):
        assert t in sql
