import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from calm_ml import report

STEPS = [
    ("게스트로 입장", 222),
    ("선물 권유 창 봄", 49),
    ("가입 버튼 누름", 12),
    ("로그인 완료", 0),
    ("선물 받음", 0),
]


def main() -> None:
    report.setup()
    labels = [s[0] for s in STEPS][::-1]
    values = [s[1] for s in STEPS][::-1]
    fig, ax = report.new(
        "메타 광고 게스트 222명 중 로그인까지 간 사람은 0명",
        n=222,
        sub="2026-10-28 17:35 ~ 11-11 · 사람 수(GA4 user_pseudo_id) · 앞 단계 대비 비율",
        figsize=(8, 3.8),
    )
    colors = [report.PALETTE[0] if v == 0 else report.PALETTE[1] for v in values]
    ax.barh(labels, values, color=colors)
    prev = [None] + [s[1] for s in STEPS][:-1]
    for i, (lab, v) in enumerate(zip(labels, values)):
        p = prev[::-1][i]
        pct = "" if p in (None, 0) else f"  ({v / p:.0%})"
        ax.text(v + 3, i, f"{v}명{pct}", va="center", fontsize=10)
    ax.set_xlim(0, 260)
    ax.grid(axis="y", visible=False)
    path = report.save(fig, ax, "signup_gift_funnel_meta_20261112", zero_base=False)
    print(report.check(path))


if __name__ == "__main__":
    main()
