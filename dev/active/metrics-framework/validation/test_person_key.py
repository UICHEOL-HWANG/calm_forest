"""Tests for person-key stitching (guest device history -> logged-in account)."""
from __future__ import annotations

import pandas as pd

from person_key import stitch_person


def _sessions(rows: list[tuple]) -> pd.DataFrame:
    return pd.DataFrame(rows, columns=["client_id", "user_id", "is_guest"])


def test_logged_in_session_uses_account_key():
    out, _ = stitch_person(_sessions([("c1", "u1", False)]))
    assert out["person"].tolist() == ["u:u1"]


def test_guest_history_on_device_merges_into_its_single_account():
    out, report = stitch_person(_sessions([
        ("c1", "anon1", True),   # played as guest first
        ("c1", "u1", False),     # later logged in on the same device
    ]))
    assert out["person"].tolist() == ["u:u1", "u:u1"]
    assert report["stitched_devices"] == 1


def test_device_with_two_accounts_is_not_merged():
    out, report = stitch_person(_sessions([
        ("c1", "anon1", True),
        ("c1", "u1", False),
        ("c1", "u2", False),
    ]))
    assert out["person"].tolist() == ["c:c1", "u:u1", "u:u2"]
    assert report["ambiguous_devices"] == 1
    assert report["ambiguous_guest_sessions"] == 1


def test_guest_only_device_keeps_device_key():
    out, report = stitch_person(_sessions([("c9", "anon9", True)]))
    assert out["person"].tolist() == ["c:c9"]
    assert report["stitched_devices"] == 0


def test_logged_in_row_without_user_id_falls_back_to_device():
    out, _ = stitch_person(_sessions([("c2", None, False)]))
    assert out["person"].tolist() == ["c:c2"]


def test_input_is_not_mutated():
    src = _sessions([("c1", "anon1", True), ("c1", "u1", False)])
    before = src.copy()
    stitch_person(src)
    pd.testing.assert_frame_equal(src, before)


def test_null_is_guest_is_treated_as_guest_without_crashing():
    src = pd.DataFrame({
        "client_id": ["c1", "c1"],
        "user_id": ["anon1", "u1"],
        "is_guest": pd.array([pd.NA, False], dtype="boolean"),
    })
    out, report = stitch_person(src)
    assert out["person"].tolist() == ["u:u1", "u:u1"]
    assert report["stitched_guest_sessions"] == 1


def test_empty_input_returns_empty_and_zero_report():
    out, report = stitch_person(_sessions([]))
    assert out["person"].tolist() == []
    assert report == {
        "stitched_devices": 0, "stitched_guest_sessions": 0,
        "ambiguous_devices": 0, "ambiguous_guest_sessions": 0,
    }


def test_guest_device_is_not_merged_into_account_logged_in_elsewhere():
    out, _ = stitch_person(_sessions([
        ("c1", "anon1", True),   # guest on c1
        ("c2", "u1", False),     # account only ever logged in on c2
    ]))
    assert out["person"].tolist() == ["c:c1", "u:u1"]
