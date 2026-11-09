from __future__ import annotations

import hashlib
import json
import logging
import os
import sys
from pathlib import Path

from calm_ml.storage import default_bucket, model_key

log = logging.getLogger("model_sync")

MODEL_FILES = ("coef.json", "retention_guidance.json")
DEFAULT_MODEL_DIR = "/opt/calm-api/model"


def _valid(body: bytes) -> bool:
    try:
        model = json.loads(body)
    except ValueError:
        return False
    return (isinstance(model, dict) and isinstance(model.get("feature_order"), list)
            and bool(model.get("model_version")))


def _sync_one(bucket, name: str, model_dir: Path) -> str:
    try:
        body = bucket.get(model_key(name))
    except Exception as e:
        log.error("%s: bucket get failed: %s", name, e)
        return "error"
    if body is None:
        return "missing"
    dest = model_dir / name
    if dest.exists() and hashlib.sha256(dest.read_bytes()).digest() == hashlib.sha256(body).digest():
        return "unchanged"
    if not _valid(body):
        log.error("%s: invalid model in bucket, keeping local copy", name)
        return "invalid"
    tmp = dest.with_suffix(".tmp")
    tmp.write_bytes(body)
    tmp.replace(dest)
    log.warning("%s: updated to %s", name, json.loads(body).get("model_version"))
    return "updated"


def sync_models(bucket, model_dir: Path) -> dict[str, str]:
    model_dir.mkdir(parents=True, exist_ok=True)
    return {name: _sync_one(bucket, name, model_dir) for name in MODEL_FILES}


def main() -> int:
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(name)s %(message)s")
    bucket = default_bucket()
    if bucket is None:
        log.error("OCI bucket not configured")
        return 1
    result = sync_models(bucket, Path(os.environ.get("MODEL_DIR", DEFAULT_MODEL_DIR)))
    print(json.dumps(result))
    return 1 if "error" in result.values() or "invalid" in result.values() else 0


if __name__ == "__main__":
    sys.exit(main())
