#!/usr/bin/env python3
# =============================================================
#  calm forest · 개발용 로컬 서버 (캐시 완전 비활성 + API 미러)
#  ------------------------------------------------------------
#  python3 -m http.server 는 캐시 헤더가 없어 브라우저가 JS 모듈을
#  disk cache 로 재사용함 → 코드를 고쳐도 옛 버전이 실행되는 문제.
#  이 서버는 모든 응답에 no-store 를 붙여 항상 최신 파일을 서빙.
#
#  또한 운영의 Cloudflare Pages Function(functions/api/cafe-guests.js)과
#  같은 경로 `GET /api/cafe-guests` 를 로컬에서도 제공합니다.
#  (Pages Function 은 로컬 static 서버에서 실행되지 않기 때문 — 개발 전용 미러)
#  ⚠️ 두 구현은 프롬프트·화이트리스트를 같이 맞춰야 합니다. 한쪽만 고치지 마세요.
#
#  사용: python3 scripts/serve.py [포트]   (기본 8000, 어디서 실행해도 프로젝트 루트 서빙)
# =============================================================
import http.server
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request

# 포트 우선순위: 실행 인자 > 환경변수 PORT > 8000
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get('PORT') or 8000)
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
os.chdir(ROOT)  # 항상 프로젝트 루트 서빙


# ── .env 로더 (python-dotenv 없이 stdlib 만으로) ────────────────
def load_env():
    path = os.path.join(ROOT, '.env')
    if not os.path.exists(path):
        return
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()

# ── ☕ 카페 손님 생성 (functions/api/cafe-guests.js 와 같은 규칙) ──
RESIDENTS = [
    ('farmer', '농부 삼촌'), ('builder', '목수 아저씨'), ('merchant', '방랑 상인'),
    ('angler', '낚시꾼 할아버지'), ('chef', '요리사 판다'),
]
MENU = [
    ('veg_stew', '든든한 채소죽', '작물로 끓인 따뜻한 죽'),
    ('grilled_fish', '생선 구이', '호수에서 잡은 물고기 구이'),
    ('lunchbox', '모둠 도시락', '작물과 물고기를 담은 도시락'),
    ('omelette', '푸짐한 오믈렛', '닭장 달걀로 만든 오믈렛'),
    ('mushroom_soup', '숲의 버섯 스프', '채집 숲 버섯으로 끓인 스프'),
]
WEATHER_KO = {'clear': '맑음', 'rain': '비', 'snow': '눈', 'fog': '안개'}
LINE_MAX, THANKS_MAX = 48, 28


def trim(s, max_len):
    """길이 초과 시 글자 중간을 뚝 자르면 어색하므로 마지막 공백까지만 남기고 말줄임표."""
    t = re.sub(r'\s+', ' ', str(s or '').replace('<', '').replace('>', '')).strip()
    if len(t) <= max_len:
        return t
    cut = t[:max_len - 1]
    sp = cut.rfind(' ')
    return (cut[:sp] if sp > max_len * 0.6 else cut) + '…'

SYSTEM = f"""너는 코지 힐링 게임 "calm forest"의 마을 카페 손님을 쓰는 작가야.
규칙:
- 한국어. 주민의 말투를 살리되 따뜻하고 담백하게. 과장·이모지·따옴표 금지.
- line 은 {LINE_MAX}자 이내 한 문장. "오늘 무슨 일이 있었는지" 를 한 조각 곁들여 그 메뉴가 당기는 이유를 만든다.
- thanks 는 {THANKS_MAX}자 이내 한마디.
- id 와 recipeId 는 반드시 주어진 목록의 값만 쓴다.
- 같은 주민이 두 번 오지 않는다. 메뉴는 되도록 겹치지 않게 고른다."""

SCHEMA = {
    'type': 'ARRAY',
    'items': {
        'type': 'OBJECT',
        'properties': {
            'id': {'type': 'STRING'}, 'recipeId': {'type': 'STRING'},
            'line': {'type': 'STRING'}, 'thanks': {'type': 'STRING'},
        },
        'required': ['id', 'recipeId', 'line', 'thanks'],
    },
}

_cache = {}   # (date, weather, count) -> guests (하루 한 번만 호출하도록)


