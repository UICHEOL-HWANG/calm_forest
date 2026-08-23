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
# 🪣 플레이어 상태 버킷 — js/game.js 의 playerPhase() 와 값이 일치해야 한다.
#    사람마다 다른 값을 그대로 받으면 캐시 키가 갈라져 호출이 폭증하므로 3칸으로만 받는다.
PHASES = {
    'settling': '아직 빈터에 집을 짓는 중이다 — 마을에 갓 자리 잡는 참',
    'settled': '집을 완성하고 마을에 자리를 잡았다',
    'thriving': '집을 저택까지 넓힌, 마을의 오랜 이웃이다',
}
PHASE_RULE = '- 플레이어의 처지를 알고 있지만 매번 들먹이지 않는다. 어울릴 때 한 조각만 스치듯 담는다.'
LINE_MAX, THANKS_MAX = 48, 28          # 하드 캡(넘으면 …로 잘림)
LINE_ASK, THANKS_ASK = 42, 24          # 모델에겐 조금 낮게 — 살짝 넘겨도 안 잘리게


def clamp_date(raw):
    """🔒 어제·오늘·내일만 허용.

    임의의 날짜를 받으면 (날짜 × 나머지 조합)이 무한해져 캐시 미스마다 Gemini 가
    실제로 호출된다. 인증도 레이트리밋도 없는 엔드포인트라 그대로 할당량 고갈 통로가 된다.
    게임 날짜는 KST, 서버는 UTC 라 최대 9시간 어긋나므로 ±1일을 허용한다.
    """
    import datetime
    today = datetime.date.today()
    ok = {(today + datetime.timedelta(days=d)).isoformat() for d in (-1, 0, 1)}
    return raw if raw in ok else today.isoformat()


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
- line 은 {LINE_ASK}자 이내 한 문장. "오늘 무슨 일이 있었는지" 를 한 조각 곁들여 그 메뉴가 당기는 이유를 만든다.
- thanks 는 {THANKS_ASK}자 이내 한마디.
- id 와 recipeId 는 반드시 주어진 목록의 값만 쓴다.
- 같은 주민이 두 번 오지 않는다. 메뉴는 되도록 겹치지 않게 고른다.
{PHASE_RULE}"""

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


def build_prompt(date, weather, count, phase):
    lines = [f'날짜: {date} (날씨: {WEATHER_KO.get(weather, "맑음")})',
             f'플레이어는 {PHASES[phase]}.', '', '주민 목록:']
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


def gen_guests(date, weather, count, phase):
    key = (date, weather, count, phase)
    if key in _cache:
        return _cache[key]
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return []                                    # 미설정 = 기능 끔(게임은 기본 손님 사용)
    model = os.environ.get('GEMINI_MODEL') or 'gemini-flash-lite-latest'
    body = json.dumps({
        'systemInstruction': {'parts': [{'text': SYSTEM}]},
        'contents': [{'role': 'user', 'parts': [{'text': build_prompt(date, weather, count, phase)}]}],
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


# ── 📖 도감 설명문 (functions/api/dex-notes.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
#    종 목록은 배포마다 고정이라 응답이 사람·날짜에 따라 달라지지 않는다 → 카테고리당 한 번만 만들면 끝.
DEX_CATS = {
    'fish':    ('호수 부두에서 낚싯대로 잡는 물고기',
                [('common', '피라미'), ('uncommon', '붉은 물고기'), ('rare', '무지개 물고기')]),
    'crop':    ('밭에 씨앗을 심고 물을 줘 거두는 작물',
                [('carrot', '당근'), ('tomato', '토마토'), ('blueberry', '블루베리'), ('pumpkin', '호박')]),
    'ore':     ('서쪽 동굴에서 괭이로 캐는 광물',
                [('stone', '돌'), ('coal', '석탄'), ('gem', '보석')]),
    'cook':    ('자유주방에서 재료로 만드는 요리',
                [('veg_stew', '든든한 채소죽'), ('grilled_fish', '생선 구이'), ('lunchbox', '모둠 도시락'),
                 ('omelette', '푸짐한 오믈렛'), ('mushroom_soup', '숲의 버섯 스프')]),
    'npc':     ('마을에 사는 이웃들',
                [('farmer', '농부 삼촌'), ('builder', '목수 아저씨'), ('merchant', '방랑 상인'),
                 ('angler', '낚시꾼 할아버지'), ('courier', '의뢰 올빼미'), ('chef', '요리사 판다')]),
    'forage':  ('채집 숲을 걷다 도구 없이 줍는 것들',
                [('mushroom', '숲 버섯'), ('berry', '산딸기'), ('acorn', '도토리'), ('herb', '숲 약초')]),
    'bug':     ('밤에 반딧불이 계곡에서 포충망으로 잡는 반딧불이',
                [('yellow', '노랑반디'), ('blue', '푸른반디'), ('green', '초록반디'), ('rainbow', '무지개반디')]),
    'track':   ('밤사이 밭에 다녀간 동물이 남긴 흔적',
                [('fur_tuft', '털뭉치'), ('acorn_drop', '주운 도토리')]),
    'river':   ('나룻배를 타고 강을 내려가며 줍는 것들',
                [('lotus', '물 위 연꽃'), ('driftwood', '떠내려온 나무'), ('shell', '강 조개'), ('moon_fish', '달빛 물고기')]),
    'spirit':  ('안개 낀 숲에서 노래로 달래면 나타나는 정령',
                [('shy', '수줍은 정령'), ('sleepy', '졸린 정령'), ('mischief', '장난꾸러기 정령'), ('golden', '황금 정령')]),
    'weather': ('그 날씨인 날 마을에 접속하면 채워지는 하루의 날씨',
                [('clear', '맑은 날'), ('rain', '비 오는 날'), ('snow', '눈 오는 날'), ('fog', '안개 낀 날')]),
}
NOTE_MAX = 44
NOTE_ASK = 38

DEX_SYSTEM = f"""너는 코지 힐링 게임 "calm forest"의 도감을 쓰는 사람이야. 플레이어가 처음 발견한 것에 붙는 짧은 소개글을 쓴다.
규칙:
- 한국어. 따뜻하고 담백하게. 과장·이모지·따옴표 금지.
- note 는 {NOTE_ASK}자 이내 한 문장. 도감 카드에 들어가는 짧은 글이라 길면 잘려 나간다.
- 모든 항목을 '~다' 로 끝맺는 평서형으로 통일하고 마침표를 찍는다(존댓말·물음표 섞지 않기).
- 게임 안내문이 아니라 "이 숲에 사는 것"에 대한 관찰처럼 쓴다.
  잡는 방법·조작법을 설명하지 말고, 생김새·성질·언제 보이는지 같은 한 조각을 담는다.
