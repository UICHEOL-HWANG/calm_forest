"""BQ 에서 원시 윈도 행 + SQL 이 계산한 피처값을 뽑아 JS 테스트용 픽스처로 저장한다.

    uv run --directory ml python tests/make_parity_fixture.py

이 픽스처가 JS↔SQL 동등성의 기준점이다. SQL 을 고치면 반드시 다시 생성한다.
다양한 경우가 섞이도록 idle_ratio 양극단과 중간을 고른다.
"""
import json
import math
from pathlib import Path

from calm_ml import bq

ML = Path(__file__).resolve().parents[1]
OUT = ML.parent / "tests" / "fixtures" / "feature_parity.json"
CAP = 20
FEATS = ["path_len", "net_disp", "wander_ratio", "yaw_total", "mouse_travel", "idle_ratio"]


def _clean(v):
    if v is None:
        return None
    v = float(v)
    return None if math.isnan(v) else v


def main() -> None:
    df = bq.read_sql_file(str(ML / "sql" / "churn_trigger_sample.sql"), cap=CAP)
    # idle_ratio 양극단 + 중간 + wander_ratio 결측(net_disp=0) 을 고루 담는다
    picks = set()
    ordered = df.sort_values("idle_ratio")
    for sub in (ordered.head(4), ordered.tail(4), df[df.wander_ratio.isna()].head(3),
                df[df.trigger_kind == "quest"].head(3), df.sample(4, random_state=0)):
        for i in sub.index:
            picks.add(i)

    cases = []
    for i in sorted(picks):
        r = df.loc[i]
        rows = bq.read_sql(
            """
            SELECT char_x, char_z, cam_yaw, mouse_x, mouse_y FROM (
              SELECT char_x, char_z, cam_yaw, mouse_x, mouse_y,
                     ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY id) AS rn
              FROM `calm-forest.calm_forest_raw.game_logs`
              WHERE session_id = @sid AND client_id IS NOT NULL
            ) WHERE rn BETWEEN @lo AND @hi ORDER BY rn
            """,
            sid=r["session_id"], lo=int(r["trigger_rn"]) - 9, hi=int(r["trigger_rn"]),
        )
        if len(rows) != 10:
            continue
        cases.append({
            "session_id": r["session_id"],
            "trigger_kind": r["trigger_kind"],
            "trigger_rn": int(r["trigger_rn"]),
            "is_first_session": bool(r["is_first_session"]),
            "rows": [{k: float(v) for k, v in rec.items()} for rec in rows.to_dict("records")],
            "expected": {k: _clean(r[k]) for k in FEATS},
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cases, ensure_ascii=False, indent=2), encoding="utf-8")
    n_null = sum(1 for c in cases if c["expected"]["wander_ratio"] is None)
    print(f"{len(cases)}건 저장 (wander_ratio 결측 {n_null}건 포함) → {OUT}")


if __name__ == "__main__":
    main()
