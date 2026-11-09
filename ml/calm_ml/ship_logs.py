from __future__ import annotations

import datetime as dt
import json
import logging
import os
import re
import sys
from pathlib import Path

from calm_ml.storage import default_bucket, serving_log_key

log = logging.getLogger("ship_logs")

DEFAULT_LOG_DIR = "/opt/calm-api/data"
KEEP_DAYS = 7
NAME = re.compile(r"^(?P<stem>[a-z-]+)-(?P<day>\d{4}-\d{2}-\d{2})\.jsonl$")


def _day(path: Path) -> dt.date | None:
    m = NAME.match(path.name)
    if not m:
        return None
    try:
        return dt.date.fromisoformat(m["day"])
    except ValueError:
        return None


def _prune(log_dir: Path, today: dt.date, keep_days: int) -> None:
    for p in log_dir.glob("*.jsonl"):
        day = _day(p)
        marker = p.with_suffix(".shipped")
        if day is not None and marker.exists() and (today - day).days > keep_days:
            p.unlink()
            marker.unlink()


def ship_logs(bucket, log_dir: Path, *, today: dt.date | None = None,
              keep_days: int = KEEP_DAYS) -> list[str]:
    today = today or dt.datetime.now(dt.timezone.utc).date()
    _prune(log_dir, today, keep_days)
    shipped = []
    for p in sorted(log_dir.glob("*.jsonl")):
        day = _day(p)
        if day is None:
            log.warning("%s: unparseable name, skipped", p.name)
            continue
        marker = p.with_suffix(".shipped")
        if day >= today or marker.exists():
            continue
        bucket.put(serving_log_key(p.name), p.read_bytes(), content_type="application/x-ndjson")
        marker.touch()
        shipped.append(p.name)
    return shipped


def main() -> int:
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(name)s %(message)s")
    bucket = default_bucket()
    if bucket is None:
        log.error("OCI bucket not configured")
        return 1
    print(json.dumps(ship_logs(bucket, Path(os.environ.get("LOG_DIR", DEFAULT_LOG_DIR)))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
