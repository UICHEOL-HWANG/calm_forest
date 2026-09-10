# 테스터용 안내서 (A4 2쪽)

`베타테스트_안내.pdf` 가 산출물. 금액·문의처를 채우거나 문구를 고치면 `guide.html` 을 편집한 뒤 다시 뽑는다:

```bash
cd docs/beta-tester-guide
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --no-pdf-header-footer --print-to-pdf="$PWD/베타테스트_안내.pdf" "file://$PWD/guide.html"
```

캡처 4장(`g1~g4`)은 로컬 서버를 `?forceVariant=beta_A` 로 열어 Playwright(npx 캐시의 playwright + 설치된 Chrome, 375×812 @2x)로 찍은 것.
게임 UI 가 바뀌면 다시 찍어야 한다. 일반 유저용 `../beginner-guide/` 와는 별개.
