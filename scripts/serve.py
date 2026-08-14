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
import hashlib
import hmac
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


# ── 🦝 밤손님 판정 (functions/api/night-visit.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
NIGHT_BASE_CHANCE = 0.6
NIGHT_SCARECROW_CUT = 0.25
NIGHT_FENCE_CUT = 0.20
NIGHT_ANIMALS = {'raccoon': ('너구리', 'fur_tuft'), 'boar': ('멧돼지', 'acorn_drop')}


def night_rolls(uid, date, n):
    """HMAC-SHA256(시크릿, uid:date) → 0~1 결정적 난수열 (운영 워커와 동일)."""
    secret = os.environ.get('NIGHT_SEED_SECRET') or 'calm-forest-night'
    sig = hmac.new(secret.encode(), f'{uid}:{date}'.encode(), hashlib.sha256).digest()
    return [b / 256 for b in sig[:n]]


def judge_night_visit(body):
    uid = str(body.get('uid') or '')[:80]
    date = body.get('date') or ''
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(date)):
        import datetime
        date = datetime.date.today().isoformat()
    try:
        nights = max(0, min(30, int(body.get('nights') or 0)))
    except (TypeError, ValueError):
        nights = 0
    plots = body.get('plots') if isinstance(body.get('plots'), list) else []
    plots = plots[:64]
    defense = body.get('defense') if isinstance(body.get('defense'), dict) else {}
    scarecrow = defense.get('scarecrow') is True
    fence = defense.get('fence') is True

    if not uid or nights < 1 or not plots:
        return {'visited': False, 'reason': 'no-night'}

    rolls = night_rolls(uid, date, 8)
    roll_visit, roll_animal, roll_count, roll_picks = rolls[0], rolls[1], rolls[2], rolls[3:]

    chance = NIGHT_BASE_CHANCE - (NIGHT_SCARECROW_CUT if scarecrow else 0) - (NIGHT_FENCE_CUT if fence else 0)
    if roll_visit >= chance:
        return {'visited': False, 'defended': scarecrow or fence}

    animal = 'raccoon' if roll_animal < 0.5 else 'boar'
    count = 1 + int(roll_count * 3) - (1 if scarecrow else 0) - (1 if fence else 0)
    count = max(1, min(count, len(plots)))

    idx = list(range(len(plots)))
    stolen = []
    for k in range(count):
        r = roll_picks[k % len(roll_picks)]
        pick = int(r * len(idx)) % len(idx)
        stolen.append(idx.pop(pick))

    name, loot = NIGHT_ANIMALS[animal]
    return {'visited': True, 'animal': animal, 'animalName': name, 'stolenIdx': stolen, 'loot': loot, 'defended': False}


# ── 📜 밤손님 주민 쪽지 (functions/api/night-note.js 와 같은 규칙) ──
NOTE_CROP_KO = {'carrot': '당근', 'tomato': '토마토', 'blueberry': '블루베리', 'pumpkin': '호박', '': '작물'}
NOTE_TEXT_MAX = 140
NOTE_SYSTEM = f"""너는 코지 힐링 게임 "calm forest"의 농부 삼촌이야. 밤사이 숲 동물이 밭에서 작물을 조금 가져간 다음날 아침, 플레이어의 밭에 남겨둔 짧은 쪽지를 쓴다.
규칙:
- 한국어, 존댓말 섞인 다정한 시골 말투. 이모지·따옴표 금지.
- {NOTE_TEXT_MAX}자 이내 2~3문장. 동물을 탓하거나 해치자는 말은 절대 없음.
- 핵심은 "가져간 뒤 어떻게 됐는지" 한 장면: 숲에서 나눠 먹더라, 새끼들이 기다리더라, 겨울 준비더라 같은 따뜻한 뒷이야기.
- 마지막에 허수아비나 울타리를 살짝 권해도 좋다(강요 말고 한마디)."""
_note_cache = {}   # (date, animal, crop) -> {author, text}


