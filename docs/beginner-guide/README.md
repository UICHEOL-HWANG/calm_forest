# 초보자 안내서 원본

- **게임 안 안내서의 원본은 `guide/guide.html`** 이다(fragment). 문구를 고치면 여기서 고친다. `index.html` 의 `#guide-panel` 이 fetch 로 받아 주입하고, 토스 번들은 `CONFIG.GUIDE_BASE`(웹 오리진)에서 받아온다.
- `guide-source.html` 은 2026-09-07 슬라이드용 HTML(1280×720 고정), `고요한숲_초보자_안내서.pdf` 는 사용자가 확정한 20쪽 PDF, `guide-text.txt` 는 그 PDF 의 텍스트 추출본(`pdftotext -layout`)이다. 셋 다 참고용.
- 스크린샷 원본은 `img/`(1400px). 게임에 들어가는 압축본 `guide/img/` 는 아래로 다시 만든다(1200px · JPEG q62).

```bash
sips -Z 1200 -s format jpeg -s formatOptions 62 docs/beginner-guide/img/X.jpg --out guide/img/X.jpg
```

- 장당 160KB · 총 3MB 제한과 fragment 구조(섹션 20개·상대경로 이미지·lazy)는 `tests/guide.test.mjs` 가 지킨다.
- 설계: `docs/superpowers/specs/2026-09-08-in-game-guide-design.md` · 계획: `docs/superpowers/plans/2026-09-08-in-game-guide.md`
