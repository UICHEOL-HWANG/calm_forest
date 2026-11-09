from __future__ import annotations

import datetime as dt
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Callable

DEFAULT_CONFIG_PATH = "/opt/airflow/secrets/oci_s3.json"
REQUIRED = ("namespace", "region", "bucket", "access_key", "secret_key")
PREFIX = "ml"

Http = Callable[..., tuple[int, bytes, dict]]


def sample_key(name: str, day: dt.date) -> str:
    return f"{PREFIX}/samples/{name}/{day.isoformat()}.parquet"


def sweep_key(day: dt.date, filename: str) -> str:
    return f"{PREFIX}/sweeps/{day.isoformat()}/{filename}"


def model_key(filename: str) -> str:
    return f"{PREFIX}/models/{filename}"


def serving_log_key(filename: str) -> str:
    return f"{PREFIX}/serving-logs/{filename}"


def load_oci_config() -> dict | None:
    path = Path(os.environ.get("OCI_S3_JSON", DEFAULT_CONFIG_PATH))
    if not path.exists():
        return None
    cfg = json.loads(path.read_text(encoding="utf-8"))
    missing = [k for k in REQUIRED if not cfg.get(k)]
    if missing:
        raise ValueError(f"oci config missing fields: {missing}")
    return {k: cfg[k] for k in REQUIRED}


def sigv4_headers(method: str, host: str, path: str, body: bytes, region: str,
                  access_key: str, secret_key: str, when: dt.datetime) -> dict:
    ts = when.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    date = ts[:8]
    payload_hash = hashlib.sha256(body).hexdigest()
    headers = {"host": host, "x-amz-content-sha256": payload_hash, "x-amz-date": ts}
    names = sorted(headers)
    canon = "\n".join([method, path, "", "".join(f"{h}:{headers[h]}\n" for h in names),
                       ";".join(names), payload_hash])
    scope = f"{date}/{region}/s3/aws4_request"
    to_sign = "\n".join(["AWS4-HMAC-SHA256", ts, scope, hashlib.sha256(canon.encode()).hexdigest()])
    k = hmac.new(f"AWS4{secret_key}".encode(), date.encode(), hashlib.sha256).digest()
    for part in (region, "s3", "aws4_request"):
        k = hmac.new(k, part.encode(), hashlib.sha256).digest()
    sig = hmac.new(k, to_sign.encode(), hashlib.sha256).hexdigest()
    out = {h: v for h, v in headers.items() if h != "host"}
    out["authorization"] = (f"AWS4-HMAC-SHA256 Credential={access_key}/{scope}, "
                            f"SignedHeaders={';'.join(names)}, Signature={sig}")
    return out


def _urllib_http(method: str, url: str, headers: dict, body: bytes | None = None) -> tuple[int, bytes, dict]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)


class Bucket:
    def __init__(self, cfg: dict, *, http: Http = _urllib_http) -> None:
        self._cfg = dict(cfg)
        self._http = http
        self._host = f"{cfg['namespace']}.compat.objectstorage.{cfg['region']}.oraclecloud.com"

    def _call(self, method: str, key: str, body: bytes = b"",
              content_type: str | None = None) -> tuple[int, bytes, dict]:
        path = f"/{self._cfg['bucket']}/{key}"
        h = sigv4_headers(method, self._host, path, body, self._cfg["region"],
                          self._cfg["access_key"], self._cfg["secret_key"],
                          dt.datetime.now(dt.timezone.utc))
        if content_type:
            h["content-type"] = content_type
        return self._http(method, f"https://{self._host}{path}", h, body if method == "PUT" else None)

    def put(self, key: str, body: bytes, *, content_type: str = "application/octet-stream") -> None:
        status, resp, _ = self._call("PUT", key, body, content_type)
        if status not in (200, 201):
            raise RuntimeError(f"oci put {key} failed {status}: {resp[:200]!r}")

    def get(self, key: str) -> bytes | None:
        status, resp, _ = self._call("GET", key)
        if status == 404:
            return None
        if status != 200:
            raise RuntimeError(f"oci get {key} failed {status}: {resp[:200]!r}")
        return resp


def default_bucket() -> Bucket | None:
    cfg = load_oci_config()
    return Bucket(cfg) if cfg else None
