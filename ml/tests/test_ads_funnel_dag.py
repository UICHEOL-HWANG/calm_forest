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


def test_window_without_start_previews_last_21_days_and_skips_sheet(m):
    w = m.resolve_window(None, latest=D(2026, 10, 21))
    assert w == {"start": D(2026, 10, 1), "land_end": D(2026, 10, 21), "end": D(2026, 10, 21), "publish": False}


def test_window_caps_landing_at_21_days_but_keeps_following_events(m):
    w = m.resolve_window(D(2026, 10, 24), latest=D(2026, 11, 16))
    assert w == {"start": D(2026, 10, 24), "land_end": D(2026, 11, 13), "end": D(2026, 11, 16), "publish": True}


def test_publish_window_covers_funnel_rows_3_to_23(m):
    assert m.FIRST_ROW + m.CAMPAIGN_DAYS - 1 == 23


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


def _ins(d, ad, spend="5000", imp="3000", reach="2500", clicks="60", lpv="40", campaign="webapp_202610"):
    acts = [{"action_type": "link_click", "value": clicks}]
    if lpv is not None:
        acts.append({"action_type": "landing_page_view", "value": lpv})
    return {"date_start": d, "date_stop": d, "campaign_name": campaign, "adset_name": ad.rsplit("_", 1)[0],
            "ad_name": ad, "ad_id": f"id_{ad}", "spend": spend, "impressions": imp, "reach": reach,
            "inline_link_clicks": clicks, "actions": acts}


def test_parse_insights_reads_numbers_and_landing_page_views(m):
    rows = m.parse_insights([_ins("2026-10-24", "w1_general_v1", spend="5012.40", lpv=None)])
    assert rows == [{"d": D(2026, 10, 24), "campaign": "webapp_202610", "adset": "w1_general",
                     "ad": "w1_general_v1", "ad_id": "id_w1_general_v1", "spend": 5012.4,
                     "impressions": 3000, "reach": 2500, "clicks": 60, "lpv": 0}]


def test_daily_totals_sums_ads_per_day_and_campaign(m):
    rows = m.parse_insights([_ins("2026-10-24", "w1_general_v1"), _ins("2026-10-24", "w1_halloween_v1", spend="7000"),
                             _ins("2026-10-25", "w1_general_v1", lpv="10")])
    t = m.daily_totals(rows)
    assert t[(D(2026, 10, 24), "webapp_202610")] == {"spend": 12000, "impressions": 6000, "reach": 5000,
                                                     "clicks": 120, "lpv": 80}
    assert t[(D(2026, 10, 25), "webapp_202610")]["lpv"] == 10


def test_meta_updates_fill_c_to_g_and_zero_days_without_delivery(m):
    t = m.daily_totals(m.parse_insights([_ins("2026-10-24", "w1_general_v1")]))
    grid = [[SERIAL_1015 + 9, "webapp_202610"], [SERIAL_1015 + 10, "webapp_202610"],
            [SERIAL_1015 + 11, "webapp_202610"], ["", ""]]
    ups = m.meta_updates(grid, t, D(2026, 10, 25))
    assert ups == [{"range": "C3:G3", "values": [[5000, 3000, 2500, 60, 40]]},
                   {"range": "C4:G4", "values": [[0, 0, 0, 0, 0]]}]


def test_meta_updates_sum_all_campaigns_when_campaign_cell_is_blank(m):
    t = m.daily_totals(m.parse_insights([_ins("2026-10-24", "a_v1"), _ins("2026-10-24", "b_v1", campaign="other")]))
    ups = m.meta_updates([[SERIAL_1015 + 9, ""]], t, D(2026, 10, 24))
    assert ups[0]["values"] == [[10000, 6000, 5000, 120, 80]]


class _Resp:
    def __init__(self, body):
        self.body = body

    def read(self):
        import json
        return json.dumps(self.body).encode()

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_fetch_insights_follows_paging_and_asks_daily_ad_level(m):
    seen = []
    pages = {"first": {"data": [_ins("2026-10-24", "a_v1")], "paging": {"next": "https://graph.facebook.com/next"}},
             "next": {"data": [_ins("2026-10-24", "b_v1")], "paging": {}}}

    def opener(url, timeout):
        seen.append(url)
        return _Resp(pages["next" if url.endswith("/next") else "first"])

    rows = m.fetch_insights("tok", "123", D(2026, 10, 24), D(2026, 10, 25), "v24.0", opener=opener)
    assert [r["ad_name"] for r in rows] == ["a_v1", "b_v1"]
    first = seen[0]
    assert first.startswith("https://graph.facebook.com/v24.0/act_123/insights?")
    for part in ("level=ad", "time_increment=1", "access_token=tok", "2026-10-24", "2026-10-25",
                 "inline_link_clicks", "actions"):
        assert part in first


def test_fetch_insights_raises_graph_error_without_leaking_token(m):
    import io
    import urllib.error
    body = b'{"error": {"message": "Invalid OAuth access token", "code": 190}}'

    def opener(url, timeout):
        raise urllib.error.HTTPError(url, 400, "Bad Request", {}, io.BytesIO(body))

    with pytest.raises(RuntimeError) as e:
        m.fetch_insights("secret-tok", "123", D(2026, 10, 24), D(2026, 10, 24), "v24.0", opener=opener)
    assert "190" in str(e.value) and "Invalid OAuth" in str(e.value)
    assert "secret-tok" not in str(e.value)


def test_read_token_returns_none_when_secret_file_missing(m, tmp_path):
    assert m.read_token(tmp_path / "nope") is None
    p = tmp_path / "tok"
    p.write_text("  abc\n")
    assert m.read_token(p) == "abc"


def test_dag_extracts_meta_before_building_mart(m):
    src = DAG_PATH.read_text(encoding="utf-8")
    assert 'task_id="extract_meta"' in src
    assert "resolve >> extract >> build" in src


def test_meta_updates_round_spend_only_at_the_sheet(m):
    t = m.daily_totals(m.parse_insights([_ins("2026-10-24", "a_v1", spend="0.4"), _ins("2026-10-24", "b_v1", spend="0.4")]))
    assert m.meta_updates([[SERIAL_1015 + 9, "webapp_202610"]], t, D(2026, 10, 24))[0]["values"][0][0] == 1


def test_fetch_insights_accepts_act_prefixed_account(m):
    seen = []

    def opener(url, timeout):
        seen.append(url)
        return _Resp({"data": [], "paging": {}})

    m.fetch_insights("tok", "act_123", D(2026, 10, 24), D(2026, 10, 24), "v24.0", opener=opener)
    assert "/act_123/insights?" in seen[0]


def test_unmatched_campaigns_lists_sheet_names_missing_from_meta(m):
    t = m.daily_totals(m.parse_insights([_ins("2026-10-24", "a_v1", campaign="webapp_202610")]))
    grid = [[SERIAL_1015 + 9, "webapp_202610"], [SERIAL_1015 + 10, "webapp-202610 "], [SERIAL_1015 + 11, ""]]
    assert m.unmatched_campaigns(grid, t) == ["webapp-202610"]
