# =============================================================
#  calm forest · Supabase(Postgres) 조회 모듈 — EDA/학습 데이터 로드
#  ------------------------------------------------------------
#  ▶ 접속정보는 레포 루트 .env 를 재사용한다(별도 복사본 금지 — 한 곳 관리).
#  ▶ 직결 호스트(db.<ref>.supabase.co)는 IPv6 전용이라 로컬에서 안 붙는다.
#    → 세션 풀러(aws-1-ap-northeast-2)로 접속. 유저명은 postgres.<ref> 형식.
#  ▶ pg8000: 순수 파이썬 드라이버 — psycopg 처럼 C 빌드가 필요 없어
#    노트북/오라클 클라우드 어디서든 설치가 안 꼬인다.
# =============================================================
from __future__ import annotations

import os
import ssl
from pathlib import Path

import pandas as pd
import pg8000.native
from dotenv import load_dotenv

# 레포 루트 .env (ml/ 기준 한 단계 위)
ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

POOLER_HOST = "aws-1-ap-northeast-2.pooler.supabase.com"  # 프로젝트 리전(서울) 확인됨
POOLER_PORT = 5432   # 세션 모드(노트북처럼 연결을 오래 잡는 용도에 적합)


def connect() -> pg8000.native.Connection:
    """Supabase 세션 풀러로 접속한 커넥션을 돌려준다."""
    ref = os.environ["SUPABASE_PROJECT_REF"]
    password = os.environ["SUPABASE_DB_PASSWORD"]
    ctx = ssl.create_default_context()
    # 로컬 파이썬에 CA 번들이 없어도 동작하게 — 조회 전용이라 위험 표면이 작다.
    # (쓰기·운영 코드라면 검증을 켜고 certifi 를 쓸 것)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pg8000.native.Connection(
        f"postgres.{ref}", host=POOLER_HOST, port=POOLER_PORT,
        database="postgres", password=password, ssl_context=ctx, timeout=15,
    )


def read_sql(query: str, con: pg8000.native.Connection | None = None) -> pd.DataFrame:
    """SQL → DataFrame. con 을 안 주면 1회용 커넥션을 열고 닫는다."""
    own = con is None
    c = con or connect()
    try:
        rows = c.run(query)
        cols = [k["name"] for k in c.columns]
        return pd.DataFrame(rows, columns=cols)
    finally:
        if own:
            c.close()


# ── 자주 쓰는 로드 헬퍼 ─────────────────────────────────────────
def load_sessions(days: int = 90) -> pd.DataFrame:
    """세션 요약(session_logs) — 기기·게스트여부·시작시각 등."""
    return read_sql(f"""
        select session_id, user_id, client_id, is_guest, variant,
               started_at, updated_at
        from session_logs
        where started_at > now() - interval '{int(days)} days'
        order by started_at
    """)


def load_daily_active(days: int = 90) -> pd.DataFrame:
    """일별 활성 기기 수(DAU, client_id 단위)."""
    return read_sql(f"""
        select date(started_at) as day, count(distinct client_id) as dau
        from session_logs
        where started_at > now() - interval '{int(days)} days'
          and client_id is not null
        group by 1 order by 1
    """)


def load_d1_cohorts() -> pd.DataFrame:
    """첫 방문일 코호트별 D1 복귀(기기 단위) — 오늘 코호트는 제외."""
    return read_sql("""
        with days as (
          select client_id, date(started_at) as d
          from session_logs
          where client_id is not null and started_at is not null
          group by 1, 2
        ),
        firsts as (select client_id, min(d) as d0 from days group by 1)
        select f.d0 as cohort, count(*) as new_users,
               count(*) filter (where exists (
                 select 1 from days x where x.client_id = f.client_id and x.d = f.d0 + 1
               )) as returned_d1
        from firsts f
        where f.d0 < current_date
        group by 1 order by 1
    """)


def load_econ(days: int = 90) -> pd.DataFrame:
    """경제 원장(econ_logs) — 코인 증감 {source, item, amount, balance}."""
    return read_sql(f"""
        select client_id, is_guest, variant, source, item, amount, balance, created_at
        from econ_logs
        where created_at > now() - interval '{int(days)} days'
        order by created_at
    """)
