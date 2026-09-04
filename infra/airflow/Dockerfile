# calm forest 실험실 — Airflow 순정 이미지 + 파이프라인이 쓰는 클라이언트 2개.
#
# 왜 커스텀 이미지가 필요한가: apache/airflow 순정에는 구글 계열 패키지가 없습니다.
# tableau_sheets DAG 가 BigQuery 로 집계하고 구글 시트에 씁니다.
#
# apache-airflow-providers-google 대신 순수 클라이언트를 쓰는 이유:
#   provider 는 Airflow Connection(스코프 URL 인코딩)을 따로 설정해야 하는데,
#   이 스택은 서비스계정 키 파일 하나로 끝내는 편이 단순하고,
#   scripts/export_to_bq.py 가 이미 같은 방식(google-cloud-bigquery)이라 일관됩니다.
FROM apache/airflow:2.10.5

RUN pip install --no-cache-dir \
      "google-cloud-bigquery>=3.25,<4" \
      "gspread>=6.1,<7"
