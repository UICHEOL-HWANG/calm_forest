from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_predict_route_is_mounted():
    r = client.post("/predict", json={
        "features": {"path_len": 1.0, "net_disp": 1.0, "wander_ratio": 1.0, "yaw_total": 1.0,
                     "mouse_travel": 1.0, "idle_ratio": 0.0, "is_first_session": 0, "trigger_kind": 0},
        "trigger": "time15", "session_id": "s", "client_id": "c", "variant": "control"})
    assert r.status_code == 200, "라우터가 등록되지 않았다"


def test_old_stub_is_gone():
    """d1_return_prob 스텁이 남아 있으면 안 된다 — 이번 설계와 타깃이 다르다."""
    assert "d1_return_prob" not in (client.post("/predict", json={
        "features": {"path_len": 1.0, "net_disp": 1.0, "wander_ratio": 1.0, "yaw_total": 1.0,
                     "mouse_travel": 1.0, "idle_ratio": 0.0, "is_first_session": 0, "trigger_kind": 0},
        "trigger": "time15", "session_id": "s", "client_id": "c", "variant": "control"}).text)


def test_cors_allows_any_origin():
    """CORS 는 보안 경계가 아니다 — 토스 웹뷰 오리진을 미리 알 수 없어 가리지 않는다."""
    r = client.options("/predict", headers={
        "Origin": "https://unknown-toss-webview.example",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"})
    assert r.status_code in (200, 204)
    assert r.headers.get("access-control-allow-origin") == "*"
