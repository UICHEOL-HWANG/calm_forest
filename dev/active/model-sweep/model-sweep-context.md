# 모델 Sweep · 맥락

Last Updated: 2026-11-09 16:40

## 핵심 파일
| 파일 | 역할 |
|---|---|
| ml/train_retention_guidance.py | 주간 학습·export(logreg 고정), _raw_feature_row·_prepare 재사용 |
| ml/calm_ml/retention_features.py | FEATURE_ORDER·_derive_features 단일 소스(서빙·학습 공용) |
| ml/sql/retention_guidance_train_sample.sql | 학습 표본(9/4~ 누적, 배너 본 기기 제외), first_day·later_active |
| ml/reports/g5_refined_hyperparam_search_2026-09-15/selected_hyperparams.json | 현재 선택 설정 |
| ml/api/retention_guidance.py | 선형 점수 서빙, mtime 핫리로드 |
| infra/airflow/dags/retention_guidance_train.py | 월 04:30 재학습, MODEL_OUT 직접 쓰기 |
| ml/calm_ml/tracking.py | W&B start_run(PROJECT=calm-forest) |

## 결정
- 2026-11-09 표본 n=1,823·양성 98(5.4%) → G5 게이트(양성 30+) 통과, GBM 계열 보조 비교 개방(사용자 "모델 넓히자").
- 월별 양성률 9월 8.3%·10월 4.0%·11월 6.5% → 시간 홀드아웃(최근 4주) 필수.
- Sweep 은 탐색, 승격은 게이트+사람 확인. 주간 DAG 는 고정 설정 학습 유지.
- VM 2대(1 OCPU·6GB, ARM 추정)로 이전 예정: A=Airflow, B=API·nginx. 모델 전달 경로는 VM 이전 때 결정.

## 의존성
- lightgbm·xgboost 추가(macOS 는 libomp 필요할 수 있음).

## 결정 (진행 중 추가)
- 홀드아웃은 "최근 4주" → **최근 25% 행(날짜 경계)**. 10월 중순 이후 표본이 몰려 4주 홀드아웃이 1,550대를 가져가 dev 가 264대·양성 18 로 줄었다(스모크 sa5f27ft). 바꾼 뒤 dev 1,189·양성 57(x3c9as1g).
- 로컬 저장 금지(사용자 "그냥 버킷에 버려버리자"): 표본은 OCI 버킷 `ml/samples/retention_guidance/YYYY-MM-DD.parquet`, 선택 결과 `ml/sweeps/YYYY-MM-DD/selection.json`, 모델 `ml/models/`. `calm_ml/storage.py`(SigV4, DAG s3_headers 와 동일성 테스트). 키 없으면 저장 없이 진행+경고.
- 로컬 OCI 키는 `OCI_S3_JSON` 경로로 받는다(아직 없음). VM 은 /opt/airflow/secrets/oci_s3.json.
- selected_hyperparams.json 은 git 유지(사람 승격 이력).

## 새 VM
- SSH 키: ~/Downloads/VMmain_key/ssh-key-2026-10-27.key(Airflow), ~/Downloads/MLserving_key/ssh-key-2026-11-08.key(API). 권한 644 → ~/.ssh 로 옮겨 600 필요. 공인 IP 대기.
