# calm forest · 추론 API — 런타임 의존성만(학습 패키지는 Airflow 이미지에 있다)
FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir "fastapi>=0.115" "uvicorn[standard]>=0.32" "pydantic>=2.9"

# 코드는 이미지에 굽지 않고 바인드 마운트한다 — 한 줄 고칠 때마다 재빌드하지 않기 위해.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8100"]