- 종마다 서로 다른 결로 쓴다. 같은 문장 틀을 반복하지 않는다.
- 주어진 id 전부에 대해 하나씩 쓴다."""

DEX_SCHEMA = {
    'type': 'ARRAY',
    'items': {
        'type': 'OBJECT',
        'properties': {'id': {'type': 'STRING'}, 'note': {'type': 'STRING'}},
        'required': ['id', 'note'],
    },
}

_dex_cache = {}   # cat -> {id: note}


def gen_dex_notes(cat):
    if cat in _dex_cache:
        return _dex_cache[cat]
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key or cat not in DEX_CATS:
        return {}
    about, items = DEX_CATS[cat]
    prompt = '\n'.join([f'분류: {cat} — {about}', '', '항목:']
                        + [f'- {i}: {n}' for i, n in items]
                        + ['', '각 항목에 설명을 하나씩 써줘.'])
    model = os.environ.get('GEMINI_MODEL') or 'gemini-flash-lite-latest'
    body = json.dumps({
        'systemInstruction': {'parts': [{'text': DEX_SYSTEM}]},
        'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
        'generationConfig': {
            'temperature': 1.0,
            'responseMimeType': 'application/json',
            'responseSchema': DEX_SCHEMA,
        },
    }).encode('utf-8')
    ok = {i for i, _ in items}
    for _ in range(2):                                   # 빠진 게 있으면 1회 재시도(JS 쪽과 같은 규칙)
        req = urllib.request.Request(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            data=body,
            headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key},
        )
        with urllib.request.urlopen(req, timeout=25, context=ssl_context()) as res:
            data = json.load(res)
        text = ''.join(p.get('text', '') for p in data['candidates'][0]['content']['parts'])
        out = {}
        for r in json.loads(text):
            rid = str(r.get('id', '')).strip()
            if rid in ok and rid not in out:
                note = trim(r.get('note'), NOTE_MAX)
                if note:
                    out[rid] = note
        if len(out) >= len(items):
            _dex_cache[cat] = out
            return out
        print(f'[dex-notes] {cat}: {len(out)}/{len(items)} — 재시도')
    return {}


# ── 🦉 오늘의 의뢰 (functions/api/daily-quests.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
#    type 은 게임이 실제로 쏘는 이벤트여야 한다. 목록 밖 값이 통과하면 영원히 완료 못 하는 의뢰가 된다.
#    desc 는 모델이 아니라 여기서 target 으로 만든다(표시와 실제 목표가 어긋나지 않게).
#    (하한, 상한, desc 만들기, 어디서) — 장소는 프롬프트에만 쓴다.
#    없으면 "안개 숲에서 반딧불이" 처럼 엉뚱한 곳으로 안내하는 대사가 나온다.
QUEST_SPEC = {
    'chop':    (3, 8, lambda n: f'나무 {n}번 베기', '마을 숲'),
    'plant':   (2, 6, lambda n: f'씨앗 {n}번 심기', '밭·텃밭'),
    'water':   (3, 8, lambda n: f'물 {n}번 주기', '밭·텃밭'),
    'harvest': (2, 6, lambda n: f'작물 {n}개 수확하기', '밭·텃밭'),
    'fish':    (2, 5, lambda n: f'물고기 {n}마리 낚기', '호수 부두'),
    'mine':    (3, 7, lambda n: f'광석 {n}개 캐기', '서쪽 동굴'),
    'sell':    (3, 8, lambda n: f'상점에서 {n}개 팔기', '상점'),
    'cook':    (1, 3, lambda n: f'요리 {n}번 하기', '자유주방'),
    'serve':   (2, 4, lambda n: f'☕ 카페 손님 {n}명 서빙하기', '카페'),
    'catch':   (2, 5, lambda n: f'🌟 반딧불이 {n}마리 잡기(밤)', '반딧불이 계곡(밤)'),
    'forage':  (3, 8, lambda n: f'🍄 채집물 {n}개 줍기', '채집 숲'),
}
QUEST_NEED = 3
QTITLE_MAX, QLINE_MAX = 12, 48

QUEST_SYSTEM = f"""너는 코지 힐링 게임 "calm forest"의 의뢰 담당 올빼미야. 마을 사람들이 오늘 필요한 일을 모아 플레이어에게 세 가지 의뢰로 전한다.
규칙:
- 한국어. 다정하고 담백한 말투. 과장·이모지·따옴표 금지.
- 세 의뢰가 하나의 하루로 이어지게 짠다. 아래는 '결'의 예시일 뿐이니, 매일 다른 결을 고른다:
  · 숲에서 재료를 모으고 → 요리하고 → 카페 손님에게 낸다
  · 밭을 갈아 심고 → 물을 주고 → 거둔다
  · 나무를 베고 → 광석을 캐고 → 상점에 내다 판다
  · 낚시를 하고 → 저녁을 차리고 → 밤에 반딧불이를 보러 간다
