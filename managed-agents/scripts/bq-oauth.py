#!/opt/homebrew/bin/python3
"""Mint a BigQuery-only OAuth refresh token for the Managed Agents vault.

Usage: scripts/bq-oauth.py  (Homebrew python: the python.org 3.8 build lacks CA certs) [path/to/client_secret_*.json]

- The Desktop OAuth client JSON is read once, stored in macOS Keychain
  (calmforest-bq-oauth-client) and can then be deleted from Downloads.
- Opens the browser for consent (scope: bigquery only), catches the
  redirect on 127.0.0.1, stores the refresh token in Keychain
  (calmforest-bq-refresh-cma) and registers an mcp_oauth credential for
  https://bigquery.googleapis.com/mcp in the vault.
- No secret is printed or written to disk.
"""
import glob, http.server, json, os, secrets, socket, subprocess, sys, threading, time, urllib.parse, urllib.request, webbrowser

VAULT_ID = "vlt_011CfovbWZuvijWmFmHCijWh"
MCP_URL = "https://bigquery.googleapis.com/mcp"
SCOPE = "https://www.googleapis.com/auth/bigquery"
TOKEN_URL = "https://oauth2.googleapis.com/token"
KC_CLIENT = "calmforest-bq-oauth-client"
KC_REFRESH = "calmforest-bq-refresh-cma"


def kc_get(service):
    r = subprocess.run(["security", "find-generic-password", "-s", service, "-w"], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


def kc_set(service, value):
    subprocess.run(["security", "add-generic-password", "-U", "-s", service, "-a", "calmforest", "-w", value], check=True)


def load_client():
    stored = kc_get(KC_CLIENT)
    if stored:
        print(f"found in Keychain: {KC_CLIENT}")
        return json.loads(stored)
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if not path:
        hits = sorted(glob.glob(os.path.expanduser("~/Downloads/client_secret_*.json")), key=os.path.getmtime)
        if not hits:
            sys.exit("no client_secret_*.json in ~/Downloads - pass the path")
        path = hits[-1]
    raw = json.load(open(path))["installed"]
    client = {"client_id": raw["client_id"], "client_secret": raw["client_secret"]}
    kc_set(KC_CLIENT, json.dumps(client))
    print(f"saved to Keychain: {KC_CLIENT} (from {os.path.basename(path)})")
    return client


def consent(client):
    sock = socket.socket(); sock.bind(("127.0.0.1", 0)); port = sock.getsockname()[1]; sock.close()
    redirect = f"http://127.0.0.1:{port}"
    state = secrets.token_urlsafe(16)
    got = {}

    class H(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            if q.get("state", [None])[0] == state:
                got["code"] = q.get("code", [None])[0]
                got["error"] = q.get("error", [None])[0]
            self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
            self.wfile.write("완료됐어요. 이 탭을 닫아도 돼요.".encode())
        def log_message(self, *a):
            pass

    srv = http.server.HTTPServer(("127.0.0.1", port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client["client_id"], "redirect_uri": redirect, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent", "state": state})
    webbrowser.open(url)
    print("browser opened - sign in with the calm-forest owner account and allow BigQuery access")
    deadline = time.time() + 600
    while "code" not in got and "error" not in got and time.time() < deadline:
        time.sleep(0.5)
    srv.shutdown()
    if not got.get("code"):
        sys.exit(f"consent failed: {got.get('error') or 'timeout'}")
    body = urllib.parse.urlencode({"code": got["code"], "client_id": client["client_id"],
        "client_secret": client["client_secret"], "redirect_uri": redirect, "grant_type": "authorization_code"}).encode()
    tok = json.load(urllib.request.urlopen(TOKEN_URL, body))
    if "refresh_token" not in tok:
        sys.exit("no refresh_token returned")
    granted = tok.get("scope", "")
    print(f"granted scope: {granted}")
    return tok


def register(client, tok):
    expires = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + int(tok.get("expires_in", 3600)) - 60))
    cred = {"display_name": "BigQuery MCP (calm-forest, bigquery scope)",
            "auth": {"type": "mcp_oauth", "mcp_server_url": MCP_URL,
                     "access_token": tok["access_token"], "expires_at": expires,
                     "refresh": {"refresh_token": tok["refresh_token"], "client_id": client["client_id"],
                                 "token_endpoint": TOKEN_URL,
                                 "token_endpoint_auth": {"type": "client_secret_post", "client_secret": client["client_secret"]}}}}
    r = subprocess.run(["ant", "beta:vaults:credentials", "create", "--vault-id", VAULT_ID, "--transform", "{id,display_name}"],
                       input=json.dumps(cred), capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())
    if r.returncode != 0:
        sys.exit(1)


if __name__ == "__main__":
    c = load_client()
    t = consent(c)
    kc_set(KC_REFRESH, t["refresh_token"])
    print(f"saved to Keychain: {KC_REFRESH}")
    register(c, t)
