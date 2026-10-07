# =============================================================
#  🛡️ migrate_security_hardening.sql 셀프테스트 — 전부 한 트랜잭션 안에서 하고 ROLLBACK 한다(잔여 데이터 0)
#  실행: python3 sql/tests/security_hardening_selftest.py   (.env 의 SUPABASE_DB_PASSWORD, pg8000 풀러)
#  검사:
#   ① 원장 없는 프리미엄 → owned·equipped·cashOwned 에서 빠진다, 코인 품목은 그대로
#   ② 원장에 살아 있는 행이 있으면 남는다 / revoked 행만 있으면 빠진다
#   ③ 금칙어 닉네임은 leaderboard·plaza_progress 에서 '이름 없는 여행자'
# =============================================================
import json, os, ssl, sys
import pg8000.native

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BAD_NICK = '씨발'


def env_pw():
    for line in open(os.path.join(ROOT, '.env'), encoding='utf-8'):
        if line.startswith('SUPABASE_DB_PASSWORD='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('no SUPABASE_DB_PASSWORD in .env')


def connect():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE        # 풀러 자체 CA (ml/calm_ml/db.py 와 같음)
    return pg8000.native.Connection(
        user='postgres.zuyxgjfihxtfdpolljzw', password=env_pw(),
        host='aws-1-ap-northeast-2.pooler.supabase.com', port=5432,
        database='postgres', ssl_context=ctx)


def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    return cond


def run_checks(con):
    ok = True
    # 세이브·원장이 없는 익명 계정 하나를 빌린다(트랜잭션째 되돌린다)
    uid = con.run("""select u.id::text from auth.users u
                     where u.is_anonymous and not exists (select 1 from game_saves g where g.user_id = u.id)
                       and not exists (select 1 from purchases p where p.user_id = u.id)
                     order by u.created_at desc limit 1""")[0][0]
    state = {
        'nickname': 'tester',
        'cosmetics': {'owned': ['cap', 'firefly', 'plush_doll', 'tools_moon'],
                      'equipped': {'head': 'cap', 'trail': 'firefly', 'skin': 'plush_doll', 'tools': 'tools_moon'}},
        'cashOwned': ['firefly', 'plush_doll'],
    }
    # ② plush_doll = 살아 있는 구매, tools_moon = 환불된 구매
    con.run("""insert into purchases (event_id, transaction_id, user_id, item_id, kind, price_id, occurred_at, revoked_at)
               values ('selftest:a', 'txn_selftest', cast(:u as uuid), 'plush_doll', 'cosmetic', 'pri_selftest', now(), null),
                      ('selftest:b', 'txn_selftest', cast(:u as uuid), 'tools_moon', 'cosmetic', 'pri_selftest2', now(), now())""",
            u=uid)
    con.run('insert into game_saves (user_id, state) values (cast(:u as uuid), cast(:s as jsonb))', u=uid, s=json.dumps(state))
    got = con.run('select state from game_saves where user_id = cast(:u as uuid)', u=uid)[0][0]
    cos = got['cosmetics']
    ok &= check(cos['owned'] == ['cap', 'plush_doll'], f"insert: owned = {cos['owned']}")
    ok &= check(cos['equipped'] == {'head': 'cap', 'trail': None, 'skin': 'plush_doll', 'tools': None},
                f"insert: equipped = {cos['equipped']}")
    ok &= check(got['cashOwned'] == ['plush_doll'], f"insert: cashOwned = {got['cashOwned']}")

    # ① update 경로 — 원장 없는 프리미엄을 다시 PATCH 해도 빠진다
    con.run("""update game_saves set state = jsonb_set(state, '{cosmetics,owned}', '["cap","plush_doll","bat_cape"]')
               where user_id = cast(:u as uuid)""", u=uid)
    owned = con.run("select state->'cosmetics'->'owned' from game_saves where user_id = cast(:u as uuid)", u=uid)[0][0]
    ok &= check(owned == ['cap', 'plush_doll'], f'update: owned = {owned}')

    # 프리미엄이 없는 세이브는 손대지 않는다(cosmetics 없는 세이브 포함)
    con.run("""update game_saves set state = '{"nickname":"x","coins":5}'::jsonb where user_id = cast(:u as uuid)""", u=uid)
    plain = con.run('select state from game_saves where user_id = cast(:u as uuid)', u=uid)[0][0]
    ok &= check(plain == {'nickname': 'x', 'coins': 5}, f'no cosmetics: state = {plain}')

    # ③ 닉네임 필터 — 리더보드(boat)·명판
    con.run("update game_saves set state = jsonb_set(state, '{nickname}', to_jsonb(cast(:n as text))) where user_id = cast(:u as uuid)",
            u=uid, n=BAD_NICK)
    con.run('insert into boat_runs (user_id, score, run_date) values (cast(:u as uuid), 4999, current_date)', u=uid)
    lb = con.run("select public.leaderboard('boat', cast(:u as uuid))", u=uid)[0][0]
    nicks = [r['nick'] for r in lb['top']]
    ok &= check(BAD_NICK not in nicks and '이름 없는 여행자' in nicks, f'leaderboard: 금칙어 없음 (top {len(nicks)}명)')
    season = con.run('select season from plaza_seasons order by starts_at desc limit 1')
    if season:
        s = season[0][0]
        stage, item = con.run('select stage, item from plaza_needs where season = :s order by stage, item limit 1', s=s)[0]
        con.run("""insert into plaza_donations (season, stage, item, user_id, qty, kst_day)
                   values (:s, :st, :it, cast(:u as uuid), 1, (now() at time zone 'Asia/Seoul')::date)""",
                s=s, st=stage, it=item, u=uid)
        names = con.run('select public.plaza_progress(:s)', s=s)[0][0]['names']
        ok &= check(BAD_NICK not in names, f'plaza: 금칙어 없음 (명판 {len(names)}명)')
    return ok


def main():
    con = connect()
    con.run('begin')
    try:
        ok = run_checks(con)
    finally:
        con.run('rollback')
    left = con.run("select count(*) from purchases where event_id like 'selftest:%'")[0][0]
    ok &= check(left == 0, f'잔여 selftest 원장 행 = {left}')
    print('ALL PASS' if ok else 'SOME FAILED')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