def ssl_context():
    """python.org 빌드 macOS 파이썬은 CA 번들이 없어 HTTPS 검증이 실패한다.
    (certifi 미설치 시 'CERTIFICATE_VERIFY_FAILED')  시스템 번들을 찾아 쓴다.
    검증을 끄지는 않는다 — 끄면 중간자 공격에 그대로 노출되기 때문."""
    ctx = ssl.create_default_context()
    if ctx.cert_store_stats().get('x509_ca'):
        return ctx
    for path in ('/etc/ssl/cert.pem', '/usr/local/etc/openssl/cert.pem', '/etc/pki/tls/certs/ca-bundle.crt'):
        if os.path.exists(path):
            return ssl.create_default_context(cafile=path)
    return ctx   # 못 찾으면 기본값 — 실패 시 gen_guests 가 빈 배열로 폴백


def build_prompt(date, weather, count):
    lines = [f'날짜: {date} (날씨: {WEATHER_KO.get(weather, "맑음")})', '', '주민 목록:']
    lines += [f'- {i}: {n}' for i, n in RESIDENTS]
    lines += ['', '메뉴 목록:']
    lines += [f'- {i}: {n} ({h})' for i, n, h in MENU]
    lines += ['', f'오늘 카페에 올 손님 {count}명을 만들어줘.']
    return '\n'.join(lines)


def sanitize(raw, count):
    ok_id = {i for i, _ in RESIDENTS}
    ok_recipe = {i for i, _, _ in MENU}
    seen, out = set(), []
    for g in raw if isinstance(raw, list) else []:
        if not isinstance(g, dict):
            continue
        gid, rid = str(g.get('id', '')).strip(), str(g.get('recipeId', '')).strip()
        if gid not in ok_id or rid not in ok_recipe or gid in seen:
            continue
        line, thanks = trim(g.get('line'), LINE_MAX), trim(g.get('thanks'), THANKS_MAX)
        if not line or not thanks:
            continue
        seen.add(gid)
        out.append({'id': gid, 'recipeId': rid, 'line': line, 'thanks': thanks})
        if len(out) >= count:
            break
    return out


def gen_guests(date, weather, count):
    key = (date, weather, count)
    if key in _cache:
        return _cache[key]
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return []                                    # 미설정 = 기능 끔(게임은 기본 손님 사용)
    model = os.environ.get('GEMINI_MODEL') or 'gemini-flash-lite-latest'
    body = json.dumps({
        'systemInstruction': {'parts': [{'text': SYSTEM}]},
        'contents': [{'role': 'user', 'parts': [{'text': build_prompt(date, weather, count)}]}],
        'generationConfig': {
            'temperature': 1.1,
            'responseMimeType': 'application/json',
            'responseSchema': SCHEMA,
        },
    }).encode('utf-8')
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        data=body,
        headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key},
    )
    with urllib.request.urlopen(req, timeout=20, context=ssl_context()) as res:
        data = json.load(res)
    text = ''.join(p.get('text', '') for p in data['candidates'][0]['content']['parts'])
    guests = sanitize(json.loads(text), count)
    if guests:
        _cache[key] = guests
    return guests


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/api/cafe-guests':
            self.serve_cafe_guests()
            return
        super().do_GET()

    def serve_cafe_guests(self):
        from urllib.parse import parse_qs, urlparse
        q = parse_qs(urlparse(self.path).query)
        date = (q.get('date') or [''])[0]
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
            import datetime
            date = datetime.date.today().isoformat()
        weather = (q.get('weather') or ['clear'])[0]
        if weather not in WEATHER_KO:
            weather = 'clear'
        try:
            count = max(1, min(6, int((q.get('count') or ['4'])[0])))
        except ValueError:
            count = 4
        try:
            guests = gen_guests(date, weather, count)
        except Exception as e:                       # 실패해도 게임은 기본 손님으로 진행
            print(f'[cafe-guests] 생성 실패: {type(e).__name__}: {e}')
            guests = []
        payload = json.dumps(guests, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == '__main__':
    has_key = '있음' if os.environ.get('GEMINI_API_KEY') else '없음(기본 손님 사용)'
    print(f'[serve] http://localhost:{PORT} (no-cache 개발 서버) · ☕ Gemini 키: {has_key}')
    http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler).serve_forever()
