"""Build the local G1 notebook for the Toss fishing-guide experiment."""
from pathlib import Path

import nbformat as nbf

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "ml/notebooks/11_toss_fishing_experiment_readiness.ipynb"
nb = nbf.v4.new_notebook()
nb.metadata = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3.12"},
}


def md(body):
    nb.cells.append(nbf.v4.new_markdown_cell(body))


def code(body):
    nb.cells.append(nbf.v4.new_code_cell(body))


md("""# 11 · 토스 낚시 안내 실험 — G1 데이터 준비도

**한 줄 답:** 현재 로그는 낚싯대 던지기 시각은 알려주지만, 기기 고정 배정과 적격성·실제 노출을 재구성하지 못한다.

승인된 G0는 [낚시 안내 실험 설계서](../../docs/TOSS_FISHING_GUIDE_EXPERIMENT.md)에 있다. 이번에는 과거 GA4의 계측 준비도만 본다. 배너 효과나 예측모델을 검정하지 않는다.

**조회 전 G1 통과 기준:** 토스 기기 식별 키와 튜토리얼 종료·낚시 행동 시각을 연결하고, 유급 테스터 제외·기존 예측 배너 겹침을 검증하며, 배정 시점의 과거 낚시 여부·호숫가 위치·낚싯대 사용 가능 상태를 기록할 방법이 확인돼야 한다. 하나라도 미확인이면 미통과.""")

md("""## 1. 범위와 제외

- BigQuery GA4의 완전 일별 export 2026-09-04~12(KST). Intraday는 제외한다.
- 이벤트 파라미터 `platform='toss'`만 토스로 판정한다. `(direct)` 유입 소스는 쓰지 않는다.
- 기록된 `beta_A/B` 행은 제외한다. 미표식 유급 테스터는 남을 수 있다.
- `user_pseudo_id`는 기기/브라우저 관측 키이지 사람이 아니다. 원시 ID는 결과로 내보내지 않는다.
- 튜토리얼 종료·건너뛰기 기록이 없다는 이유만으로 미완료라고 단정하지 않는다. `tutorial_skip`은 환영 화면과 코치 중단에 공용이다.""")

code("""from pathlib import Path
import os, sys
import pandas as pd
from IPython.display import Markdown, display
ROOT = Path.cwd()
if ROOT.name == 'notebooks': ROOT = ROOT.parents[1]
os.chdir(ROOT)
sys.path.insert(0, str(ROOT/'ml'))
from calm_ml import bq, report as R
R.setup()
EVENT_SQL = ROOT/'ml/sql/g1_toss_fishing_event_readiness.sql'
FLOW_SQL = ROOT/'ml/sql/g1_toss_fishing_candidate_flow.sql'
SEM_SQL = ROOT/'ml/sql/g1_toss_fishing_tutorial_semantics.sql'
OUT = ROOT/'ml/reports/g1_toss_fishing_readiness_2026-09-14'
OUT.mkdir(parents=True, exist_ok=True)
print('SQL 원본:', EVENT_SQL, FLOW_SQL, SEM_SQL)
""")

md("""## 2. SQL 원문과 원시 결과

첫 SQL은 이벤트별 기기·세션·클라이언트 ID 파라미터를 센다. 둘째 SQL은 같은 토스 기기에서 과거 로그로 복원되는 낚시 흐름을 센다. 아래 표가 해석 이전의 원시 집계다.""")

code("""fence = chr(96)*3
display(Markdown(fence + 'sql\\n' + EVENT_SQL.read_text(encoding='utf-8') + '\\n' + fence))
display(Markdown(fence + 'sql\\n' + FLOW_SQL.read_text(encoding='utf-8') + '\\n' + fence))
display(Markdown(fence + 'sql\\n' + SEM_SQL.read_text(encoding='utf-8') + '\\n' + fence))
events = bq.read_sql_file(str(EVENT_SQL))
flow = bq.read_sql_file(str(FLOW_SQL))
semantics = bq.read_sql_file(str(SEM_SQL))
events.to_csv(OUT/'event_readiness.csv', index=False)
flow.to_csv(OUT/'candidate_flow.csv', index=False)
semantics.to_csv(OUT/'tutorial_semantics.csv', index=False)
display(events)
display(flow)
display(semantics)
""")

md("""## 3. 기록으로 확인되는 기기 수

아래는 **계측 가용 범위**이지 실험 퍼널이 아니다. 10분 수치는 종료·건너뛰기 이벤트와 첫 던지기 양쪽의 기록이 있는 기기에만 계산할 수 있다.""")

