"""Build G3 Toss segment readiness notebook for the early/later candidate label."""
from pathlib import Path

import nbformat as nbf

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "ml/notebooks/15_toss_segment_readiness_for_modeling.ipynb"
nb = nbf.v4.new_notebook()
nb.metadata = {
    "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
    "language_info": {"name": "python", "version": "3.12"},
}


def md(body):
    nb.cells.append(nbf.v4.new_markdown_cell(body))


def code(body):
    nb.cells.append(nbf.v4.new_code_cell(body))


md("""# 15 · 토스 세그먼트와 모델링 준비도 감사

**한 줄 답:** 첫 10분/이후 24시간 라벨은 시간 누수 없이 만들 수 있지만, 현재 46대·양성 8대라 모델 학습이 아니라 세그먼트별 표본 적정성 감사에서 멈춘다.

**게이트:** G3 보강. 표본·라벨·세그먼트·기기 단위 후보표가 재실행 가능하고, 경계 위반이 0이며, 모델링으로 넘어가기 전 부족한 양성 수와 오염 위험을 문서화하면 통과다. AUC·피처 중요도·모델 학습은 이 노트북 범위 밖이다.

**이전 노트북과의 연결:** 14번은 시간 경계와 라벨 분포만 확인했다. 이 노트북은 같은 정의를 기기 단위 후보표와 세그먼트 준비도 표로 확장한다.""")

md("""## 1. 범위와 금지선

- 원천은 BigQuery GA4 일별 export 2026-09-04~09-12(KST)다. `platform='toss'` 이벤트가 처음 관측된 기기를 대상으로 한다.
- 첫 토스 이벤트부터 10분 미만은 피처 구간, 10분 이후 24시간 미만은 임시 라벨 구간이다. 24시간 관측이 완전하지 않은 기기는 제외한다.
- `beta_A/B` 표식 기기는 제외한다. 다만 미표식 내부 사용자까지 배제됐다는 증거는 없다.
- `user_pseudo_id`는 쿼리 내부에서만 묶는다. 저장 결과에는 `D001` 같은 익명 행 라벨만 남긴다.
- 자동 수집·로그인·경제 장부·`tutorial_skip`은 의도적 행동에서 제외한다.
- 이번 노트북은 모델을 학습하지 않는다. 모델링 후보표가 만들어져도 G4 베이스라인 승인 전에는 쓰지 않는다.""")

code("""from pathlib import Path
import json
import os, sys

import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import pandas as pd
from IPython.display import Markdown, display

ROOT = Path.cwd()
if ROOT.name == 'notebooks':
    ROOT = ROOT.parents[1]
os.chdir(ROOT)
sys.path.insert(0, str(ROOT / 'ml'))

from calm_ml import bq, report as R

R.setup()
SQL_DEVICE = ROOT / 'ml/sql/g3_toss_device_feature_candidate.sql'
SQL_SEGMENT = ROOT / 'ml/sql/g3_toss_segment_modeling_readiness.sql'
OUT = ROOT / 'ml/reports/g3_toss_segment_readiness_2026-09-15'
OUT.mkdir(parents=True, exist_ok=True)

def wilson(k, n, z=1.96):
    if n == 0:
        return 0, 0
    p = k / n
    den = 1 + z * z / n
    center = (p + z * z / (2 * n)) / den
    half = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / den
    return center - half, center + half
""")

md("""## 2. 실행 SQL

첫 SQL은 다음 모델링 게이트에서 쓸 수 있는 **익명 기기 단위 후보표**를 만든다. 두 번째 SQL은 같은 표본을 세그먼트별로 집계해 표본 수와 양성 수를 확인한다.""")

code("""display(Markdown('### 기기 단위 후보표 SQL\\n```sql\\n' + SQL_DEVICE.read_text(encoding='utf-8') + '\\n```'))
display(Markdown('### 세그먼트 준비도 SQL\\n```sql\\n' + SQL_SEGMENT.read_text(encoding='utf-8') + '\\n```'))
""")

md("""## 3. 기기 단위 후보표

이 표는 원시 ID 없이 로컬 CSV로만 저장한다. 모델 학습용 확정표가 아니라, 다음 게이트에서 베이스라인을 돌릴 수 있는지 보는 후보표다.""")

