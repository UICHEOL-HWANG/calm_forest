# =============================================================
#  🤝 migrate_referrals.sql 셀프테스트 — 마이그레이션 + 검사를 한 트랜잭션에서 하고 ROLLBACK(잔여 0)
#  실행: python3 sql/tests/referrals_selftest.py [--apply]
#        --apply 없으면 운영 DB 에 아무것도 남지 않는다. --apply 는 검사 통과 후 마이그레이션만 커밋.
#  비밀번호: SUPABASE_DB_PASSWORD (.env — 워크트리엔 없으니 CALM_ENV 로 경로 지정 가능)
#  검사:
#   ⓪ 코드 발급 멱등·익명 거절  ① bind 거절 사유 6종(anonymous · not_new · self · bad_code · already_bound · cycle) + 성공 시 웰컴 핀 원장
#   ② claim: 획득 행동 1일 → 미활성 / 2일 → 활성 + 1단계(tools_star) 지급 / 다시 claim 해도 중복 없음
#   ③ 가드: 원장 없는 friendarch 는 outdoor·outdoorStored 에서 빠지고, 원장 있으면 남는다 · friend_wing 프리미엄 회수
# =============================================================
import json, os, re, ssl, sys, uuid
import pg8000.native

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MIG = os.path.join(ROOT, 'sql', 'migrations', 'migrate_referrals.sql')


