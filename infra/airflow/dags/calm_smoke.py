"""calm forest 실험실 — 세팅 검증용 스모크 DAG(매일 09:00 KST, 날짜 출력만)."""
from datetime import datetime
from airflow import DAG
from airflow.operators.bash import BashOperator

with DAG(
    dag_id="calm_smoke",
    description="세팅 검증: 스케줄러/워커가 살아있는지 확인",
    start_date=datetime(2026, 8, 1),
    schedule="0 9 * * *",   # KST 09:00 (compose 타임존 Asia/Seoul)
    catchup=False,
    tags=["setup"],
) as dag:
    BashOperator(task_id="print_date", bash_command="date && echo calm-forest lab OK")
