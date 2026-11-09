from __future__ import annotations

import argparse

import wandb_workspaces.expr as wexpr
import wandb_workspaces.reports.v2 as wr

from sweep_retention_guidance import SWEEP_PROJECT, batch_tag

ENTITY = "icucheol"
OBJECTIVE = "objective"
PCP_PARAMS = ("family", "feature_set", "pos_weight", "C", "max_depth", "learning_rate", "n_estimators")


def _sweep_links(sweep_ids: list[str]) -> wr.UnorderedList:
    base = f"https://wandb.ai/{ENTITY}/{SWEEP_PROJECT}/sweeps"
    return wr.UnorderedList(items=[f"{base}/{sid}" for sid in sweep_ids])


def _panels() -> list:
    pcp_cols = [wr.ParallelCoordinatesPlotColumn(metric=wr.Config(p)) for p in PCP_PARAMS]
    pcp_cols.append(wr.ParallelCoordinatesPlotColumn(metric=wr.SummaryMetric(OBJECTIVE)))
    return [
        wr.ParallelCoordinatesPlot(title="Hyperparameter sweep", columns=pcp_cols,
                                   layout=wr.Layout(x=0, y=0, w=24, h=9)),
        wr.ParameterImportancePlot(with_respect_to=OBJECTIVE, layout=wr.Layout(x=0, y=9, w=12, h=9)),
        wr.ScalarChart(title="Best objective (cv PR-AUC − 0.5·std)", metric=wr.SummaryMetric(OBJECTIVE),
                       groupby_aggfunc="max", layout=wr.Layout(x=12, y=9, w=12, h=9)),
        wr.LinePlot(title="Boosting validation logloss", x="curve/iteration", y=["curve/val_logloss"],
                    layout=wr.Layout(x=0, y=18, w=12, h=9)),
        wr.LinePlot(title="PR-AUC by CV fold", x="fold/index", y=["fold/pr_auc"],
                    layout=wr.Layout(x=12, y=18, w=12, h=9)),
    ]


def build_report(batch: str, sweep_ids: list[str]) -> wr.Report:
    runset = wr.Runset(entity=ENTITY, project=SWEEP_PROJECT, name=f"sweep {batch}",
                       filters=[wexpr.Tags().isin([batch_tag(batch)])])
    return wr.Report(
        project=SWEEP_PROJECT,
        entity=ENTITY,
        title=f"Retention guidance sweep {batch}",
        description="All model families in one view. Objective is dev-window CV only; holdout lives in selection.json.",
        width="fluid",
        blocks=[
            wr.H2(text="Sweeps"),
            _sweep_links(sweep_ids),
            wr.PanelGrid(runsets=[runset], panels=_panels()),
        ],
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--batch", required=True)
    ap.add_argument("--sweep-ids", required=True)
    a = ap.parse_args()
    report = build_report(a.batch, a.sweep_ids.split(","))
    report.save()
    print(report.url)


if __name__ == "__main__":
    main()
