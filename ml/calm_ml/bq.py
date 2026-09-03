# =============================================================
#  calm forest · BigQuery 조회 모듈 — 분석/학습 데이터의 유일한 원천
#  ------------------------------------------------------------
#  ▶ 왜 db.py(Supabase)가 아니라 여기인가:
#    Supabase 는 최근 7일만 보관한다(scripts/export_to_bq.py 가 적재 후 prune).
#    실측 차이 — Supabase 15,471행/120기기 vs BQ 77,425행/204기기(07-27~09-01).
#    Supabase 로 리텐션·이탈을 재면 조용히 1/5 표본으로 계산된다. 분석은 무조건 BQ.
#
#  ▶ 인증: gcloud ADC(`gcloud auth application-default login`). 키 파일 안 쓴다.
#  ▶ 리전: asia-northeast3(서울) 고정. 클라이언트 기본값 US 로 두면
#    "Dataset not found in location US" 404 가 난다 — 두 데이터셋 다 서울에 있다.
#  ▶ "BigQuery Storage module not found" 경고는 무시해도 된다. 대용량 결과를 빠르게
#    받는 선택적 가속 경로일 뿐이고, 이 분석의 결과는 수백 행이라 REST 로 충분하다.
# =============================================================
from __future__ import annotations

import pandas as pd
from google.cloud import bigquery

PROJECT = "calm-forest"
LOCATION = "asia-northeast3"

RAW = f"{PROJECT}.calm_forest_raw"          # Supabase 미러(좌표·경제원장·세션·세이브)
GA4 = f"{PROJECT}.analytics_547127440"      # GA4 네이티브 export

_client: bigquery.Client | None = None


def client() -> bigquery.Client:
    """프로세스당 클라이언트 1개를 재사용한다(노트북에서 셀마다 새로 만들지 않도록)."""
    global _client
    if _client is None:
        _client = bigquery.Client(project=PROJECT, location=LOCATION)
    return _client


def read_sql(query: str, **params) -> pd.DataFrame:
    """SQL → DataFrame.

    params 를 주면 named 파라미터로 바인딩한다(문자열 포매팅 금지 — 따옴표 사고 방지).
        read_sql("select * from t where d >= @since", since="2026-07-27")
    """
    cfg = None
    if params:
        cfg = bigquery.QueryJobConfig(query_parameters=[
            _param(k, v) for k, v in params.items()
        ])
    return client().query(query, job_config=cfg).to_dataframe()


def _param(name: str, value):
    """파이썬 값 → BQ 파라미터. 타입을 명시해야 BQ 가 받아준다."""
    if isinstance(value, bool):      # bool 이 int 의 하위 클래스라 먼저 검사
        t = "BOOL"
    elif isinstance(value, int):
        t = "INT64"
    elif isinstance(value, float):
        t = "FLOAT64"
    else:
        t = "STRING"
        value = str(value)
    return bigquery.ScalarQueryParameter(name, t, value)


def read_sql_file(path: str, **params) -> pd.DataFrame:
    """.sql 파일을 그대로 실행한다. 쿼리 본문을 노트북에 복사하지 않기 위한 것 —
    표본 정의가 두 곳에 존재하면 반드시 갈라진다."""
    with open(path, encoding="utf-8") as f:
        return read_sql(f.read(), **params)
