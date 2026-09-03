# =============================================================
#  calm forest · 보고용 차트 헬퍼
#  ------------------------------------------------------------
#  plain-analysis-report 스킬의 점검표를 "지키자"가 아니라 코드로 강제한다.
#  사람이 기억해서 지키는 규칙은 바쁠 때 제일 먼저 깨진다.
#
#  강제하는 것:
#   1) 차트 1장 = 파일 1개. 여러 패널을 한 장에 합치는 API 자체를 두지 않는다.
#   2) 제목에 표본 크기 n 을 자동으로 붙인다. n 없는 차트는 크기를 알 수 없어 오독된다.
#   3) 유니코드 마이너스(U+2212) 끄기 — 한글 폰트에 글리프가 없어 -0.05 가 ▯0.05 로 나온다.
#   4) 색은 검증된 팔레트만. dataviz validator 를 통과한 값이라 눈대중 수정 금지.
#   5) 수량 축은 0 에서 시작(bar/hist). 자르면 차이가 과장된다.
#
#  ⚠️ 저장했다고 끝이 아니다. 보내기 전에 PNG 를 실제로 열어봐야 한다
#     (라벨 겹침·축 잘림은 코드가 성공해도 생긴다). check() 가 도와준다.
# =============================================================
from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")                       # 노트북 밖에서도 동일하게 렌더
import matplotlib.pyplot as plt

# dashboards/_dash.css · 태블로 팔레트와 같은 검증값. 순서가 색맹 안전장치다.
PALETTE = ["#C4574A", "#3E6FC4", "#0E9078", "#B5851F", "#8552B8"]
# 곰 갈색 단일 램프 — 서피스/브랜드 전용이 아니라 '순서 있는 값'에만 쓴다
RAMP = ["#C4A170", "#AC8452", "#946B3B", "#78552E", "#5E4022"]

INK = "#2B2118"
MUTED = "#6B5B4A"

OUTDIR = Path(__file__).resolve().parents[1] / "reports" / "figs"


def tint(hex_color: str, amount: float):
    """검증된 팔레트 색을 흰색과 섞어 연한 톤을 만든다.

    섕키 리본처럼 같은 계열의 보조 톤이 필요할 때, 새 색을 눈대중으로 고르는 대신
    기존 색에서 파생시킨다. amount 0=원색, 1=흰색.
    """
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return tuple(c + (1 - c) * amount for c in (r, g, b))


def setup() -> None:
    """한글 폰트와 마이너스 기호를 세팅한다. 노트북 첫 셀에서 한 번 호출."""
    plt.rcParams["font.family"] = "AppleGothic"
    plt.rcParams["axes.unicode_minus"] = False   # ← 3) 글리프 깨짐 방지
    plt.rcParams["figure.dpi"] = 130
    plt.rcParams["savefig.bbox"] = "tight"       # 라벨이 그림 밖으로 잘리는 것 방지
    plt.rcParams["axes.edgecolor"] = MUTED
    plt.rcParams["axes.labelcolor"] = INK
    plt.rcParams["text.color"] = INK
    plt.rcParams["axes.grid"] = True
    plt.rcParams["grid.alpha"] = 0.25


def new(title: str, n: int, *, sub: str = "", ylab: str = "", figsize=(8, 4.2)):
    """차트 1장을 시작한다.

    title 은 라벨이 아니라 **문장**으로 쓴다 — "가격 vs 리뷰"(❌) / "비싼 메뉴일수록 리뷰가 적다"(⭕).
    n   은 필수. 표본 크기 없이 나가는 차트를 만들 수 없게 하려고 인자로 받는다.
    ylab 은 세로축 이름. 한글을 90도로 눕히면 글자마다 방향이 꺾여 읽기 어려우므로
         (실측 확인) 축 위에 **가로로** 얹는다.

    제목·부제·축이름을 여기서 한꺼번에 배치한다. 나중에 따로 얹으면 서로 겹친다(실측).
    """
    fig, ax = plt.subplots(figsize=figsize)

    lines = [f"{title}  (n={n:,})"]
    if sub:
        lines.append(sub)
    if ylab:
        lines.append(ylab)          # 마지막 줄 = 축 이름. 축 바로 위에 붙는다.
    ax.set_title("\n".join(lines), loc="left", fontsize=12, pad=10)

    # 축 이름 줄만 작고 흐리게 — 제목과 위계를 나눈다
    if ylab:
        ax.title.set_fontsize(12)
    ax.set_ylabel("")
    return fig, ax


def save(fig, ax, name: str, *, zero_base: bool = True) -> Path:
    """PNG 한 장으로 저장하고 경로를 돌려준다.

    zero_base: 수량 축을 0 에서 시작시킨다. 비율·좌표처럼 0 기준이 무의미하면 False.
    """
    if zero_base:
        lo, hi = ax.get_ylim()
        if lo > 0:
            ax.set_ylim(0, hi)             # ← 5) 축 자르기 방지
    OUTDIR.mkdir(parents=True, exist_ok=True)
    path = OUTDIR / f"{name}.png"
    fig.savefig(path)
    plt.close(fig)
    return path


def check(path: Path) -> str:
    """저장된 PNG 의 크기를 알려준다. 사람이 눈으로 여는 것을 대체하지 못하지만,
    빈 그림/과도한 여백 같은 명백한 사고는 여기서 걸린다."""
    from PIL import Image  # matplotlib 가 끌고 오는 pillow 재사용
    with Image.open(path) as im:
        w, h = im.size
        # 완전 단색이면 렌더가 실패한 것
        extrema = im.convert("L").getextrema()
    flat = extrema[0] == extrema[1]
    return f"{path.name}  {w}x{h}px" + ("  ⚠️ 단색 — 렌더 실패 의심" if flat else "")


def show(path: Path):
    """저장한 PNG 를 노트북에 인라인으로 띄운다.

    save() 만 부르면 노트북에는 파일 경로만 남는다. 나중에 노트북을 다시 열었을 때
    차트가 안 보이면 그 기록은 읽을 수 없는 기록이다.
    """
    from IPython.display import Image
    return Image(str(path))
