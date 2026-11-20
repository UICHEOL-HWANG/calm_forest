from calm_ml.bi_rows import flat_params, event_row, PROMOTED


def _p(key, **v):
    return {"key": key, "value": {"string_value": v.get("s"), "int_value": v.get("i"), "double_value": v.get("d"), "float_value": None}}


def test_flat_params_keeps_value_types_and_skips_empty():
    out = flat_params([_p("stage", i=3), _p("result", s="ok"), _p("dda", d=0.5), _p("empty")])
    assert out == {"stage": 3, "result": "ok", "dda": 0.5}


def test_flat_params_handles_missing_list():
    assert flat_params(None) == {}


def test_event_row_promotes_columns_as_text_and_marks_localhost_test():
    raw = {
        "day": "2026-11-19", "ts": 1763500000000000, "device": "d1", "user_id": None, "event": "house_build",
        "params": [_p("stage", i=1), _p("platform", s="web"), _p("page_location", s="http://localhost:8000/?a=1")],
        "uprops": [_p("exp_guide", s="new")], "country": "South Korea", "os": "Android", "cat": "mobile",
    }
    row = event_row(raw, persona_ids=set())
    assert row["stage"] == "1"
    assert row["platform"] == "web"
    assert row["host"] == "localhost"
    assert row["is_test"] is True
    assert row["uprops"] == {"exp_guide": "new"}
    assert set(PROMOTED) <= set(row)


def test_event_row_marks_persona_user_as_test():
    raw = {"day": "2026-11-19", "ts": 1, "device": "d2", "user_id": "u-persona", "event": "login",
           "params": [_p("page_location", s="https://calmforest.cloud/")], "uprops": [], "country": None, "os": None, "cat": None}
    assert event_row(raw, persona_ids={"u-persona"})["is_test"] is True
    assert event_row(raw, persona_ids=set())["is_test"] is False


def test_days_to_sync_loads_missing_days_and_rechecks_recent_ones():
    import importlib.util, pathlib
    spec = importlib.util.spec_from_file_location("bi_sync", pathlib.Path(__file__).parents[1] / "scripts/bi_sync.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    avail = ["20261115", "20261116", "20261117", "20261118", "20261119"]
    assert mod.days_to_sync(avail, {"20261115", "20261116", "20261117", "20261118", "20261119"}, 2) == ["20261118", "20261119"]
    assert mod.days_to_sync(avail, {"20261115", "20261117"}, 0) == ["20261116", "20261118", "20261119"]
