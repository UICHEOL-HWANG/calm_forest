"""calm forest · BigQuery → 구글 시트 (태블로 퍼블릭 공개 대시보드 갱신용).

왜 시트를 거치나
  태블로 퍼블릭은 PostgreSQL·BigQuery 라이브 연결이 안 되고, 자동 갱신도
  **구글 시트 연결에만** 붙습니다(CSV/엑셀 업로드는 24시간 자동 갱신 대상 아님).
  그래서 "매일 집계 → 시트에 덮어쓰기"까지가 우리 몫이고, 시트→태블로는
  태블로가 24시간마다 알아서 당겨갑니다(갱신 시각은 지정 불가).

전체 사슬
  Supabase --(GH Actions supabase-to-bq.yml, 03:00 KST)--> BigQuery
           --(이 DAG, 04:00 KST)--> 구글 시트 --(24h 자동)--> 태블로 퍼블릭

SQL 원본
  sql/tableau_export.sql 하나뿐입니다. 이 DAG 는 그 파일의 `-- @tab: <이름>`
  마커를 읽어 쿼리를 쪼갤 뿐, SQL 을 복사해 두지 않습니다.
  (복사본을 두면 콘솔에서 고친 쿼리와 자동 갱신되는 쿼리가 조용히 갈라집니다.)

배포
  scp sql/tableau_export.sql oracle-calmforest:/opt/airflow/dags/sql/
  scp infra/airflow/dags/tableau_sheets.py oracle-calmforest:/opt/airflow/dags/

사전 준비(사람이 한 번만)
  1) 구글 시트를 새로 만들고, 서비스계정 client_email 에 **편집자**로 공유
  2) Airflow Variable `tableau_sheet_id` = 그 시트의 ID(URL 의 /d/<ID>/edit)
  3) 서비스계정 JSON 키를 VM `/opt/airflow/secrets/gcp_sa.json` (600) 에 두기
     — GH Actions 의 GCP_SA_KEY 와 같은 키를 써도 됩니다.
     단 그 키에 BigQuery Job User 권한이 있어야 하고,
     GCP 프로젝트에서 **Google Sheets API 사용 설정**이 켜져 있어야 합니다.
"""
from __future__ import annotations

import datetime as dt
import decimal
import os
import re

import pendulum
from airflow.decorators import dag, task
from airflow.models import Variable

KST = pendulum.timezone("Asia/Seoul")

SQL_PATH = os.environ.get("TABLEAU_SQL_PATH", "/opt/airflow/dags/sql/tableau_export.sql")
SA_KEY = os.environ.get("GCP_SA_KEY_PATH", "/opt/airflow/secrets/gcp_sa.json")
BQ_PROJECT = os.environ.get("BQ_PROJECT", "calm-forest")
BQ_LOCATION = os.environ.get("BQ_LOCATION", "asia-northeast3")   # 데이터셋 2개 모두 서울 리전

# 시트 한 탭이 이보다 커지면 실패시킨다. 조용히 잘라내면 대시보드가 거짓말을 한다.
MAX_ROWS = 50_000

MARKER = re.compile(r"^--\s*@tab:\s*([A-Za-z0-9_]+)\s*$")


