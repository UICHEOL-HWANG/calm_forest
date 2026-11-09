# 리텐션 안내 모델 · 모델 패밀리 확장 + W&B Sweep

## Context
- 지금 서빙 모델은 L2 로지스틱 하나(`C=0.2`, class_weight 1:4, 26피처)다. 9/15 G5 분석에서 "양성 30대 이상이 되면 얕은 GBM을 보조 비교로 연다"는 게이트를 정해 두었다.
- 2026-11-09 BQ 재집계 결과 학습 표본은 n=1,823, 양성 98(5.4%)이다. 게이트를 넘었다.
- 월별 양성률이 9월 8.3%, 10월 4.0%, 11월 6.5%로 흔들린다(광고 유입). 랜덤 CV만으로는 실제 성능을 과대평가한다.
- 목표: W&B Sweep으로 여러 모델 패밀리와 하이퍼파라미터를 탐색한다. 승격은 엄격한 게이트를 통과할 때만 하고, 매주 재학습(Airflow)은 지금처럼 "선택된 설정으로 고정 학습"을 유지한다.
- 범위는 리텐션 안내 모델 먼저다. 이탈 예측(`train_churn.py`, Supabase 세션 라벨)은 같은 틀을 2단계에서 재사용한다.

## 설계

### 1. 평가 프로토콜 (`ml/calm_ml/model_eval.py` 신규)
- **시간 기준 홀드아웃**: `first_day` 기준 가장 최근 4주를 test로 뗀다. Sweep은 test를 보지 않는다.
- **개발 구간 평가**: 남은 구간에 repeated StratifiedKFold(5×3)를 쓴다. 대체(imputation)와 스케일링은 Pipeline 안, 즉 폴드 안에서 한다. 현재 `_cv_auc`의 낙관 편향을 없앤다.
- **지표**: AUC, PR-AUC, top30% recall, Brier, 폴드 간 표준편차. Sweep의 목표 지표는 `cv_pr_auc_mean - 0.5*std`다. 양성 5%에서는 PR-AUC가 더 민감하고, std 항으로 흔들리는 설정에 벌점을 준다.
- 재사용: `calm_ml.retention_features._derive_features`·`FEATURE_ORDER`, `train_retention_guidance._raw_feature_row`·`_prepare`(대체만 Pipeline으로 이동), G5 노트북(`ml/scripts/build_g5_model_family_comparison_notebook.py`)의 `bootstrap_ci` 로직.

### 2. 모델 패밀리 (`ml/calm_ml/model_zoo.py` 신규)
| family | 탐색 공간 |
|---|---|
| logreg | C(log 1e-3~10), penalty l1/l2/elasticnet(l1_ratio), class_weight 1~8 |
| complement_nb | alpha (카운트형 baseline) |
| extra_trees | n_estimators 200~800, max_depth 2~5, min_samples_leaf 5~50 |
| hist_gbm (sklearn) | max_depth 2~4, learning_rate 0.02~0.2, max_iter 100~500, l2, min_samples_leaf 10~60 |
| lightgbm | num_leaves 4~15, max_depth 2~4, lr, n_estimators, min_child_samples 10~60, reg_lambda, scale_pos_weight |
| xgboost | max_depth 2~4, eta, n_estimators, min_child_weight, subsample, colsample, scale_pos_weight |
- 공통 축: 피처 묶음 `all26` / `core5`(축소안) / `no_session_proxy`(세션 생존 프록시 제외).
- 트리 계열은 깊이 4 이하로 제한한다(양성 98).
- `ml/pyproject.toml`과 `infra/airflow/Dockerfile`에 `lightgbm`, `xgboost`를 추가한다.

### 3. Sweep
- `ml/sweeps/retention_guidance_<family>.yaml`: method `bayes`. 조건부 공간 문제를 피하려고 family별 sweep을 6개로 나눈다.
- `ml/sweep_retention_guidance.py`: `wandb.agent` 진입점. BQ 표본을 한 번 받아 parquet 캐시로 두고, 런마다 config → 모델 → 평가 → `wandb.log`. test 지표는 로그하지 않는다.
- `ml/select_retention_guidance.py`: Sweep이 끝나면 family별 상위 3개를 고른다. **그때만** 시간 홀드아웃 test에서 평가하고 bootstrap 95% CI를 구한다. W&B 리포트 표와 `selected_hyperparams.json` 후보를 만든다.
- 런 수: family당 30~40, 총 ~200. 1 OCPU에서 LR과 NB는 초 단위, GBM은 런당 수십 초라 수 시간 안에 끝난다.

