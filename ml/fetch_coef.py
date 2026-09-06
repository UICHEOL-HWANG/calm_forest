# =============================================================
#  calm forest · 계수 파일 롤백 — W&B 아티팩트 churn-coef 의 버전을 내려받는다
#  ------------------------------------------------------------
#  ▶ 목록:   uv run python fetch_coef.py --list
#  ▶ 받기:   uv run python fetch_coef.py --version v3 --out /opt/calm-api/model/coef.json
#           (--version 은 v3 · latest · model_version 문자열 전부 된다)
#  VM 에서는 Airflow 컨테이너 안에서 실행한다(wandb·키가 거기 있다):
#    sudo docker exec airflow-airflow-scheduler-1 python /opt/airflow/dags/ml/fetch_coef.py --version v3 --out /opt/calm-api/model/coef.json
#  API 는 파일 시각을 보고 즉시 다시 읽는다 — 재시작 불필요.
# =============================================================
from __future__ import annotations

import argparse
import shutil
from pathlib import Path

ENTITY, PROJECT, ARTIFACT = "icucheol", "calm-forest", "churn-coef"


def artifact_ref(version: str) -> str:
    """'v3' · 'latest' · '2026-09-06T06:31:34Z' → 'icucheol/calm-forest/churn-coef:<version>'.
    model_version 의 ':' 는 별칭 규칙에 맞춰 '-' 로 바꾼다(train_churn.version_alias 와 동일)."""
    return f"{ENTITY}/{PROJECT}/{ARTIFACT}:{version.replace(':', '-')}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", default="latest")
    ap.add_argument("--out", default=None, help="비우면 현재 폴더에 coef.json 으로 둔다")
    ap.add_argument("--list", action="store_true", help="버전 목록만 보여준다")
    a = ap.parse_args()

    import wandb
    api = wandb.Api()

    if a.list:
        for v in api.artifact_type("model", project=f"{ENTITY}/{PROJECT}").collection(ARTIFACT).artifacts():
            md = v.metadata or {}
            print(f"{v.version:>6}  {md.get('model_version','?')}  auc={md.get('auc', float('nan')):.3f}  n={md.get('n','?')}  aliases={v.aliases}")
        return

    art = api.artifact(artifact_ref(a.version))
    d = Path(art.download())
    src = d / "coef.json"
    out = Path(a.out or "coef.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".json.tmp")   # 원자적 교체 — API 가 반쯤 쓰인 파일을 읽지 않게
    shutil.copyfile(src, tmp)
    tmp.replace(out)
    print(f"{art.name} ({art.metadata.get('model_version','?')}) → {out}")


if __name__ == "__main__":
    main()