def parse_marked_queries(path: str) -> dict[str, str]:
    """`-- @tab: 이름` 다음 줄부터 세미콜론까지를 한 쿼리로 잘라낸다."""
    with open(path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    out: dict[str, str] = {}
    tab, buf = None, []
    for line in lines:
        m = MARKER.match(line)
        if m:
            if tab:
                raise ValueError(f"{tab} 쿼리가 세미콜론으로 끝나지 않았습니다")
            tab, buf = m.group(1), []
            continue
        if tab is None:
            continue
        buf.append(line)
        if line.rstrip().endswith(";"):
            out[tab] = "\n".join(buf).rstrip().rstrip(";")
            tab = None
    if tab:
        raise ValueError(f"{tab} 쿼리가 세미콜론으로 끝나지 않았습니다")
    if not out:
        raise ValueError(f"{path} 에 -- @tab: 마커가 없습니다")
    return out


# DAG 파싱 시점에 읽는다 — 마커가 늘면 태스크도 따라 늘어난다.
# 파일이 없으면 여기서 터지고 UI 의 Import Errors 에 그대로 뜬다(조용한 실패 방지).
QUERIES = parse_marked_queries(SQL_PATH)


def _cell(v):
    """BigQuery 값을 시트가 받는 형태로. 숫자는 숫자로 남겨야 태블로가 측정값으로 읽는다."""
    if v is None:
        return ""
    if isinstance(v, decimal.Decimal):
        return float(v)
    # datetime 이 date 의 하위 클래스라 순서가 중요하다.
    # 또 date.isoformat() 은 sep 인자를 받지 않는다(datetime 만 받음) — 섞으면 TypeError.
    if isinstance(v, dt.datetime):
        return v.isoformat(sep=" ")
    if isinstance(v, dt.date):
        return v.isoformat()
    if isinstance(v, (int, float, str, bool)):
        return v
    return str(v)


@dag(
    dag_id="tableau_sheets",
    description="BigQuery 집계 → 구글 시트(태블로 퍼블릭 공개 대시보드)",
    start_date=pendulum.datetime(2026, 9, 1, tz=KST),
    schedule="0 4 * * *",          # GH Actions 의 Supabase→BQ(03:00 KST) 다음
    catchup=False,
    max_active_runs=1,
    default_args={"retries": 2, "retry_delay": dt.timedelta(minutes=10)},
    tags=["tableau", "export"],
)
def tableau_sheets():

    @task
    def push(tab: str) -> dict:
        """쿼리 하나를 돌려 시트 탭 하나를 통째로 덮어쓴다(멱등)."""
        import gspread
        from google.cloud import bigquery

        sheet_id = Variable.get("tableau_sheet_id")

        client = bigquery.Client.from_service_account_json(SA_KEY, project=BQ_PROJECT)
        job = client.query(QUERIES[tab], location=BQ_LOCATION)
        result = job.result()
        rows = list(result)
        if len(rows) > MAX_ROWS:
            raise ValueError(f"{tab}: {len(rows)}행 — 상한 {MAX_ROWS} 초과. 쿼리에서 줄이세요")

        header = [f.name for f in result.schema]
        values = [header] + [[_cell(v) for v in r.values()] for r in rows]

        gc = gspread.service_account(filename=SA_KEY)
        sh = gc.open_by_key(sheet_id)
        try:
            ws = sh.worksheet(tab)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=tab, rows=len(values) + 10, cols=len(header))
        ws.clear()
        # 시트 격자는 자동으로 늘어나지 않는다. 기본 1000행인데 t5 히트맵은 1,600행이 넘어
        # resize 없이 쓰면 "exceeds grid limits" 로 실패한다.
        ws.resize(rows=max(len(values) + 10, 10), cols=max(len(header), 1))
        ws.update(values=values, range_name="A1")
        return {"tab": tab, "rows": len(rows)}

    @task
    def stamp(results: list[dict]) -> None:
        """`_meta` 탭에 기준 시각을 남긴다 — 대시보드에 "데이터 기준"을 표시하기 위한 것.
        태블로 퍼블릭은 갱신 시각을 보여주지 않아서, 없으면 언제 데이터인지 알 수 없다."""
        import gspread

        gc = gspread.service_account(filename=SA_KEY)
        sh = gc.open_by_key(Variable.get("tableau_sheet_id"))
        try:
            ws = sh.worksheet("_meta")
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title="_meta", rows=20, cols=3)
        now = pendulum.now(KST).format("YYYY-MM-DD HH:mm:ss")
        values = [["generated_at_kst", "tab", "rows"]]
        values += [[now, r["tab"], r["rows"]] for r in sorted(results, key=lambda r: r["tab"])]
        ws.clear()
        ws.update(values=values, range_name="A1")

    stamp(push.expand(tab=sorted(QUERIES)))


tableau_sheets()