def gen_night_note(date, animal, crop):
    key = (date, animal, crop)
    if key in _note_cache:
        return _note_cache[key]
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return {}
    model = os.environ.get('GEMINI_MODEL') or 'gemini-flash-lite-latest'
    animal_ko = '멧돼지' if animal == 'boar' else '너구리'
    prompt = f'날짜: {date}\n다녀간 동물: {animal_ko}\n가져간 작물: {NOTE_CROP_KO[crop]}\n\n오늘 아침의 쪽지를 써줘.'
    body = json.dumps({
        'systemInstruction': {'parts': [{'text': NOTE_SYSTEM}]},
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {
            'temperature': 1.0,
            'responseMimeType': 'application/json',
            'responseSchema': {'type': 'OBJECT', 'properties': {'text': {'type': 'STRING'}}, 'required': ['text']},
        },
    }).encode('utf-8')
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
        data=body,
        headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key},
    )
    with urllib.request.urlopen(req, timeout=20, context=ssl_context()) as res:
        data = json.load(res)
    raw = ''.join(p.get('text', '') for p in data['candidates'][0]['content']['parts'])
    text = re.sub(r'\s+', ' ', str(json.loads(raw).get('text', '')).replace('<', '').replace('>', '')).strip()[:NOTE_TEXT_MAX]
    note = {'author': '농부 삼촌', 'text': text} if text else {}
    if note:
        _note_cache[key] = note
    return note


# =============================================================
#  📸 사진첩 — OCI Object Storage S3 호환 API (functions/api/photo*.js 로컬 미러)
#  Pages Function 과 인증·한도·키 규칙을 동일하게 유지해야 합니다.
# =============================================================
import hmac as _hmac
import hashlib as _hashlib
import base64 as _base64
import datetime as _dt
from urllib.parse import quote as _q

PHOTO_MAX = 100          # 유저당 보관 한도(photo.js 의 MAX_PHOTOS 와 동일해야 함)
PHOTO_MAX_BYTES = 1_500_000

def _oci_env():
    return {
        'ns': os.environ.get('OCI_NAMESPACE') or 'id8g5usnkx1c',
        'region': os.environ.get('OCI_REGION'),
        'bucket': os.environ.get('OCI_BUCKET'),
        'ak': os.environ.get('OCI_ACCESS_KEY'),
        'sk': os.environ.get('OCI_SECRET_KEY'),
    }

def _oci_ready(e):
    return all([e['region'], e['bucket'], e['ak'], e['sk']])

def _sig_key(secret, date, region):
    k = _hmac.new(('AWS4' + secret).encode(), date.encode(), _hashlib.sha256).digest()
    k = _hmac.new(k, region.encode(), _hashlib.sha256).digest()
    k = _hmac.new(k, b's3', _hashlib.sha256).digest()
    return _hmac.new(k, b'aws4_request', _hashlib.sha256).digest()

def _s3_request(method, path, query='', body=b'', content_type=None):
    """헤더 서명(SigV4)으로 OCI S3 호환 API 호출 → (status, body bytes)."""
    e = _oci_env()
    host = "{}.compat.objectstorage.{}.oraclecloud.com".format(e['ns'], e['region'])
    ts = _dt.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    date = ts[:8]
    payload = _hashlib.sha256(body or b'').hexdigest()
    headers = {'host': host, 'x-amz-content-sha256': payload, 'x-amz-date': ts}
    if content_type:
        headers['content-type'] = content_type
    names = sorted(headers)
    canon = '\n'.join([method, path, query,
                       ''.join('{}:{}\n'.format(h, headers[h]) for h in names),
                       ';'.join(names), payload])
    scope = '{}/{}/s3/aws4_request'.format(date, e['region'])
    sts = '\n'.join(['AWS4-HMAC-SHA256', ts, scope, _hashlib.sha256(canon.encode()).hexdigest()])
    sig = _hmac.new(_sig_key(e['sk'], date, e['region']), sts.encode(), _hashlib.sha256).hexdigest()
    headers['authorization'] = ('AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}'
                                .format(e['ak'], scope, ';'.join(names), sig))
    del headers['host']
    url = 'https://{}{}'.format(host, path) + ('?' + query if query else '')
    req = urllib.request.Request(url, data=(body or None), method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20, context=ssl_context()) as res:
            return res.status, res.read()
    except urllib.error.HTTPError as err:
        return err.code, err.read()