code("""devices = bq.read_sql_file(str(SQL_DEVICE))
devices.to_csv(OUT / 'device_feature_candidates.csv', index=False)

assert len(devices) == 46
assert int(devices.later_active.sum()) == 8
assert int(devices.feature_boundary_violations.sum()) == 0
assert int(devices.label_boundary_violations.sum()) == 0
assert devices.device_label.is_unique

summary = pd.DataFrame({
    '항목': ['기기 수', '임시 양성', '임시 음성', '피처 경계 위반', '라벨 경계 위반'],
    '값': [
        len(devices),
        int(devices.later_active.sum()),
        int((~devices.later_active).sum()),
        int(devices.feature_boundary_violations.sum()),
        int(devices.label_boundary_violations.sum()),
    ],
})
display(summary)
display(devices.head(10))
""")

md("""## 4. 세그먼트별 준비도

세그먼트별 후속 행동률을 보되, 분자가 한 자리수면 순위로 읽지 않는다. `modeling_readiness_flag`는 모델 성능이 아니라 표본 수 경고다.""")

code("""segments = bq.read_sql_file(str(SQL_SEGMENT))
segments.to_csv(OUT / 'segment_modeling_readiness.csv', index=False)

assert int(segments.query("segment_axis == '전체'").devices.iloc[0]) == 46
assert int(segments.query("segment_axis == '전체'").later_active_devices.iloc[0]) == 8
assert int(segments.feature_boundary_violations.sum()) == 0
assert int(segments.label_boundary_violations.sum()) == 0

display(segments)
""")

code("""plot_axes = ['초반 행동량', '초반 영역 수', '초반 연결 상태']
plot = segments[segments.segment_axis.isin(plot_axes)].copy()
plot[['ci_low', 'ci_high']] = [wilson(int(k), int(n)) for k, n in zip(plot.later_active_devices, plot.devices)]
plot['label'] = plot.segment_axis + ' · ' + plot.segment_value
plot = plot.sort_values(['segment_axis', 'devices'])

fig, ax = R.new(
    '초반 행동이 깊어도 양성 수는 아직 한 자리수다',
    int(segments.query("segment_axis == '전체'").devices.iloc[0]),
    sub='점=10분 이후~24시간 내 의도적 행동률, 선=95% 윌슨 구간',
    ylab='후속 행동률',
    figsize=(9, 5.8),
)
y = range(len(plot))
ax.errorbar(
    plot.later_active_rate,
    list(y),
    xerr=[plot.later_active_rate - plot.ci_low, plot.ci_high - plot.later_active_rate],
    fmt='o',
    color=R.PALETTE[1],
    capsize=4,
)
ax.set_yticks(list(y), plot.label)
ax.set_xlim(0, min(1, max(plot.ci_high) * 1.22))
ax.xaxis.set_major_formatter(mticker.PercentFormatter(1))
for i, (_, row) in enumerate(plot.iterrows()):
    ax.text(row.ci_high + 0.015, i, f"{int(row.later_active_devices)}/{int(row.devices)}", va='center', fontsize=9)
chart_segment = R.save(fig, ax, 'g3_toss_segment_later_rate', zero_base=False)
print(R.check(chart_segment))
display(R.show(chart_segment))
""")

md("""## 5. 다음 모델링에 필요한 최소 조건

현재 후보 라벨은 “10분 이후 24시간 내 의도적 행동이 있었나”다. 게임 중 리텐션을 유지하고 퀘스트·즐길거리로 유도하는 로직으로 이어지려면, 라벨은 단순 후속 행동보다 **개입 가능한 다음 행동**에 가까워야 한다.

이번 숫자로 가능한 결론은 좁다. 첫 10분 행동이 6회 이상인 집단에서 후속 행동 6/17이 관측됐지만, 전체 양성이 8대뿐이다. `1~5회`의 0/7이나 낚시·바다 3/4 같은 값은 패턴 후보일 뿐 모델 피처로 확정할 수 없다.

G4로 넘어가기 전 필요한 조건:

1. 예측 목표를 하나로 고정한다. 후보는 `후속 의도적 행동`, `새 영역 첫 도달`, `퀘스트/교류 도달`, `다음 세션 재방문` 중 하나다.
2. 표본이 최소한 전체 100대 이상, 양성 20대 이상이 될 때까지는 모델 학습보다 베이스라인만 본다.
3. 내부 사용자·QA 기기 표식 커버리지를 확인한다. 표식이 없으면 심층 행동 상위 기기를 민감도 제외군으로 둔다.
4. 첫 10분 안에서 추천 가능한 상태 피처만 남긴다. 예: 초반 영역 수, 자연·채집 도달, 퀘스트·교류 도달, 연결 실패, 로그인 화면, 튜토리얼 진행. 이후 24시간 이벤트나 전체 첫날 총량은 피처로 쓰지 않는다.
5. G4는 다수 클래스와 단일 피처 베이스라인까지만 돌린다. G5 모델 학습은 별도 승인 뒤 진행한다.""")