code("""f = flow.iloc[0]
coverage = pd.DataFrame({
    '기록 단계': ['토스 이벤트 관측', '온보딩 종료·건너뛰기 기록', '낚싯대 던지기 기록', '해당 기록 뒤 10분 내 첫 던지기'],
    '기기 수': [int(f.toss_devices), int(f.tutorial_end_devices), int(f.cast_devices),
              int(f.cast_within_10m_of_tutorial_devices)],
})
coverage.to_csv(OUT/'observability.csv', index=False)
display(coverage)
fig, ax = R.new('낚시 행동은 기록되지만 실험 적격성은 복원되지 않는다', int(f.toss_devices),
                sub='토스 GA4 9/4~9/12 · 기록 확인 기기 수, 실제 실험 퍼널 아님',
                ylab='기기 수', figsize=(9, 4.8))
bars = ax.barh(coverage['기록 단계'], coverage['기기 수'], color=R.PALETTE[1])
ax.invert_yaxis(); ax.bar_label(bars, padding=3)
ax.set_xlim(0, int(f.toss_devices)*1.2)
chart = R.save(fig, ax, 'g1_toss_fishing_observability', zero_base=False)
print(R.check(chart)); display(R.show(chart))
""")

md("""## 4. 그래서 크기가 얼마나 되나

- 토스 관측 **49기기** 중 튜토리얼 종료·건너뛰기 이벤트는 **20기기**에 있다. 이 중 `welcome` 건너뛰기는 16건/15기기다.
- `fishing_cast` **209건**은 **6기기**가 남겼다. 이벤트 건수를 독립 이용자 수로 보면 크게 부풀린다.
- 첫 던지기가 이 종료·건너뛰기 기록 뒤 10분 안에 관측된 기기는 **2기기**다. 안내를 배정한 적이 없으므로 실험 전환율이 아니다.
- `churn_score` **217건/15기기**에는 arm은 붙지만 GA4 이벤트 파라미터 `client_id`는 **0건**이다.

## 5. 코드로 확인한 준비도

- VM `/predict`는 점수·개입 여부를 계산한다. 배너 종류·표시·낚시 행동은 브라우저에서 결정된다. VM JSONL만으로 노출·행동을 알 수 없다.
- `js/analytics.js`의 GA4 공통 이벤트에는 `platform`과 `ts`가 붙지만 `client_id`는 붙지 않는다. 자체 세션 로그에는 `client_id`가 있다. 기기 고정 배정과 GA4 결과를 잇는 실험 ID 계약이 필요하다.
- `fishing_cast`는 실제 호숫가 거리 검사와 던지기 성공 뒤 `js/game.js`에서 기록된다. `fishing_catch`는 별개 결과다.
- 호숫가 거리·낚싯대 사용 가능·기존 던지기 이력은 배정 시점의 클라이언트 상태/이력이 필요하다. 과거 GA4만으로 전부 재구성할 수 없다.
- `tutorial_complete`는 코치 졸업, `tutorial_skip`은 환영 화면 건너뛰기·코치 중단·안내서에서 다시 연 화면 닫기에 공용이다. 인트로 `intro_complete/skip`와도 다르다. 종료·건너뛰기 기록 없는 29기기를 미완료로 해석하지 않는다.

## 정정 기록

첫 집계 직후 20기기를 ‘튜토리얼 종료’라고 불렀다. 코드 확인 뒤 `tutorial_skip.at`을 추가 조회하니 `welcome` 16건/15기기와 숫자 단계의 중단 7건이 섞여 있었다. 그래서 본문·차트의 라벨을 ‘종료·건너뛰기 기록’으로 고쳤다. 첫 관측 이벤트가 실제 첫 조작 가능 시점이라는 보장도 없다.

## 6. 이 숫자로 말할 수 없는 것

미표식 테스터, 관측 범위 이전의 낚시 이력, 타 플랫폼 선행 플레이, 미기록 호숫가 도착, 실제 음향 청취는 배제·복원할 수 없다. 기존 `9/49`는 낚시·바다 영역 도달이고 이번 `6/49`는 낚싯대 던지기이므로 같은 지표가 아니다. 10분 내 2기기를 새 배너의 예상 전환율로 쓰지 않는다.

## 7. G1 판정과 다음 확인

**미통과.** 결과 이벤트 시각·GA4 기기 키는 있으나 배정 ID, 배정 시점 적격 상태, 실제 실험 배너 노출, 유급 테스터 확실한 제외, 기존 배너 억제가 없다. 다음 단계에서 이 계측 계약과 20기기/군 파일럿 검증 절차를 별도 승인받아야 한다. 그 전에는 실험 배포·효과 판정·모델 학습을 하지 않는다.

W&B 외부 업로드는 앞선 안전 검토의 보류 상태라 이 노트북과 집계는 로컬에만 남긴다.""")

DEST.parent.mkdir(parents=True, exist_ok=True)
nbf.write(nb, DEST)
print(DEST)