- 예시를 그대로 베끼지 말고 오늘 날씨와 어울리는 결을 새로 고른다. 요리·서빙에만 치우치지 않는다.
- title 은 {QTITLE_MAX}자 이내 짧은 이름.
- line 은 {QLINE_MAX}자 이내 한 문장. 마을에 오늘 무슨 일이 있어서 이 일이 필요한지 이유를 담는다.
- type 은 반드시 주어진 목록의 값만 쓴다. target 은 주어진 범위 안의 정수.
- 같은 type 을 두 번 쓰지 않는다.
{PHASE_RULE}
- 날씨를 자연스럽게 반영해도 좋다(비 오는 날엔 숲에 버섯이 잘 돋는다).
- 마을에 있는 것만 언급한다: 밭 · 집 · 카페 · 상점 · 작업대 · 자유주방 · 동굴 · 호수 · 채집 숲 · 닭장 · 나루터 · 안개 숲.
  게임에 없는 시설이나 물건(비닐하우스·시장 좌판 같은 것)을 지어내지 않는다."""

QUEST_SCHEMA = {
    'type': 'ARRAY',
    'items': {
        'type': 'OBJECT',
        'properties': {
            'type': {'type': 'STRING'}, 'target': {'type': 'INTEGER'},
            'title': {'type': 'STRING'}, 'line': {'type': 'STRING'},
        },
        'required': ['type', 'target', 'title', 'line'],
    },
}

_quest_cache = {}   # (date, weather) -> quests


def opener_for(date):
    """날짜로 '오늘 문을 여는 일감' 을 하나 정한다.
    예시만 주면 모델이 한 결에 고착된다 — 며칠을 뽑아 보니 전부 chop 으로 시작했다."""
    h = 0
    for ch in date:
        h = (h * 31 + ord(ch)) & 0x7fffffff
    return list(QUEST_SPEC)[h % len(QUEST_SPEC)]


def build_quest_prompt(date, weather, phase):
    lines = [f'날짜: {date} (날씨: {WEATHER_KO.get(weather, "맑음")})',
             f'플레이어는 {PHASES[phase]}.', '', '목표 종류 (id: 무슨 일인지 @ 어디서 … 허용 범위):']
    lines += [f'- {t}: {fn(lo)} @ {where} … ({lo}~{hi})' for t, (lo, hi, fn, where) in QUEST_SPEC.items()]
    lines += ['', f"오늘은 '{opener_for(date)}' 로 문을 여는 하루야. 이어지는 나머지 둘은 네가 골라서 하루가 이어지게 해.",
              f'오늘의 의뢰 {QUEST_NEED}개를 만들어줘.']
    return '\n'.join(lines)


def sanitize_quests(raw):
    seen, out = set(), []
    for q in raw if isinstance(raw, list) else []:
        if not isinstance(q, dict):
            continue
        t = str(q.get('type', '')).strip()
        if t not in QUEST_SPEC or t in seen:
            continue
        lo, hi, fn, _where = QUEST_SPEC[t]
        try:
            n = int(round(float(q.get('target'))))
        except (TypeError, ValueError):
            continue
        target = max(lo, min(hi, n))
        title, line = trim(q.get('title'), QTITLE_MAX), trim(q.get('line'), QLINE_MAX)
        if not title or not line:
            continue
        seen.add(t)
        out.append({'type': t, 'target': target, 'title': title, 'desc': fn(target), 'line': line})
        if len(out) >= QUEST_NEED:
            break
    return out


def gen_quests(date, weather, phase):
    key = (date, weather, phase)
    if key in _quest_cache:
        return _quest_cache[key]
    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return []                                    # 미설정 = 기능 끔(게임은 로컬 의뢰 사용)
    model = os.environ.get('GEMINI_MODEL') or 'gemini-flash-lite-latest'
    body = json.dumps({
        'systemInstruction': {'parts': [{'text': QUEST_SYSTEM}]},
        'contents': [{'role': 'user', 'parts': [{'text': build_quest_prompt(date, weather, phase)}]}],
        'generationConfig': {
            'temperature': 1.1,
            'responseMimeType': 'application/json',
            'responseSchema': QUEST_SCHEMA,
        },
    }).encode('utf-8')
    # 중복 type·목록 밖 값이 걸러지면 3개가 안 될 수 있다 → 한 번만 다시 물어본다.
    # 그래도 모자라면 빈 배열(JS 쪽과 같은 규칙) — 게임은 로컬 의뢰로 조용히 진행한다.
    for _ in range(2):
        req = urllib.request.Request(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            data=body,
            headers={'Content-Type': 'application/json', 'x-goog-api-key': api_key},
        )
        with urllib.request.urlopen(req, timeout=20, context=ssl_context()) as res:
            data = json.load(res)
        text = ''.join(p.get('text', '') for p in data['candidates'][0]['content']['parts'])
        quests = sanitize_quests(json.loads(text))
        if len(quests) >= QUEST_NEED:
            _quest_cache[key] = quests
            return quests
        print(f'[daily-quests] {date}/{weather}: sanitize 후 {len(quests)}개 — 재시도')
    return []


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
        if self.path.split('?')[0] == '/api/daily-quests':
            self.serve_daily_quests()
            return
        if self.path.split('?')[0] == '/api/dex-notes':
            self.serve_dex_notes()
            return
        if self.path.split('?')[0] == '/api/leaderboard':
            self.serve_leaderboard()
            return
        super().do_GET()

    # ── 🏆 리더보드 (functions/api/leaderboard.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
    #    Supabase RPC(public.leaderboard) 프록시. 로컬은 캐시 없이 매번 조회(개발 편의).
    def serve_leaderboard(self):
        import urllib.parse as _up
        q = _up.parse_qs(_up.urlparse(self.path).query)
        board = (q.get('board') or ['rich'])[0]
        uid = (q.get('uid') or [''])[0]
        if board not in ('boat', 'rich', 'quest', 'mine', 'cook'):
            payload = json.dumps({'error': 'unknown board'}).encode(); code = 400
        elif uid and not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', uid, re.I):
            payload = json.dumps({'error': 'bad uid'}).encode(); code = 400
        else:
            url = os.environ.get('SUPABASE_URL'); anon = os.environ.get('SUPABASE_ANON_KEY')
            body = json.dumps({'p_board': board, 'p_uid': uid or None}).encode()
            req = urllib.request.Request(url + '/rest/v1/rpc/leaderboard', data=body, method='POST',
                                         headers={'Content-Type': 'application/json', 'apikey': anon,
                                                  'Authorization': 'Bearer ' + anon})
            try:
                with urllib.request.urlopen(req, timeout=15, context=ssl_context()) as res:
                    payload = res.read(); code = 200
            except Exception as e:
                print(f'[leaderboard] RPC 실패: {type(e).__name__}: {e}')
                payload = json.dumps({'error': 'upstream'}).encode(); code = 502
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

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
        date = clamp_date((q.get('date') or [''])[0])   # 🔒 어제·오늘·내일만
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
        date = clamp_date((q.get('date') or [''])[0])   # 🔒 어제·오늘·내일만
        weather = (q.get('weather') or ['clear'])[0]
        if weather not in WEATHER_KO:
            weather = 'clear'
        try:
            count = max(1, min(6, int((q.get('count') or ['4'])[0])))
        except ValueError:
            count = 4
        try:
            phase = (q.get('phase') or ['settled'])[0]
            if phase not in PHASES:
                phase = 'settled'
            guests = gen_guests(date, weather, count, phase)
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

    # ── 📖 도감 설명문 (functions/api/dex-notes.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
    def serve_dex_notes(self):
        from urllib.parse import parse_qs, urlparse
        q = parse_qs(urlparse(self.path).query)
        cat = (q.get('cat') or [''])[0]
        try:
            notes = gen_dex_notes(cat)
        except Exception as e:                       # 실패해도 도감은 아이콘·이름으로 진행
            print(f'[dex-notes] 생성 실패: {type(e).__name__}: {e}')
            notes = {}
        payload = json.dumps(notes, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    # ── 🦉 오늘의 의뢰 (functions/api/daily-quests.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
    def serve_daily_quests(self):
        from urllib.parse import parse_qs, urlparse
        q = parse_qs(urlparse(self.path).query)
        date = clamp_date((q.get('date') or [''])[0])   # 🔒 어제·오늘·내일만
        weather = (q.get('weather') or ['clear'])[0]
        if weather not in WEATHER_KO:
            weather = 'clear'
        try:
            phase = (q.get('phase') or ['settled'])[0]
            if phase not in PHASES:
                phase = 'settled'
            quests = gen_quests(date, weather, phase)
        except Exception as e:                       # 실패해도 게임은 로컬 의뢰로 진행
            print(f'[daily-quests] 생성 실패: {type(e).__name__}: {e}')
            quests = []
        payload = json.dumps(quests, ensure_ascii=False).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == '__main__':
    has_key = '있음' if os.environ.get('GEMINI_API_KEY') else '없음(기본 손님 사용)'
    print(f'[serve] http://localhost:{PORT} (no-cache 개발 서버) · ☕ Gemini 키: {has_key}')
    # 🔒 '' (=0.0.0.0) 로 열면 같은 망의 누구나 이 서버를 부를 수 있다.
    #    실제 GEMINI_API_KEY 를 들고 있으므로 공용 와이파이에선 키를 그대로 태울 수 있다.
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), NoCacheHandler).serve_forever()
