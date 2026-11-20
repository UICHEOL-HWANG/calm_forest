from __future__ import annotations

from urllib.parse import urlparse

PROMOTED = ("platform", "stage", "result", "kind", "item", "reason", "arm", "step", "slot", "via", "src", "npc", "mode", "quest_id")
TEST_HOSTS = {"localhost", "127.0.0.1"}


def flat_params(items: list[dict] | None) -> dict:
    out = {}
    for p in items or []:
        v = p.get("value") or {}
        for k in ("string_value", "int_value", "double_value", "float_value"):
            if v.get(k) is not None:
                out[p["key"]] = v[k]
                break
    return out


def _text(v) -> str | None:
    return None if v is None else str(v)


def event_row(raw: dict, persona_ids: set[str]) -> dict:
    params = flat_params(raw.get("params"))
    host = urlparse(params.get("page_location") or "").hostname
    return {
        "day": raw["day"], "ts": raw["ts"], "device": raw["device"], "user_id": raw.get("user_id"), "event": raw["event"],
        "session_id": params.get("ga_session_id"), "host": host,
        "country": raw.get("country"), "os": raw.get("os"), "device_cat": raw.get("cat"),
        **{k: _text(params.get(k)) for k in PROMOTED},
        "params": params, "uprops": flat_params(raw.get("uprops")),
        "is_test": host in TEST_HOSTS or (raw.get("user_id") in persona_ids),
    }