def _presign_get(path, expires=3600):
    """쿼리 서명 presigned GET — <img src> 용 1시간 URL."""
    e = _oci_env()
    host = "{}.compat.objectstorage.{}.oraclecloud.com".format(e['ns'], e['region'])
    ts = _dt.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
    date = ts[:8]
    scope = '{}/{}/s3/aws4_request'.format(date, e['region'])
    q = [('X-Amz-Algorithm', 'AWS4-HMAC-SHA256'),
         ('X-Amz-Credential', '{}/{}'.format(e['ak'], scope)),
         ('X-Amz-Date', ts),
         ('X-Amz-Expires', str(expires)),
         ('X-Amz-SignedHeaders', 'host')]
    qs = '&'.join(sorted('{}={}'.format(k, _q(v, safe='')) for k, v in q))
    canon = '\n'.join(['GET', path, qs, 'host:{}\n'.format(host), 'host', 'UNSIGNED-PAYLOAD'])
    sts = '\n'.join(['AWS4-HMAC-SHA256', ts, scope, _hashlib.sha256(canon.encode()).hexdigest()])
    sig = _hmac.new(_sig_key(e['sk'], date, e['region']), sts.encode(), _hashlib.sha256).hexdigest()
    return 'https://{}{}?{}&X-Amz-Signature={}'.format(host, path, qs, sig)

