"""Person key for metrics (docs/analysis/METRICS_FRAMEWORK.md §2).

Logged-in sessions count by account (`u:<user_id>`), guests by device (`c:<client_id>`).
A device whose sessions were logged into exactly one account has its guest history merged
into that account. A device with two or more accounts is left alone — we cannot tell whose
guest sessions they were.

Assumes client_id is never NULL (true for session_logs as of 2026-10-08: 0 of 1,850 rows).
"""
from __future__ import annotations

import pandas as pd


def _logged_in(df: pd.DataFrame) -> pd.Series:
    # NULL is_guest (nullable boolean) counts as guest, never as logged in
    return df["is_guest"].eq(False).fillna(False).astype(bool) & df["user_id"].notna()


def stitch_person(sessions: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, int]]:
    """Return a copy of `sessions` with a `person` column, plus a stitching report.

    Required columns: client_id, user_id, is_guest.
    """
    logged = _logged_in(sessions)
    accounts_per_device = sessions[logged].groupby("client_id")["user_id"].nunique()
    single = accounts_per_device[accounts_per_device == 1].index
    device_to_account = (
        sessions[logged & sessions["client_id"].isin(single)]
        .groupby("client_id")["user_id"].first()
    )

    guest_key = sessions["client_id"].map(device_to_account)
    person = pd.Series(
        [
            f"u:{u}" if is_logged else (f"u:{acct}" if pd.notna(acct) else f"c:{c}")
            for is_logged, u, acct, c in zip(logged, sessions["user_id"], guest_key, sessions["client_id"])
        ],
        index=sessions.index,
        dtype=object,
    )
    out = sessions.assign(person=person)

    stitched_guest = ~logged & guest_key.notna()
    report = {
        "stitched_devices": int(sessions.loc[stitched_guest, "client_id"].nunique()),
        "stitched_guest_sessions": int(stitched_guest.sum()),
        "ambiguous_devices": int((accounts_per_device >= 2).sum()),
        "ambiguous_guest_sessions": int(
            (~logged & sessions["client_id"].isin(accounts_per_device[accounts_per_device >= 2].index)).sum()
        ),
    }
    return out, report
