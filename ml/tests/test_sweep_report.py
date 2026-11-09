"""Sweep 묶음 리포트 — 저장 없이 패널 구성과 필터만 검증한다."""
import wandb_workspaces.reports.v2 as wr

from sweep_report import PCP_PARAMS, build_report


def _panels(report):
    grid = next(b for b in report.blocks if isinstance(b, wr.PanelGrid))
    return grid, {type(p).__name__: p for p in grid.panels}


def test_report_has_the_four_panel_kinds():
    report = build_report("20261209-0300", ["a1", "b2"])
    _, panels = _panels(report)
    assert {"ParallelCoordinatesPlot", "ParameterImportancePlot", "LinePlot", "ScalarChart"} <= set(panels)
    assert panels["ParameterImportancePlot"].with_respect_to == "objective"


def test_report_runset_filters_on_batch_tag():
    grid, _ = _panels(build_report("20261209-0300", ["a1"]))
    runset = grid.runsets[0]
    assert runset.project == "calm-forest"
    assert "batch-20261209-0300" in str(runset.filters)


def test_parallel_coordinates_end_with_objective():
    _, panels = _panels(build_report("20261209-0300", ["a1"]))
    cols = panels["ParallelCoordinatesPlot"].columns
    assert len(cols) == len(PCP_PARAMS) + 1
    assert "objective" in str(cols[-1].metric)


def test_line_plots_use_custom_axes():
    grid, _ = _panels(build_report("20261209-0300", ["a1"]))
    lines = [p for p in grid.panels if isinstance(p, wr.LinePlot)]
    xs = {str(p.x) for p in lines}
    assert any("curve/iteration" in x for x in xs)
    assert any("fold/index" in x for x in xs)


def test_report_lists_sweep_links():
    report = build_report("20261209-0300", ["a1", "b2"])
    text = " ".join(str(b) for b in report.blocks)
    assert "sweeps/a1" in text and "sweeps/b2" in text