### 4. 승격 게이트 (자동 교체 아님)
다음을 모두 만족할 때만 새 설정을 채택한다.
1. 홀드아웃 PR-AUC가 현재 로지스틱보다 높고, AUC CI 하한이 현재 AUC CI 하한 이상
2. top30 recall ≥ 현재값
3. 폴드 std가 현재의 1.5배 이하
4. 트리 모델이면 Sweep 2회 연속 같은 패밀리가 이긴다

통과하면 `selected_hyperparams.json`을 갱신한다(사람 확인 후). 매주 DAG는 그 설정으로 학습한다.

### 5. 서빙 확장 (트리 모델이 이길 때만)
- `retention_guidance.json`에 `model_type` 필드를 추가한다(`logreg` 기본값이라 옛 파일과 호환).
- 트리는 LightGBM `dump_model()` / XGBoost JSON / sklearn 트리를 **공통 JSON 트리 포맷**으로 바꿔 넣는다. API는 순수 파이썬으로 평가한다. API 이미지에 무거운 라이브러리를 넣지 않고, mtime 핫리로드를 유지한다.
- 파일: `ml/calm_ml/tree_export.py`(변환), `ml/api/retention_guidance.py`(`_score` 분기, 검증), `ml/train_retention_guidance.py`(`_new_clf` → `model_zoo.build(selected)`).
- 정합성 테스트: 원본 `predict_proba`와 API 점수의 차이가 1e-6 이내.

### 6. Airflow
- `infra/airflow/dags/retention_guidance_sweep.py` 신규. 수동 트리거와 월 1회(첫째 일요일 03:00)로 돈다. sweep 생성 → agent N런 → select → Slack #cf-data 요약(`anomaly_watch`의 토큰과 방식 재사용). 처음엔 일시정지 상태로 등록한다.
- 기존 `retention_guidance_train`(월 04:30)은 그대로 두고, 학습기만 `model_zoo`를 쓴다.
- ⚠️ VM 분리 후 Airflow(VM A)와 API(VM B)가 다른 호스트가 된다. 지금 DAG는 `/opt/calm-api/model/`에 직접 쓴다. 모델 전달 경로(W&B 아티팩트 pull, 또는 VM B로 rsync)는 VM 이전 계획에서 정한다. 이 작업에서는 `MODEL_OUT`을 환경변수로 빼 두기만 한다.

## 수정·신규 파일
- 신규: `ml/calm_ml/model_eval.py`, `ml/calm_ml/model_zoo.py`, `ml/calm_ml/tree_export.py`, `ml/sweep_retention_guidance.py`, `ml/select_retention_guidance.py`, `ml/sweeps/*.yaml`, `infra/airflow/dags/retention_guidance_sweep.py`
- 수정: `ml/train_retention_guidance.py`, `ml/api/retention_guidance.py`, `ml/pyproject.toml`, `infra/airflow/Dockerfile`, `infra/airflow/dags/retention_guidance_train.py`
- 테스트: `ml/tests/test_model_eval.py`, `test_model_zoo.py`, `test_tree_export.py`, 기존 `test_train_retention_guidance.py`·`test_retention_guidance_api.py`·`test_retention_guidance_dag.py` 확장
- dev docs: `dev/active/model-sweep/` (plan·context·tasks)

## 순서 (TDD)
1. dev docs 생성
2. `model_eval` (시간 분할, 폴드 내 대체): 테스트 → 구현
3. `model_zoo` 6패밀리: 테스트 → 구현, 의존성 추가
4. Sweep 러너와 yaml, 로컬에서 family당 3런 스모크(W&B 온라인)
5. `select` + 홀드아웃 + CI 리포트
6. 로컬 전체 Sweep 1회 → 결과를 사용자와 같이 보고 승격 여부 판단
7. 트리가 이기면 `tree_export` + API 분기, 아니면 5절은 보류
8. Sweep DAG (VM 이전 뒤 배포)
9. code-reviewer, python-reviewer

## 검증
- `cd ml && uv run pytest` 전부 통과
- 로컬 스모크: `uv run python sweep_retention_guidance.py --family logreg --count 3` → W&B `calm-forest`에 런 생성 확인
- 현재 설정(C=0.2 logreg)을 새 프로토콜로 다시 재서 기준선 기록(이전 cv_auc 0.90과 차이를 보고)
- 트리 서빙 시: 정합성 테스트, 로컬 uvicorn `/retention-guidance/predict` 스모크
- DAG: 기존 `test_retention_guidance_dag.py` 방식의 파싱 테스트