md("""## 6. 이 숫자로 말할 수 없는 것

- 이 라벨은 D1/D7 리텐션이 아니다. “24시간 내 한 번 더 행동했다”는 좁은 대리 지표다.
- 세그먼트별 차이는 대부분 한 자리수 분자다. 순위·인과·개인화 규칙으로 읽을 수 없다.
- `platform=toss` 표식 전에 떠난 사용자는 표본에 없다. 진입 실패를 포함한 전체 토스 유입 이탈률은 아니다.
- 연결 실패와 후속 행동의 관계는 순서와 재시도 흐름을 보지 않으면 원인으로 해석할 수 없다.
- 익명 기기 후보표는 같은 브라우저/기기 단위다. 사람 단위 리텐션으로 승격할 수 없다.""")

code("""assumptions = {
    'analysis': 'g3-toss-segment-readiness-for-modeling',
    'date': '2026-09-15',
    'source': 'BigQuery GA4 daily export, 2026-09-04 through 2026-09-12 KST',
    'gate': 'G3 supplemental readiness audit',
    'decision_supported': 'Whether the Toss early/later candidate label is ready for G4 baselines.',
    'result': 'not_ready_for_model_training',
    'checks': {
        'device_rows': int(len(devices)),
        'candidate_positive_devices': int(devices.later_active.sum()),
        'candidate_negative_devices': int((~devices.later_active).sum()),
        'feature_boundary_violations': int(devices.feature_boundary_violations.sum()),
        'label_boundary_violations': int(devices.label_boundary_violations.sum()),
        'overall_flag': str(segments.query("segment_axis == '전체'").modeling_readiness_flag.iloc[0]),
    },
    'assumptions': [
        {
            'assumption': 'platform=toss identifies the relevant Toss webview cohort after the first recorded Toss event.',
            'confidence': 'medium',
            'impact_if_wrong': 'high',
            'validation': 'Cross-check against server-side session platform when available.',
            'result': 'open',
        },
        {
            'assumption': 'The 10-minute feature window contains only information available before intervention.',
            'confidence': 'high',
            'impact_if_wrong': 'critical',
            'validation': 'Boundary violation counts are zero.',
            'result': 'passed',
        },
        {
            'assumption': 'A 10m-to-24h deliberate action label is useful for quest/content guidance.',
            'confidence': 'low',
            'impact_if_wrong': 'critical',
            'validation': 'Needs user agreement on the business target before G4.',
            'result': 'candidate_only',
        },
        {
            'assumption': 'Marked beta_A/B devices are enough to remove testers.',
            'confidence': 'medium',
            'impact_if_wrong': 'high',
            'validation': 'Needs tester roster/device coverage or sensitivity exclusion of deep devices.',
            'result': 'open',
        },
    ],
}
(OUT / 'assumptions.json').write_text(json.dumps(assumptions, ensure_ascii=False, indent=2), encoding='utf-8')
display(Markdown('```json\\n' + json.dumps(assumptions, ensure_ascii=False, indent=2) + '\\n```'))
""")

md("""## 7. 판정과 다음 확인

**G3 보강 판정:** 시간 경계와 재현 가능한 익명 후보표는 통과했다. 모델 학습은 보류한다. 전체 46대, 임시 양성 8대라 지금 학습하면 게임 중 리텐션 신호보다 몇몇 심층 기기와 날짜 꼬리를 외울 가능성이 크다.

**다음 게이트 후보:** 사용자와 예측 목표를 먼저 고른 뒤 G4 베이스라인으로 간다. 지금 가장 덜 위험한 목표 후보는 `10분 이후 24시간 내 퀘스트·교류 또는 새 영역 도달`처럼 실제로 게임 안에서 유도할 수 있는 행동이다. 단, 목표를 확정하기 전에는 이 후보를 전제로 다음 분석을 시작하지 않는다. 여기서 멈춘다.""")

DEST.parent.mkdir(parents=True, exist_ok=True)
nbf.write(nb, DEST)
print(DEST)