def env_pw():
    path = os.environ.get('CALM_ENV') or os.path.join(ROOT, '.env')
    for line in open(path, encoding='utf-8'):
        if line.startswith('SUPABASE_DB_PASSWORD='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('no SUPABASE_DB_PASSWORD')


def connect():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE        # 풀러 자체 CA (ml/calm_ml/db.py 와 같음)
    return pg8000.native.Connection(
        user='postgres.zuyxgjfihxtfdpolljzw', password=env_pw(),
        host='aws-1-ap-northeast-2.pooler.supabase.com', port=5432,
        database='postgres', ssl_context=ctx)


def migration_body():
    sql = open(MIG, encoding='utf-8').read()
    return re.sub(r'^\s*(begin|commit);\s*$', '', sql, flags=re.M | re.I)


def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    return cond


def new_user(con, anon=False, age='0 hours'):
    uid = str(uuid.uuid4())
    con.run("""insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
               values (cast(:u as uuid), 'authenticated', 'authenticated', :e, :a, now() - cast(:g as interval), now())""",
            u=uid, e=None if anon else f'selftest-{uid[:8]}@selftest.invalid', a=anon, g=age)
    return uid


def bind(con, uid, code):
    return con.run('select public.referral_bind(cast(:u as uuid), :c, :p)', u=uid, c=code, p='web')[0][0]


def claim(con, uid):
    return con.run('select public.referral_claim(cast(:u as uuid))', u=uid)[0][0]


def session(con, uid, sid, offset, counts):
    con.run("""insert into session_logs (session_id, user_id, counts, started_at, updated_at)
               select :s, u.id, cast(:c as jsonb), u.created_at + cast(:o as interval), u.created_at + cast(:o as interval)
               from auth.users u where u.id = cast(:u as uuid)""",
            s=sid, u=uid, c=json.dumps(counts), o=offset)


def run_checks(con):
    ok = True
    inviter = new_user(con, age='30 days')
    con.run("insert into referral_codes (user_id, code) values (cast(:u as uuid), 'SELFAB23')", u=inviter)

    # ⓪ 코드 발급 — 같은 사람은 같은 코드, 익명은 거절
    me = new_user(con, age='10 days')
    g1 = con.run('select public.referral_get_code(cast(:u as uuid))', u=me)[0][0]
    g2 = con.run('select public.referral_get_code(cast(:u as uuid))', u=me)[0][0]
    ok &= check(g1.get('ok') and g1['code'] == g2['code'] and len(g1['code']) == 8, f'code: 발급·재조회 동일 {g1}')
    ga = con.run('select public.referral_get_code(cast(:u as uuid))', u=new_user(con, anon=True))[0][0]
    ok &= check(ga.get('reason') == 'anonymous', 'code: 익명 거절')

    # ① 바인딩
    anon = new_user(con, anon=True)
    ok &= check(bind(con, anon, 'SELFAB23')['reason'] == 'anonymous', 'bind: 익명 거절')
    old = new_user(con, age='5 days')
    ok &= check(bind(con, old, 'SELFAB23')['reason'] == 'not_new', 'bind: 72h 지난 계정 거절')
    selfer = new_user(con)
    con.run("insert into referral_codes (user_id, code) values (cast(:u as uuid), 'SELFSE23')", u=selfer)
    ok &= check(bind(con, selfer, 'SELFSE23')['reason'] == 'self', 'bind: 자기 코드 거절')
    friend = new_user(con, age='1 hours')
    ok &= check(bind(con, friend, 'ZZZZZZZZ')['reason'] == 'bad_code', 'bind: 없는 코드 거절')
    r = bind(con, friend, ' selfab23 ')
    ok &= check(r.get('ok') is True, f'bind: 소문자·공백 코드 성공 {r}')
    pin = con.run("select count(*) from purchases where user_id = cast(:u as uuid) and item_id = 'friend_pin' and source = 'referral'", u=friend)[0][0]
    ok &= check(pin == 1, f'bind: 웰컴 핀 원장 1행 ({pin})')
    ok &= check(bind(con, friend, 'SELFAB23')['reason'] == 'already_bound', 'bind: 두 번째 거절')
    # 순환 — friend 가 받은 초대자(inviter)를 friend 의 코드로 묶으려 하면 거절 (inviter 를 새 계정처럼 보이게)
    con.run("insert into referral_codes (user_id, code) values (cast(:u as uuid), 'SELFFR23')", u=friend)
    con.run("update auth.users set created_at = now() - interval '1 hour' where id = cast(:u as uuid)", u=inviter)
    ok &= check(bind(con, inviter, 'SELFFR23')['reason'] == 'cycle', 'bind: 서로 초대 거절')
    con.run("update auth.users set created_at = now() - interval '30 days' where id = cast(:u as uuid)", u=inviter)

    # ② 정산
    session(con, friend, 'selftest-1', '1 hour', {'login': 1, 'harvest_crop': 2})
    session(con, friend, 'selftest-2', '2 hours', {'fishing_catch': 1})          # 같은 날
    session(con, friend, 'selftest-3', '8 days', {'harvest_crop': 5})             # 7일 밖
    c1 = claim(con, inviter)
    ok &= check(c1['active'] == 0 and c1['granted'] == [], f'claim: 획득 1일 → 미활성 {c1}')
    session(con, friend, 'selftest-4', '1 day 2 hours', {'login': 1, 'npc_talk': 3})   # 획득 행동 아님
    c2 = claim(con, inviter)
    ok &= check(c2['active'] == 0, f'claim: 비획득 행동 날은 안 셈 {c2}')
    session(con, friend, 'selftest-5', '2 days 1 hour', {'cooking_result': 1})
    c3 = claim(con, inviter)
    ok &= check(c3['active'] == 1 and c3['granted'] == ['tools_star'] and c3['newly_active'] == 1,
                f'claim: 2일 → 활성 + tools_star {c3}')
    c4 = claim(con, inviter)
    ok &= check(c4['granted'] == [] and c4['newly_active'] == 0, f'claim: 재호출 중복 없음 {c4}')

    # ③ 가드
    state = {'nickname': 't', 'outdoor': [{'id': 'friendarch', 'x': 1, 'z': 2}, {'id': 'flowerbed', 'x': 0, 'z': 0}],
             'outdoorStored': {'friendarch': 1, 'bench': 2},
             'cosmetics': {'owned': ['cap', 'friend_wing', 'tools_star'], 'equipped': {'back': 'friend_wing', 'tools': 'tools_star'}}}
    con.run('insert into game_saves (user_id, state) values (cast(:u as uuid), cast(:s as jsonb))', u=inviter, s=json.dumps(state))
    got = con.run('select state from game_saves where user_id = cast(:u as uuid)', u=inviter)[0][0]
    ok &= check([o['id'] for o in got['outdoor']] == ['flowerbed'], f"guard: 원장 없는 아치 outdoor 제거 {got['outdoor']}")
    ok &= check(got['outdoorStored'] == {'bench': 2}, f"guard: outdoorStored 제거 {got['outdoorStored']}")
    ok &= check(got['cosmetics']['owned'] == ['cap', 'tools_star'], f"guard: friend_wing 회수·tools_star 유지 {got['cosmetics']['owned']}")
    ok &= check(got['cosmetics']['equipped'] == {'back': None, 'tools': 'tools_star'}, f"guard: equipped {got['cosmetics']['equipped']}")
    con.run("""insert into purchases (event_id, transaction_id, user_id, item_id, kind, price_id, amount, occurred_at, source)
               values ('selftest:arch', 'referral', cast(:u as uuid), 'friendarch', 'decor', 'referral', 0, now(), 'referral')""", u=inviter)
    con.run('update game_saves set state = cast(:s as jsonb) where user_id = cast(:u as uuid)', u=inviter, s=json.dumps(state))
    got = con.run('select state from game_saves where user_id = cast(:u as uuid)', u=inviter)[0][0]
    ok &= check([o['id'] for o in got['outdoor']] == ['friendarch', 'flowerbed'] and got['outdoorStored'] == {'friendarch': 1, 'bench': 2},
                'guard: 원장 있으면 아치 유지')
    plain = {'nickname': 'x', 'outdoor': [{'id': 'bench', 'x': 0, 'z': 0}]}
    con.run('update game_saves set state = cast(:s as jsonb) where user_id = cast(:u as uuid)', u=inviter, s=json.dumps(plain))
    got = con.run('select state from game_saves where user_id = cast(:u as uuid)', u=inviter)[0][0]
    ok &= check(got == plain, 'guard: 보상 장식 없는 세이브는 그대로')

    # 권한 — 클라이언트 역할은 함수를 못 부른다
    for fn in ('public.referral_claim(uuid)', 'public.referral_bind(uuid, text, text)', 'public.referral_get_code(uuid)'):
        priv = con.run("select has_function_privilege('authenticated', cast(:f as text), 'execute')", f=fn)[0][0]
        ok &= check(priv is False, f'grant: authenticated 는 {fn} 실행 불가')
    dml = con.run("select has_table_privilege('authenticated', 'public.referrals', 'insert')")[0][0]
    ok &= check(dml is False, 'grant: authenticated 는 referrals insert 불가')
    return ok


def main():
    apply = '--apply' in sys.argv
    con = connect()
    con.run('begin')
    try:
        con.run(migration_body())
        ok = run_checks(con)
    finally:
        con.run('rollback')
    left = con.run("select count(*) from session_logs where session_id like 'selftest-%'")[0][0]
    left += con.run("select count(*) from auth.users where email like 'selftest-%@selftest.invalid'")[0][0]
    ok &= check(left == 0, f'잔여 selftest 행 = {left}')
    if ok and apply:
        con.run('begin')
        con.run(migration_body())
        con.run('commit')
        print('APPLIED migrate_referrals.sql')
    print('ALL PASS' if ok else 'SOME FAILED')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