def _verify_user(handler):
    """Supabase JWT 검증 → 유저 dict 또는 None. 익명(게스트)은 None(영구 계정 전용)."""
    token = (handler.headers.get('Authorization') or '')
    token = token[7:] if token.lower().startswith('bearer ') else ''
    url = os.environ.get('SUPABASE_URL')
    anon = os.environ.get('SUPABASE_ANON_KEY')
    if not (token and url and anon):
        return None
    req = urllib.request.Request(url + '/auth/v1/user',
                                 headers={'apikey': anon, 'Authorization': 'Bearer ' + token})
    try:
        with urllib.request.urlopen(req, timeout=10, context=ssl_context()) as res:
            u = json.loads(res.read())
        if not u.get('id') or u.get('is_anonymous'):
            return None
        return u
    except Exception:
        return None


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0] == '/api/cafe-guests':
            self.serve_cafe_guests()
            return
        if self.path.split('?')[0] == '/api/night-note':
            self.serve_night_note()
            return
        super().do_GET()

    def do_POST(self):
        route = self.path.split('?')[0]
        if route == '/api/night-visit':
            self.serve_night_visit()
            return
        if route == '/api/photo':
            self.serve_photo_upload()
            return
        if route == '/api/photo-urls':
            self.serve_photo_urls()
            return
        self.send_error(404)

    def do_DELETE(self):
        if self.path.split('?')[0] == '/api/photo':
            self.serve_photo_delete()
            return
        self.send_error(404)

    def send_json(self, obj, status=200):
        payload = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    # ── 📸 POST /api/photo — 공유 카드 JPEG 업로드 (photo.js 미러) ──
    def serve_photo_upload(self):
        if not _oci_ready(_oci_env()):
            self.send_json({'error': 'not_configured'}, 503)
            return
        user = _verify_user(self)
        if not user:
            self.send_json({'error': 'login_required'}, 403)
            return
        try:
            length = int(self.headers.get('Content-Length') or 0)
            image = json.loads(self.rfile.read(length) or b'{}').get('image', '')
        except (ValueError, json.JSONDecodeError):
            self.send_json({'error': 'bad_json'}, 400)
            return
        m = re.match(r'^data:image/jpeg;base64,(.+)$', image or '')
        if not m:
            self.send_json({'error': 'jpeg_only'}, 400)
            return
        try:
            bin_data = _base64.b64decode(m.group(1))
        except Exception:
            self.send_json({'error': 'bad_base64'}, 400)
            return
        if len(bin_data) > PHOTO_MAX_BYTES:
            self.send_json({'error': 'too_large'}, 413)
            return
        e = _oci_env()
        prefix = 'photos/{}/'.format(user['id'])
        status, body = _s3_request('GET', '/' + e['bucket'],
                                   query='list-type=2&max-keys={}&prefix={}'.format(PHOTO_MAX, _q(prefix, safe='')))
        if status != 200:
            self.send_json({'error': 'storage_list_failed', 'status': status}, 502)
            return
        mm = re.search(rb'<KeyCount>(\d+)</KeyCount>', body)
        count = int(mm.group(1)) if mm else 0
        if count >= PHOTO_MAX:
            self.send_json({'error': 'album_full', 'count': count}, 409)
            return
        key = '{}{}.jpg'.format(prefix, int(_dt.datetime.now().timestamp() * 1000))
        status, _body = _s3_request('PUT', '/{}/{}'.format(e['bucket'], key),
                                    body=bin_data, content_type='image/jpeg')
        if status not in (200, 201):
            self.send_json({'error': 'storage_put_failed', 'status': status}, 502)
            return
        self.send_json({'ok': True, 'key': key, 'count': count + 1, 'max': PHOTO_MAX})

    # ── 📸 POST /api/photo-urls — presigned GET 일괄 발급 (photo-urls.js 미러) ──
    def serve_photo_urls(self):
        if not _oci_ready(_oci_env()):
            self.send_json({'error': 'not_configured'}, 503)
            return
        user = _verify_user(self)
        if not user:
            self.send_json({'error': 'login_required'}, 403)
            return
        try:
            length = int(self.headers.get('Content-Length') or 0)
            keys = json.loads(self.rfile.read(length) or b'{}').get('keys')
        except (ValueError, json.JSONDecodeError):
            self.send_json({'error': 'bad_json'}, 400)
            return
        if not isinstance(keys, list):
            self.send_json({'error': 'keys_required'}, 400)
            return
        e = _oci_env()
        prefix = 'photos/{}/'.format(user['id'])
        urls = {}
        for key in keys[:120]:
            if isinstance(key, str) and key.startswith(prefix):
                urls[key] = _presign_get('/{}/{}'.format(e['bucket'], key))
        self.send_json({'urls': urls})

    # ── 📸 DELETE /api/photo?key=... — 본인 소유만 (photo.js 미러) ──
    def serve_photo_delete(self):
        from urllib.parse import parse_qs, urlparse
        if not _oci_ready(_oci_env()):
            self.send_json({'error': 'not_configured'}, 503)
            return
        user = _verify_user(self)
        if not user:
            self.send_json({'error': 'login_required'}, 403)
            return
        key = (parse_qs(urlparse(self.path).query).get('key') or [''])[0]
        if not key.startswith('photos/{}/'.format(user['id'])):
            self.send_json({'error': 'forbidden'}, 403)
            return
        e = _oci_env()
        status, _body = _s3_request('DELETE', '/{}/{}'.format(e['bucket'], key))
        if status not in (200, 204, 404):
            self.send_json({'error': 'storage_delete_failed', 'status': status}, 502)
            return
        self.send_json({'ok': True})

    def serve_night_visit(self):
        try:
            length = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(length) or b'{}')
        except (ValueError, json.JSONDecodeError):
            self.send_json({'visited': False, 'reason': 'bad-json'})
            return
        self.send_json(judge_night_visit(body if isinstance(body, dict) else {}))

    def serve_night_note(self):
        from urllib.parse import parse_qs, urlparse
        q = parse_qs(urlparse(self.path).query)
        date = (q.get('date') or [''])[0]
        if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
            import datetime
            date = datetime.date.today().isoformat()
        animal = 'boar' if (q.get('animal') or [''])[0] == 'boar' else 'raccoon'
        crop = (q.get('crop') or [''])[0]
        if crop not in NOTE_CROP_KO:
            crop = ''
        try:
            note = gen_night_note(date, animal, crop)
        except Exception as e:                       # 실패해도 게임은 쪽지 없이 진행
            print(f'[night-note] 생성 실패: {type(e).__name__}: {e}')
            note = {}
        self.send_json(note)

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
