import os
import re
import ssl
import sys
import uuid
from typing import Optional

import pg8000.native

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MIG = os.path.join(ROOT, 'sql', 'migrations', 'migrate_promo_gift.sql')


def env_pw() -> str:
    path = os.environ.get('CALM_ENV') or os.path.join(ROOT, '.env')
    for line in open(path, encoding='utf-8'):
        if line.startswith('SUPABASE_DB_PASSWORD='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('no SUPABASE_DB_PASSWORD')


def connect() -> pg8000.native.Connection:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pg8000.native.Connection(
        user='postgres.zuyxgjfihxtfdpolljzw', password=env_pw(),
        host='aws-1-ap-northeast-2.pooler.supabase.com', port=5432,
        database='postgres', ssl_context=ctx)


def migration_body() -> str:
    sql = open(MIG, encoding='utf-8').read()
    return re.sub(r'^\s*(begin|commit);\s*$', '', sql, flags=re.M | re.I)


def check(cond: bool, msg: str) -> bool:
    print(('PASS ' if cond else 'FAIL ') + msg)
    return cond


def new_user(con: pg8000.native.Connection, anon: bool = False) -> str:
    uid = str(uuid.uuid4())
    con.run("""insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
               values (cast(:u as uuid), 'authenticated', 'authenticated', :e, :a, now(), now())""",
            u=uid, e=None if anon else f'selftest-{uid[:8]}@selftest.invalid', a=anon)
    return uid


def add_code(con: pg8000.native.Connection, c: str, starts: str = '-1 day', ends: Optional[str] = '30 days',
             max_uses: Optional[int] = None, active: bool = True) -> None:
    con.run("""insert into promo_codes (code, label, label_en, starts_at, ends_at, max_uses, active)
               values (:c, '셀프테스트', 'selftest', now() + cast(:s as interval),
                       now() + cast(:e as interval), :m, :a)""",
            c=c, s=starts, e=ends, m=max_uses, a=active)
    if ends is None:
        con.run('update promo_codes set ends_at = null where code = :c', c=c)


def claim(con: pg8000.native.Connection, uid: str, c: str, stage: int) -> dict:
    return con.run('select public.promo_gift_claim(cast(:u as uuid), :c, :s)', u=uid, c=c, s=stage)[0][0]


def run_checks(con: pg8000.native.Connection) -> bool:
    ok = True
    add_code(con, 'STOK')
    add_code(con, 'STOLD', starts='-40 days', ends='-3 days')
    add_code(con, 'STGONE', starts='-40 days', ends='-10 days')
    add_code(con, 'STSOON', starts='1 day')
    add_code(con, 'STFULL', max_uses=1)
    add_code(con, 'STOFF', active=False)
    add_code(con, 'STNOEND', ends=None)

    guest = new_user(con, anon=True)
    r = claim(con, guest, 'STOK', 1)
    ok &= check(r['ok'] and r['new'] and r['label'] == '셀프테스트', '게스트 1단계 신규 지급')
    ok &= check(not claim(con, guest, 'STOK', 1)['new'], '게스트 1단계 두 번째는 new=false')
    ok &= check(claim(con, guest, 'STOK', 2).get('reason') == 'anonymous', '게스트 2단계 거절')

    member = new_user(con)
    r = claim(con, member, 'stok', 2)
    ok &= check(r['ok'] and r['new'] and r['items'] == ['promoballoon', 'promosuitcase'], '로그인 2단계 지급(소문자 코드 허용)')
    rows = con.run('select item_id, source from purchases where user_id = cast(:u as uuid) order by item_id', u=member)
    ok &= check(rows == [['promoballoon', 'promo'], ['promosuitcase', 'promo']], '원장 두 줄 source promo')
    ok &= check(not claim(con, member, 'STOK', 2)['new'], '2단계 두 번째는 new=false')
    n = con.run('select count(*) from purchases where user_id = cast(:u as uuid)', u=member)[0][0]
    ok &= check(n == 2, '원장 중복 없음')

    cases = [('NOPE', 1, 'unknown'), ('STOFF', 1, 'inactive'), ('STOFF', 2, 'inactive'),
             ('STSOON', 1, 'not_started'), ('STOLD', 1, 'expired'), ('STGONE', 2, 'expired')]
    for c, stage, reason in cases:
        ok &= check(claim(con, new_user(con), c, stage).get('reason') == reason, f'{c} 단계{stage} → {reason}')
    ok &= check(claim(con, new_user(con), 'STOLD', 2)['ok'], '종료 3일 뒤 2단계는 유예로 지급')
    ok &= check(claim(con, new_user(con), 'STSOON', 2)['ok'], '시작 전 코드도 2단계는 지급')
    ok &= check(claim(con, new_user(con, anon=True), 'STNOEND', 1)['ok'], '종료일 없는 코드')

    ok &= check(claim(con, new_user(con, anon=True), 'STFULL', 1)['new'], '선착순 1명 지급')
    ok &= check(claim(con, new_user(con, anon=True), 'STFULL', 1).get('reason') == 'full', '두 번째는 full')
    ok &= check(claim(con, new_user(con), 'STOK', 3).get('reason') == 'bad_stage', '단계 3 거절')

    guard = con.run('select public._reward_decor_ids()')[0][0]
    ok &= check('promoballoon' in guard and 'promosuitcase' in guard and 'friendarch' in guard, '가드 목록')
    return ok


def main() -> None:
    apply = '--apply' in sys.argv
    live = '--live' in sys.argv
    if apply and live:
        raise SystemExit('--live 와 --apply 는 같이 쓸 수 없다')
    con = connect()
    con.run('begin')
    try:
        if not live:
            con.run(migration_body())
        ok = run_checks(con)
    finally:
        con.run('rollback')
    left = con.run("select count(*) from auth.users where email like 'selftest-%@selftest.invalid'")[0][0]
    ok &= check(left == 0, f'잔여 selftest 계정 = {left}')
    if ok and apply:
        con.run('begin')
        con.run(migration_body())
        con.run('commit')
        print('APPLIED migrate_promo_gift.sql')
    print('ALL PASS' if ok else 'SOME FAILED')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
