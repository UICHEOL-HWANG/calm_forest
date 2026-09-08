# 📖 게임 내 초보자 안내서 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 20쪽 초보자 안내서를 게임 안에서 전체 화면 시트로 읽게 하고, ☰ 메뉴 📖 버튼과 튜토리얼 직후 1회 배너로 연결한다. 모바일·웹 어디서도 게임 HUD 를 침해하지 않는다.

**Architecture:** 안내서는 `/guide/` 아래 정적 fragment(HTML 조각)+CSS+압축 이미지로 두고, `index.html` 의 `#guide-panel` 이 fetch 로 받아 DOM 에 직접 주입한다(iframe 없음). 패널이 열리면 `body.guide-open` 으로 HUD 를 숨기고 keydown 을 capture 단계에서 막는다. 토스 번들은 `CONFIG.GUIDE_BASE`(빌드 때 절대 오리진으로 치환)로 웹 서버에서 받아온다.

**Tech Stack:** 바닐라 HTML/CSS/JS(ES module, `index.html` 인라인), Node 테스트(`node --test`), macOS `sips`(이미지 압축), Cloudflare Workers 정적 자산(`_headers`).

**Spec:** `docs/superpowers/specs/2026-09-08-in-game-guide-design.md`

## Global Constraints

- 새 HUD 요소 금지. 첫 방문 알림은 기존 `#hint-banner`(상단 중앙 컨텍스트 슬롯)만 쓴다.
- iframe 금지(iOS 웹뷰 스크롤·`X-Frame-Options: SAMEORIGIN`). fetch → DOM 주입.
- 토스 번들(`dist-toss`)에 `guide/` 를 넣지 않는다. `scripts/build-ait.mjs` 는 건드리지 않는다.
- 이미지: 1200px 폭 JPEG, 장당 160KB 이하, 총량 3MB 이하.
- 안내서 본문은 한국어만. 패널 크롬(제목·닫기·재시도·배너 문구)만 `js/i18n-en.js` 키 추가.
- 원문 텍스트의 출처는 사용자가 확정한 PDF `~/Downloads/고요한_숲_초보자_안내서_20260907090214.pdf`(표지 + 압축 가이드 2장 + 01~17장 = 20쪽). `docs/beginner-guide/guide-source.html` 은 이미지 배치 참고용이다(문구·장 번호가 PDF 와 다름).
- 커밋 메시지는 저장소 관례(`Feat: 📖 …`, `Fix: …`, `Docs: …`)를 따르고 끝에 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` 를 붙인다.
- `.superpowers/` 와 `dist/`, `dist-toss/` 는 커밋하지 않는다(.gitignore 에 이미 있음).

---

## File Structure

| 파일 | 책임 |
|---|---|
| `guide/guide.html` (신규) | 안내서 본문 fragment. `<section class="gd-sec" id="sec-NN">` 20개. 문서 껍데기·script 없음 |
| `guide/guide.css` (신규) | 본문 스타일. 전부 `.gd` 접두로 패널 안에서만 적용 |
| `guide/img/*.jpg` (신규) | 압축 스크린샷 43장 |
| `tests/guide.test.mjs` (신규) | fragment 구조·이미지 존재·용량 검사 |
| `js/config.js` | `GUIDE_BASE` 추가 |
| `scripts/build-web.mjs` | `INCLUDE` 에 `'guide'` |
| `_headers` | `/guide/*` CORS·캐시 |
| `index.html` | `#guide-panel` DOM·CSS·JS, `guide-open` 숨김, help-btn 교체, `showHintBanner(onTap)`, `endCoach` 알림 |
| `js/game.js` | `gameState.guideNudgeSeen` 기본값·복원·`Input` 접근자 |
| `js/i18n-en.js` | 키 교체·추가 |
| `docs/beginner-guide/README.md` (신규) | "원본은 `guide/`", 이미지 압축 명령 |

---

### Task 1: 안내서 이미지 압축 → `guide/img/`

**Files:**
- Create: `guide/img/*.jpg` (43장)
- Create: `tests/guide.test.mjs` (이미지 검사 부분)

**Interfaces:**
- Produces: `guide/img/<name>.jpg` 43개. Task 2 의 fragment 가 `img/<name>.jpg` 상대경로로 참조한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/guide.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const IMG_DIR = new URL('guide/img/', ROOT);

// Task 2 에서 fragment 가 참조할 이미지 — 여기 없는 파일은 배포되지 않는다
export const GUIDE_IMAGES = [
  '00_title.jpg', '01_charselect.jpg', '02_intro_b.jpg', '14_help.jpg',
  '03_village_start.jpg', '30_mobile_coach.jpg', '12_bag.jpg', '10_bench.jpg', '04_coach.jpg',
  '05_chop.jpg', '05_chop_fall.jpg', '05b_merchant.jpg',
  '06_farm_till.jpg', '06_farm_water.jpg', '06_farm_mature.jpg', '06_farm_harvest.jpg',
  '20_farmfield_plot.jpg', '09_shop_buy.jpg', '09_market.jpg',
  '07_build2.jpg', '07_house_done.jpg', '07_decor.jpg', '29_house6.jpg',
  '08_fish_bite.jpg', '08_fish_catch2.jpg', '11_npc.jpg', '11_owl.jpg',
  '21_mine_dig.jpg', '17_carve_orders.jpg', '16_kitchen_mg.jpg', '17_carve_mid.jpg',
  '22_cafe_serve.jpg', '18_coop_modal.jpg', '19_forest_pick.jpg', '24_glade.jpg',
  '26_sea_fight.jpg', '27_river_run2.jpg', '28_mist_wave2.jpg',
  '23_night.jpg', '25_rain.jpg', '13_dex.jpg', '15_story.jpg', '14_menu.jpg',
];

test('guide/img 에 필요한 이미지가 전부 있다', () => {
  assert.ok(existsSync(IMG_DIR), 'guide/img/ 가 없다');
  for (const name of GUIDE_IMAGES) assert.ok(existsSync(new URL(name, IMG_DIR)), `${name} 없음`);
});

test('이미지 장당 160KB 이하 · 총량 3MB 이하', () => {
  let total = 0;
  for (const name of readdirSync(IMG_DIR)) {
    const size = statSync(new URL(name, IMG_DIR)).size;
    total += size;
    assert.ok(size <= 160 * 1024, `${name} 가 ${Math.round(size / 1024)}KB — 160KB 초과`);
  }
  assert.ok(total <= 3 * 1024 * 1024, `총량 ${Math.round(total / 1024)}KB — 3MB 초과`);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/guide.test.mjs`
Expected: FAIL — `guide/img/ 가 없다`

- [ ] **Step 3: 압축 스크립트 실행**

원본은 `docs/beginner-guide/img/`(1400px, 장당 ~130KB). 1200px 폭·품질 72 로 재압축하고, 160KB 를 넘는 장은 품질 60 으로 한 번 더.

```bash
mkdir -p guide/img
for f in 00_title 01_charselect 02_intro_b 14_help 03_village_start 30_mobile_coach 12_bag 10_bench 04_coach \
         05_chop 05_chop_fall 05b_merchant 06_farm_till 06_farm_water 06_farm_mature 06_farm_harvest \
         20_farmfield_plot 09_shop_buy 09_market 07_build2 07_house_done 07_decor 29_house6 \
         08_fish_bite 08_fish_catch2 11_npc 11_owl 21_mine_dig 17_carve_orders 16_kitchen_mg 17_carve_mid \
         22_cafe_serve 18_coop_modal 19_forest_pick 24_glade 26_sea_fight 27_river_run2 28_mist_wave2 \
         23_night 25_rain 13_dex 15_story 14_menu; do
  sips -Z 1200 -s format jpeg -s formatOptions 72 "docs/beginner-guide/img/$f.jpg" --out "guide/img/$f.jpg" >/dev/null
  if [ "$(stat -f%z "guide/img/$f.jpg")" -gt 163840 ]; then
    sips -Z 1200 -s format jpeg -s formatOptions 60 "docs/beginner-guide/img/$f.jpg" --out "guide/img/$f.jpg" >/dev/null
  fi
done
du -sh guide/img; ls guide/img | wc -l
```

Expected: 43 files, 총량 3MB 이하(대략 2~2.5MB).

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/guide.test.mjs`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add guide/img tests/guide.test.mjs
git commit -m "Feat: 📖 안내서 이미지 43장 압축(1200px·q72) → guide/img + 용량 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: 안내서 fragment `guide/guide.html` + `guide/guide.css`

**Files:**
- Create: `guide/guide.html`, `guide/guide.css`
- Create: `docs/beginner-guide/guide-text.txt` (PDF 텍스트 추출본, 작성 참고용)
- Modify: `tests/guide.test.mjs` (구조 검사 추가)

**Interfaces:**
- Consumes: Task 1 의 `guide/img/*.jpg`
- Produces: fragment 계약 — Task 4 의 패널이 의존한다.
  - 최상위는 `<section class="gd-sec" id="sec-01">` … `id="sec-20"` 20개만. 각 섹션 첫 자식은 `<div class="gd-eyebrow">`, 그다음 `<h2 data-chip="…">`(칩 라벨).
  - `<img class="shot" src="img/…" width height loading="lazy" decoding="async" alt="">` 상대경로만.
  - `sec-01` 안에 `<button class="gd-tut" data-act="tutorial">🌱 튜토리얼 다시 보기</button>`.
  - `<script>`·`<style>`·`<link>` 금지(스타일은 guide.css 로).

- [ ] **Step 1: 실패하는 구조 테스트 추가**

`tests/guide.test.mjs` 끝에 추가:

```js
const HTML = () => readFileSync(new URL('guide/guide.html', ROOT), 'utf8');

test('fragment 에 문서 껍데기·스크립트가 없다', () => {
  const h = HTML();
  assert.doesNotMatch(h, /<(!doctype|html|head|body|script|style|link)\b/i);
});

test('섹션 20개 · id sec-01..sec-20 · 각각 eyebrow + h2[data-chip]', () => {
  const h = HTML();
  const secs = [...h.matchAll(/<section class="gd-sec" id="(sec-\d\d)">/g)].map(m => m[1]);
  assert.equal(secs.length, 20);
  secs.forEach((id, i) => assert.equal(id, `sec-${String(i + 1).padStart(2, '0')}`));
  const chips = [...h.matchAll(/<h2 data-chip="([^"]+)">/g)];
  assert.equal(chips.length, 20, 'h2[data-chip] 가 20개여야 한다');
  assert.equal((h.match(/class="gd-eyebrow"/g) || []).length, 20);
});

test('img 는 상대경로 · 존재 · lazy · width/height', () => {
  const h = HTML();
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map(m => m[0]);
  assert.ok(imgs.length >= 40, `img 가 ${imgs.length}개 — 40개 이상이어야`);
  for (const tag of imgs) {
    const src = /src="([^"]+)"/.exec(tag)?.[1];
    assert.ok(src && src.startsWith('img/'), `상대경로가 아님: ${tag}`);
    assert.ok(existsSync(new URL(src, new URL('guide/', ROOT))), `${src} 파일 없음`);
    assert.match(tag, /loading="lazy"/, `lazy 아님: ${tag}`);
    assert.match(tag, /width="\d+"/, `width 없음: ${tag}`);
    assert.match(tag, /height="\d+"/, `height 없음: ${tag}`);
  }
});

test('첫 섹션에 튜토리얼 다시 보기 버튼', () => {
  const first = HTML().split('<section class="gd-sec" id="sec-02">')[0];
  assert.match(first, /<button class="gd-tut" data-act="tutorial">/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/guide.test.mjs`
Expected: 새 테스트 4개 FAIL — `ENOENT guide/guide.html`

- [ ] **Step 3: PDF 텍스트 추출 (작성 참고본)**

```bash
cp "$HOME/Downloads/고요한_숲_초보자_안내서_20260907090214.pdf" "docs/beginner-guide/고요한숲_초보자_안내서.pdf"
pdftotext -layout "docs/beginner-guide/고요한숲_초보자_안내서.pdf" docs/beginner-guide/guide-text.txt
grep -n -E "^\s*(압축 가이드|[0-9][0-9] ·|CALM FOREST)" docs/beginner-guide/guide-text.txt
```

Expected: 20개 머리말이 순서대로 — `CALM FOREST`, `압축 가이드 1`, `압축 가이드 2`, `01 ·` … `17 ·`. (docs 폴더의 기존 PDF 는 이전 내보내기라 덮어쓴다 — 사용자가 확정한 것은 Downloads 의 최신본.)

- [ ] **Step 4: `guide/guide.css` 작성**

```css
/* 📖 초보자 안내서 본문 — 전부 .gd 접두. index.html 의 #guide-panel 안에서만 쓰인다 */
.gd { font: 15px/1.6 -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; color: #1e2a24;
  max-width: 920px; margin: 0 auto; padding: 4px 16px 56px; -webkit-text-size-adjust: 100%; }
.gd * { box-sizing: border-box; }
.gd-sec { padding: 22px 0 26px; border-bottom: 1px solid #d9ded3; scroll-margin-top: 8px; }
.gd-sec:last-child { border-bottom: none; }
.gd-eyebrow { font-size: 12px; letter-spacing: .1em; font-weight: 700; color: #2f6b4a; margin-bottom: 4px; }
.gd h2 { font-size: 22px; line-height: 1.25; margin: 0 0 8px; font-weight: 800; color: #1f4a33; letter-spacing: -.01em; }
.gd h3 { font-size: 16px; margin: 14px 0 6px; font-weight: 800; color: #1f4a33; }
.gd p { margin: 0 0 10px; }
.gd .lead { color: #4a5a50; margin-bottom: 12px; }
.gd .cols { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 720px) { .gd .cols { grid-template-columns: 1fr 1fr; align-items: start; } }
.gd .shot { width: 100%; height: auto; border-radius: 10px; border: 1px solid #d9ded3; display: block; background: #000; }
.gd .cap { font-size: 12.5px; color: #4a5a50; margin: 6px 0 12px; line-height: 1.4; }
.gd .steps { list-style: none; margin: 0 0 12px; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.gd .steps li { display: grid; grid-template-columns: 26px 1fr; gap: 10px; align-items: start; }
.gd .steps .n { width: 24px; height: 24px; border-radius: 50%; background: #2f6b4a; color: #fff; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
.gd .list { margin: 0 0 12px; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.gd .list li::marker { color: #2f6b4a; }
.gd .tip { background: #e6f4ea; border-left: 4px solid #2f6b4a; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 12px 0; font-size: 14.5px; }
.gd .tip b { color: #1f4a33; }
.gd .warn { background: #fbebdd; border-left: 4px solid #b5541c; padding: 10px 14px; border-radius: 0 8px 8px 0; margin: 12px 0; font-size: 14.5px; }
.gd .warn b { color: #b5541c; }
.gd .kbd { display: inline-block; border: 1px solid #b9c2b8; border-bottom-width: 2px; border-radius: 6px; padding: 0 7px; font-size: 13px; font-weight: 700; background: #fff; color: #1f4a33; line-height: 1.5; }
.gd .cards { display: grid; grid-template-columns: 1fr; gap: 10px; margin: 0 0 12px; }
@media (min-width: 720px) { .gd .cards { grid-template-columns: repeat(3, 1fr); } .gd .cards.two { grid-template-columns: 1fr 1fr; } }
.gd .card { background: #fff; border: 1px solid #d9ded3; border-radius: 12px; padding: 12px 14px; }
.gd .card h3 { margin: 0 0 4px; font-size: 15px; }
.gd .card p { margin: 0; font-size: 14px; color: #4a5a50; }
.gd .tbl { overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 0 0 12px; }
.gd table { border-collapse: collapse; width: 100%; min-width: 480px; font-size: 14px; }
.gd th, .gd td { padding: 7px 9px; text-align: left; border-bottom: 1px solid #d9ded3; vertical-align: top; line-height: 1.4; }
.gd th { font-size: 12.5px; color: #1f4a33; letter-spacing: .04em; font-weight: 800; background: #e6f4ea; }
.gd .check { list-style: none; margin: 0 0 12px; padding: 0; display: grid; grid-template-columns: 1fr; gap: 6px; }
@media (min-width: 720px) { .gd .check { grid-template-columns: 1fr 1fr; } }
.gd .check li::before { content: "☐ "; color: #2f6b4a; }
.gd-tut { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 14px; padding: 9px 16px; border: none; border-radius: 12px;
  background: #2f6b4a; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer; }
.gd-tut:active { transform: scale(.97); }
```

- [ ] **Step 5: `guide/guide.html` 작성 — 섹션 골격과 이미지 배치**

PDF 20쪽 → 섹션 20개. 표는 다음과 같이 고정한다(id · eyebrow · `data-chip` · 이미지). 본문 텍스트는 `docs/beginner-guide/guide-text.txt` 의 해당 쪽을 **그대로** 옮기되, 슬라이드 줄바꿈은 한 문장으로 잇고, 각 쪽의 팁(연두 박스)은 `.tip`, 주의(살구 박스)는 `.warn`, 번호 단계는 `.steps`, 키 표시는 `<span class="kbd">Space</span>` 로 감싼다. 이미지는 PDF 쪽에 실린 캡션을 `.cap` 으로 붙인다.

| id | eyebrow | data-chip | 이미지(guide/img) |
|---|---|---|---|
| sec-01 | CALM FOREST · 초보자 안내서 | 시작 | 00_title |
| sec-02 | 압축 가이드 1 · 처음 30분 | 처음 30분 | (없음, 카드 6개 `.cards`) |
| sec-03 | 압축 가이드 2 · 조작법 | 조작법 | 30_mobile_coach |
| sec-04 | 01 · 게임 시작하기 | 시작하기 | 00_title, 01_charselect, 02_intro_b, 14_help |
| sec-05 | 02 · 화면 읽는 법 | 화면 읽기 | 03_village_start |
| sec-06 | 03 · 도구 세트 | 도구 세트 | 12_bag, 10_bench |
| sec-07 | 04 · 튜토리얼 코치 | 튜토리얼 | 04_coach |
| sec-08 | 05 · 첫 10분 | 첫 10분 | 05_chop, 05_chop_fall, 05b_merchant |
| sec-09 | 06 · 농사 | 농사 | 06_farm_till, 06_farm_water, 06_farm_mature, 06_farm_harvest |
| sec-10 | 07 · 내 텃밭 · 상점 · 시세 | 텃밭·상점 | 20_farmfield_plot, 09_shop_buy, 09_market |
| sec-11 | 08 · 내 집 짓기 | 집 짓기 | 07_build2, 07_house_done, 07_decor, 29_house6 |
| sec-12 | 09 · 호수 낚시 | 낚시 | 08_fish_bite, 08_fish_catch2 |
| sec-13 | 10 · 이웃과 퀘스트 | 퀘스트 | 11_npc, 11_owl |
| sec-14 | 11 · 채굴 동굴 · 작업대 · 자유주방 · 조각 | 동굴·요리 | 21_mine_dig, 17_carve_orders, 16_kitchen_mg, 17_carve_mid |
| sec-15 | 12 · 마을 남쪽의 네 곳 | 남쪽 | 22_cafe_serve, 18_coop_modal, 19_forest_pick, 24_glade |
| sec-16 | 13 · 먼 곳 모험 | 모험 | 26_sea_fight, 27_river_run2, 28_mist_wave2 |
| sec-17 | 14 · 낮과 밤 · 날씨 · 밤손님 | 밤·날씨 | 23_night, 25_rain |
| sec-18 | 15 · 도감 · 배지 · 나의 이야기 | 도감 | 13_dex, 15_story |
| sec-19 | 16 · 저장 · 계정 · 자주 묻는 질문 | FAQ | 14_menu |
| sec-20 | 17 · 첫날 체크리스트 | 체크리스트 | 08_fish_catch2, 22_cafe_serve |

이미지 `width`/`height` 는 압축 결과의 실제 픽셀을 넣는다(`sips -g pixelWidth -g pixelHeight guide/img/X.jpg`). 가로 스크린샷은 1200×675 근처, 폰 세로(30_mobile_coach)는 555×1200 근처.

앞 두 섹션은 아래를 그대로 쓴다(패턴 예시이자 완성본). 나머지 18개는 같은 패턴으로 PDF 텍스트를 옮긴다.

```html
<section class="gd-sec" id="sec-01">
  <div class="gd-eyebrow">CALM FOREST · 초보자 안내서</div>
  <h2 data-chip="시작">고요한 숲, 처음 오신 분을 위한 안내</h2>
  <p class="lead">나무를 베고, 밭을 가꾸고, 낚시를 하고, 내 집을 짓는 포근한 숲 마을. 처음 30분을 실제 플레이 화면과 함께 짚어드려요.</p>
  <button class="gd-tut" data-act="tutorial">🌱 튜토리얼 다시 보기</button>
  <img class="shot" src="img/00_title.jpg" width="1200" height="675" loading="lazy" decoding="async" alt="">
  <p class="cap">첫 화면 · PC 브라우저 · 스마트폰 모두 가능 · 2026년 9월 기준</p>
</section>

<section class="gd-sec" id="sec-02">
  <div class="gd-eyebrow">압축 가이드 1 · 처음 30분</div>
  <h2 data-chip="처음 30분">이 여섯 가지만 하면, 기본은 다 배운 거예요</h2>
  <p class="lead">순서대로 따라가면 코인·밭·집·낚시가 한 번에 열려요. 뒤 장들은 이 여섯 걸음을 자세히 풀어 쓴 거예요.</p>
  <div class="cards">
    <div class="card"><h3>1 🪓 나무 세 그루 베기</h3><p>야외도구 세트에서 도끼를 들고 <span class="kbd">Space</span> 3번. 한 그루에 목재 +5.</p></div>
    <div class="card"><h3>2 🧙 찾아온 상인에게 팔기</h3><p>목재 5개가 모이면 상인이 직접 와요. 평소 3배인 +30🪙, 딱 한 번뿐이에요.</p></div>
    <div class="card"><h3>3 🌰 밭 한 칸 수확까지</h3><p>괭이로 갈고 → 씨앗 심고 → 물 3번 → 낫으로 수확.</p></div>
    <div class="card"><h3>4 🎣 호수에서 한 마리</h3><p>부두에서 던지고, "물었어요!" 뜨면 1.4초 안에 다시 <span class="kbd">Space</span>.</p></div>
    <div class="card"><h3>5 🔨 집 짓고 들어가기</h3><p>망치로 원 안에서 세 번. 목재 30개면 지붕까지 올라가요.</p></div>
    <div class="card"><h3>6 🎨 가구 하나 놓기</h3><p>가구값은 코인이 아니라 작물이에요. 러그는 작물 2개.</p></div>
  </div>
  <div class="tip"><b>급할 게 없어요.</b> 시작 코인은 0이라 제일 먼저 벌목을 하는 게 가장 빠르고, 나머지는 마음 가는 순서대로 해도 괜찮아요. 저장은 30초마다 저절로 돼요.</div>
</section>
```

이미지가 있는 섹션의 기본 골격(sec-04 예):

```html
<section class="gd-sec" id="sec-04">
  <div class="gd-eyebrow">01 · 게임 시작하기</div>
  <h2 data-chip="시작하기">주소를 열고 동물 친구를 골라요</h2>
  <div class="cols">
    <div>
      <p class="lead">크롬 브라우저를 권장해요. 폰에서는 세로로 들고 하시면 편해요.</p>
      <ol class="steps">
        <li><span class="n">1</span><span><b>calmforest.cloud</b> 접속. 구글 로그인 또는 게스트로 둘러보기를 고르세요.</span></li>
        <li><span class="n">2</span><span>캐릭터는 여우·강아지·토끼·고양이·곰·판다·병아리 7종. 이름은 2~16자, 🎲로 랜덤도 돼요.</span></li>
        <li><span class="n">3</span><span>프롤로그가 짧게 흘러요. 오른쪽 위 <b>건너뛰기 ›</b>로 넘길 수 있어요.</span></li>
        <li><span class="n">4</span><span>마을에 도착하면 <b>튜토리얼 시작 🌱</b>을 눌러 하나씩 배워요.</span></li>
      </ol>
      <div class="warn"><b>게스트는 저장이 이어지지 않아요.</b> 다음에 오면 새 마을이에요. 오래 할 생각이면 처음부터 구글 로그인을 추천해요. 캐릭터는 나중에 ☰ 메뉴에서 바꿔도 집·밭·도감은 그대로예요.</div>
    </div>
    <div>
      <img class="shot" src="img/00_title.jpg" width="1200" height="675" loading="lazy" decoding="async" alt=""><p class="cap">첫 화면 - 구글 로그인 / 게스트로 둘러보기</p>
      <img class="shot" src="img/01_charselect.jpg" width="1200" height="675" loading="lazy" decoding="async" alt=""><p class="cap">캐릭터 7종과 닉네임 입력</p>
      <img class="shot" src="img/02_intro_b.jpg" width="1200" height="675" loading="lazy" decoding="async" alt=""><p class="cap">프롤로그 컷신 - 건너뛰기 가능</p>
      <img class="shot" src="img/14_help.jpg" width="1200" height="675" loading="lazy" decoding="async" alt=""><p class="cap">환영 안내 - 튜토리얼 시작</p>
    </div>
  </div>
</section>
```

도구 세트 표(sec-06)는 `<div class="tbl"><table>…</table></div>` 로, 체크리스트(sec-20)는 `<ul class="check">` 로, FAQ(sec-19)는 `<div class="tbl"><table>` 2열(질문 | 답)로 옮긴다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `node --test tests/guide.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 7: 브라우저에서 fragment 만 미리 보기(레이아웃 점검)**

저장소 안에 미리보기 파일을 만들지 **말고**, 스크래치패드에 래퍼를 만든다:

```bash
S=/private/tmp/claude-501/-Users-uicheol-hwang-calm-forest/a4939d9b-f0ac-4f43-8681-39dc5cef391f/scratchpad
mkdir -p $S/gprev && cp -R guide/. $S/gprev/
printf '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="guide.css"><div class="gd">' > $S/gprev/index.html
cat guide/guide.html >> $S/gprev/index.html; printf '</div>' >> $S/gprev/index.html
(cd $S/gprev && python3 -m http.server 8765 >/dev/null 2>&1 &)
```

`mcp__Claude_Browser__preview_start {url:"http://localhost:8765/"}` 로 연다. 확인: `resize_window mobile` 에서 한 열·표는 가로 스크롤·이미지 폭 100%. `desktop` 에서 두 열. 스크린샷 1장씩 저장. 끝나면 `pkill -f "http.server 8765"`.

- [ ] **Step 8: Commit**

```bash
git add guide/guide.html guide/guide.css tests/guide.test.mjs docs/beginner-guide/guide-text.txt "docs/beginner-guide/고요한숲_초보자_안내서.pdf"
git commit -m "Feat: 📖 안내서 fragment(20장·반응형) + guide.css — PDF 원문 이식, 구조 테스트

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: 배포 배선 — `build-web` 복사 · `_headers` · `CONFIG.GUIDE_BASE`

**Files:**
- Modify: `scripts/build-web.mjs` (INCLUDE 배열, `'beta'` 줄 아래)
- Modify: `_headers` (끝에 추가)
- Modify: `js/config.js` (`CONFIG` 객체 `API_BASE,` 줄 아래)

**Interfaces:**
- Produces: `CONFIG.GUIDE_BASE` — 웹 `'/guide/'`, 토스 빌드 후 `'https://calmforest.cloud/guide/'`. Task 4 가 `new URL(rel, new URL(CONFIG.GUIDE_BASE, location.href))` 로 쓴다.

- [ ] **Step 1: `scripts/build-web.mjs` INCLUDE 에 추가**

`'beta',            // 🧪 베타 일지 페이지(/beta/diary.html) — 대시보드와 분리` 줄 바로 아래:

```js
  'guide',           // 📖 초보자 안내서(fragment+이미지) — index.html 의 #guide-panel 이 fetch 로 주입
```

- [ ] **Step 2: `_headers` 끝에 추가**

```
# 📖 안내서 — 토스 번들(다른 오리진)이 fetch 로 받아가므로 CORS 허용. 내용이 자주 안 바뀌어 1시간 캐시.
/guide/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=3600
```

- [ ] **Step 3: `js/config.js` 에 `GUIDE_BASE`**

`  API_BASE,                     // 하드코딩된 fetch 호출부(도감·의뢰·리더보드)가 참조` 줄 바로 아래:

```js
  GUIDE_BASE: `${API_BASE}/guide/`,   // 📖 초보자 안내서 정적 파일 — 토스 번들은 API_BASE 치환으로 웹 오리진에서 받아온다
```

- [ ] **Step 4: 두 빌드 결과 확인**

```bash
node scripts/build-web.mjs && ls dist/guide | head -3 && ls dist/guide/img | wc -l
node scripts/build-ait.mjs && test ! -e dist-toss/guide && echo "toss: guide 없음 OK" && grep -n "GUIDE_BASE\|API_BASE = " dist-toss/js/config.js
```

Expected: `dist/guide/guide.css guide.html img`, `43`, `toss: guide 없음 OK`, 그리고 `API_BASE = 'https://calmforest.cloud'` 와 `GUIDE_BASE: \`${API_BASE}/guide/\`` 두 줄.

- [ ] **Step 5: 기존 테스트 전체 통과**

Run: `npm test`
Expected: PASS(기존 + guide)

- [ ] **Step 6: Commit**

```bash
git add scripts/build-web.mjs _headers js/config.js
git commit -m "Feat: 📖 guide/ 배포 배선 — build-web 복사·/guide/* CORS·CONFIG.GUIDE_BASE(토스는 웹 오리진)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: `#guide-panel` 오버레이 + ☰ 메뉴 입구

**Files:**
- Modify: `index.html`
  - CSS: `#feedback-modal.show { display: grid; }`(약 295줄) 아래
  - DOM: `<!-- NPC 대화/퀘스트 모달 -->` 주석 바로 위(= `#feedback-modal` 닫힌 직후)
  - JS: `$('feedback-tab').addEventListener('click', openFb);` 아래
  - help-btn: 987줄 버튼, 2318줄 핸들러
- Modify: `js/i18n-en.js` (`'도움말': 'Help',` 줄)

**Interfaces:**
- Consumes: `CONFIG.GUIDE_BASE`(Task 3), fragment 계약(Task 2), 기존 `$`, `trackEvent`, `ui.showTutorial(src)`.
- Produces: `openGuide(src: 'menu'|'nudge')`, `closeGuide()` — 모듈 스코프 함수. Task 5 의 배너가 `openGuide('nudge')` 를 호출한다.

- [ ] **Step 1: CSS 추가** (`#feedback-modal.show { display: grid; }` 아래)

```css
  /* 📖 초보자 안내서 — 전체 화면 시트. 문의 모달(30) 위, 미니게임(40) 아래. 상단은 토스 예약 포함 인셋을 그대로 둔다 */
  #guide-panel { position: fixed; inset: 0; z-index: 35; display: none; flex-direction: column; background: #fbf8ef; color: #1e2a24;
    padding-top: var(--top-inset); }
  #guide-panel.show { display: flex; }
  #guide-panel .gp-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #dff2e3; border-bottom: 1px solid #c4dfcb;
    font-weight: 700; font-size: 15px; flex: none; }
  #guide-close { margin-left: auto; width: 34px; height: 34px; border-radius: 50%; border: none; background: #fff; color: #1f4a33; font-size: 16px; cursor: pointer; box-shadow: var(--shadow); }
  #guide-close:active { transform: scale(.94); }
  #guide-chips { display: flex; gap: 6px; padding: 8px 12px; overflow-x: auto; white-space: nowrap; background: #f1ebdc; flex: none;
    scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  #guide-chips::-webkit-scrollbar { display: none; }
  #guide-chips button { flex: none; font-size: 12px; padding: 4px 10px; border-radius: 999px; background: #fff; border: 1px solid #d9d0bb; color: #5a6b5d; cursor: pointer; }
  #guide-chips button.on { background: #2f5b3f; color: #fff; border-color: #2f5b3f; }
  #guide-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding-bottom: env(safe-area-inset-bottom); }
  .gp-skel { max-width: 920px; margin: 24px auto; padding: 0 16px; }
  .gp-skel i { display: block; height: 14px; border-radius: 7px; background: #e6e1d3; margin-bottom: 12px; animation: gpPulse 1.2s ease-in-out infinite; }
  .gp-skel i:nth-child(2) { width: 70%; } .gp-skel i:nth-child(3) { width: 85%; }
  @keyframes gpPulse { 50% { opacity: .45; } }
  .gp-err { text-align: center; padding: 48px 16px; color: #4a5a50; }
  .gp-err button { margin-top: 10px; padding: 8px 18px; border: none; border-radius: 10px; background: #2f6b4a; color: #fff; font-weight: 700; cursor: pointer; }
  /* 패널이 떠 있는 동안 게임 HUD 전부 숨김 — 미니게임(mg-open)과 같은 방식, 터치가 조이스틱에 닿을 수 없다 */
  body.guide-open #mobile-controls, body.guide-open #talk-btn, body.guide-open #hotbar, body.guide-open #minimap,
  body.guide-open #dex-tab, body.guide-open #feedback-tab, body.guide-open #quest-panel, body.guide-open #hint,
  body.guide-open #hint-banner, body.guide-open #coach, body.guide-open #door-prompt, body.guide-open #npc-prompt,
  body.guide-open #zone-prompt, body.guide-open #buffs, body.guide-open #topleft, body.guide-open #topright { display: none !important; }
```

- [ ] **Step 2: DOM 추가** (`<!-- NPC 대화/퀘스트 모달 -->` 바로 위)

```html
  <!-- 📖 초보자 안내서 패널 — 본문은 /guide/guide.html 을 fetch 해 #guide-body 에 주입 -->
  <div id="guide-panel" aria-hidden="true">
    <div class="gp-head"><span>📖 초보자 안내서</span><button id="guide-close" aria-label="닫기">✕</button></div>
    <nav id="guide-chips"></nav>
    <div id="guide-body"></div>
  </div>
```

- [ ] **Step 3: help-btn 교체** (987줄)

```html
      <button id="help-btn"><span class="uico">📖</span><span class="ulbl">초보자 안내서</span></button>
```

- [ ] **Step 4: JS 추가** (`$('feedback-tab').addEventListener('click', openFb);` 아래)

```js
    // ── 📖 초보자 안내서 패널 ──────────────────────────────────────
    //  · fragment(guide/guide.html)를 fetch 해 DOM 에 직접 주입(iframe 금지: iOS 웹뷰 스크롤·X-Frame-Options)
    //  · 열리면 body.guide-open 으로 HUD 숨김 + keydown capture 로 게임 입력 차단(Esc 만 닫기)
    //  · 토스 번들은 CONFIG.GUIDE_BASE 가 웹 오리진 절대 URL 이라 같은 코드로 동작
    const guidePanel = $('guide-panel'), guideBody = $('guide-body'), guideChips = $('guide-chips');
    let guideLoaded = false, guideOpenedAt = 0, guideCurSec = '', guideScrollY = 0, guideSecTimer = null, guideCssLinked = false;
    const guideAbs = (rel) => new URL(rel, new URL(CONFIG.GUIDE_BASE, location.href)).href;
    function buildGuideChips(root) {
      guideChips.innerHTML = '';
      const secs = [...root.querySelectorAll('section.gd-sec')];
      for (const sec of secs) {
        const h2 = sec.querySelector('h2');
        const b = document.createElement('button');
        b.textContent = h2?.dataset.chip || h2?.textContent || sec.id;
        b.dataset.sec = sec.id;
        b.addEventListener('click', () => { sec.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
        guideChips.appendChild(b);
      }
      const io = new IntersectionObserver((entries) => {
        const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!hit) return;
        const id = hit.target.id;
        if (id === guideCurSec) return;
        guideCurSec = id;
        for (const b of guideChips.children) b.classList.toggle('on', b.dataset.sec === id);
        guideChips.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
        clearTimeout(guideSecTimer);
        guideSecTimer = setTimeout(() => trackEvent('guide_section', { id }), 800);   // 스크롤 훑기 중엔 안 쏨
      }, { root: guideBody, rootMargin: '-8% 0px -80% 0px', threshold: 0 });
      secs.forEach(s => io.observe(s));
    }
    async function loadGuide() {
      guideBody.innerHTML = '<div class="gp-skel"><i></i><i></i><i></i></div>';
      try {
        if (!guideCssLinked) {   // 본문 스타일은 fragment 와 같은 곳에서 — 토스에서도 웹 오리진
          const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = guideAbs('guide.css');
          document.head.appendChild(l); guideCssLinked = true;
        }
        const res = await fetch(guideAbs('guide.html'));
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const wrap = document.createElement('div'); wrap.className = 'gd'; wrap.innerHTML = await res.text();
        wrap.querySelectorAll('img[src]').forEach(img => { img.src = guideAbs(img.getAttribute('src')); });
        guideBody.replaceChildren(wrap);
        buildGuideChips(wrap);
        guideLoaded = true;
      } catch (err) {
        console.warn('[guide] 안내서 불러오기 실패:', err?.message || err);
        guideBody.innerHTML = '<div class="gp-err"><p>안내서를 불러오지 못했어요.</p><button id="guide-retry">다시 시도</button></div>';
        $('guide-retry').addEventListener('click', loadGuide);
      }
    }
    function openGuide(src) {
      if (guidePanel.classList.contains('show')) return;
      $('topleft').classList.remove('open');
      guidePanel.classList.add('show'); guidePanel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('guide-open');
      guideOpenedAt = Date.now();
      if (!guideLoaded) loadGuide(); else guideBody.scrollTop = guideScrollY;   // 세션 안에서는 읽던 자리로
      trackEvent('guide_open', { src });
    }
    function closeGuide() {
      if (!guidePanel.classList.contains('show')) return;
      guideScrollY = guideBody.scrollTop;
      guidePanel.classList.remove('show'); guidePanel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('guide-open');
      trackEvent('guide_close', { sec: guideCurSec, dur: Date.now() - guideOpenedAt });
    }
    $('guide-close').addEventListener('click', closeGuide);
    guideBody.addEventListener('click', (e) => {   // 안내서 첫 장 "튜토리얼 다시 보기" — 패널 닫고 환영 모달
      if (!e.target.closest('[data-act="tutorial"]')) return;
      closeGuide(); ui.showTutorial('help');
    });
    window.addEventListener('keydown', (e) => {   // 패널이 떠 있으면 어떤 키도 게임으로 안 간다(스크롤 등 브라우저 기본은 허용)
      if (!guidePanel.classList.contains('show')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeGuide(); }
      e.stopPropagation();
    }, true);
```

- [ ] **Step 5: help-btn 핸들러 교체** (2318줄)

```js
    $('help-btn').addEventListener('click', () => openGuide('menu'));   // 📖 초보자 안내서(튜토리얼 다시 보기는 안내서 첫 장 버튼)
```

- [ ] **Step 6: i18n 키** (`js/i18n-en.js` 의 `'도움말': 'Help',` 를 교체하고 아래 키를 그 자리에)

```js
  '초보자 안내서': "Beginner's Guide",
  '📖 초보자 안내서': "📖 Beginner's Guide",
  '닫기': 'Close',
  '안내서를 불러오지 못했어요.': "Couldn't load the guide.",
  '다시 시도': 'Retry',
```

Run: `node scripts/i18n_check.mjs`
Expected: 경고 없이 종료(스크립트가 미번역 키를 보고하면 위 키를 보완).

- [ ] **Step 7: 브라우저 검증 (PC)**

`mcp__Claude_Browser__preview_start {name:"calm-forest"}` → 게스트로 둘러보기 → 프롤로그 건너뛰기 → 환영 모달 "건너뛰고 바로 시작".

1. ☰ → 📖 초보자 안내서 클릭 → 패널이 전체 화면으로 뜨고 스켈레톤 → 본문. `read_console_messages onlyErrors` 에 에러 없음. `read_network_requests urlPattern:"guide"` 에 `guide.html`·`guide.css` 200.
2. 칩 "농사" 클릭 → 해당 섹션으로 스크롤, 칩 `.on` 이동.
3. 열기 전에 `javascript_tool` 로 미니맵 플레이어 점의 `style.left/top` 을 기록. 패널 열고 `computer key "Space"` 3번, `"w"` 1초 → `document.body.classList.contains('guide-open')` true. 패널 닫은 뒤 같은 값 비교 → 변화 없음.
4. `Escape` → 닫힘, HUD 복귀. 다시 열면 아까 스크롤 위치.
5. 스크린샷 2장(열림·닫힘) 저장 → `SendUserFile`.

- [ ] **Step 8: 브라우저 검증 (폰 세로)**

`resize_window {preset:"mobile"}` → 새로고침 → 같은 흐름. 확인: 조이스틱·행동 버튼·도구바가 `display:none`(`javascript_tool`: `getComputedStyle(document.getElementById('mobile-controls')).display === 'none'`), 본문 한 열, 표는 가로 스크롤, ✕ 가 화면 위 잘리지 않음. 본문 끝까지 `scroll` 해도 뒤 캔버스가 안 움직임. 스크린샷 1장. 끝나면 `resize_window {preset:"desktop"}`.

- [ ] **Step 9: 토스 상단 예약 검증**

`javascript_tool`: `document.body.classList.add('platform-toss')` 후 패널 열기 → ✕ 가 위에서 52px 아래에 있음(`document.getElementById('guide-close').getBoundingClientRect().top >= 52`). 확인 후 클래스 제거.

- [ ] **Step 10: Commit**

```bash
git add index.html js/i18n-en.js
git commit -m "Feat: 📖 게임 내 초보자 안내서 패널 — 전체 화면 시트·HUD 숨김·키 차단·☰ 메뉴 입구(❓도움말 교체)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: 첫 방문 알림 — `showHintBanner(onTap)` + `endCoach` + 저장 플래그

**Files:**
- Modify: `js/game.js` — `tutorialSeen: false,` 줄(655) 아래 · `needsTutorial()`(1380) 옆 · `applySave` 의 `saved.tutorialSeen` 줄(1639) 아래
- Modify: `index.html` — `#hint-banner` CSS(395줄 블록), `nextHintBanner()`, `ui.showHintBanner`, `endCoach`
- Modify: `js/i18n-en.js`

**Interfaces:**
- Consumes: `openGuide('nudge')`(Task 4)
- Produces: `Input.guideNudgeSeen(): boolean`, `Input.markGuideNudgeSeen(): void`, `ui.showHintBanner({ …, onTap?: () => void })`

- [ ] **Step 1: `js/game.js` 저장 플래그**

`  tutorialSeen: false,                      // 신규 유저 튜토리얼 표시 여부` 아래:

```js
  guideNudgeSeen: false,                    // 📖 튜토리얼 직후 "안내서 있어요" 배너를 이미 보여줬는지(1회)
```

`  needsTutorial() { return !gameState.tutorialSeen; },` 아래:

```js
  guideNudgeSeen() { return !!gameState.guideNudgeSeen; },
  markGuideNudgeSeen() { gameState.guideNudgeSeen = true; },
```

`  if (saved.tutorialSeen) gameState.tutorialSeen = true;                 // 튜토리얼 이미 봄` 아래:

```js
  if (saved.guideNudgeSeen) gameState.guideNudgeSeen = true;             // 📖 안내서 배너 이미 봄
```

- [ ] **Step 2: `#hint-banner` 탭 가능 상태 CSS** (`#hint-banner.show { opacity: 1; }` 아래)

```css
  #hint-banner.tap { pointer-events: auto; cursor: pointer; }   /* onTap 배너만 입력을 받는다 */
```

- [ ] **Step 3: `nextHintBanner()` 에 onTap**

`const el = $('hint-banner'); el.classList.toggle('attn', !!item.attention); el.classList.add('show');` 를 다음으로 교체:

```js
      const el = $('hint-banner'); el.classList.toggle('attn', !!item.attention); el.classList.add('show');
      el.classList.toggle('tap', !!item.onTap);
```

`const done = () => { clearTimeout(timer); clearInterval(watch); el.classList.remove('show'); setTimeout(nextHintBanner, 250); };` 를 다음으로 교체:

```js
      const done = () => { clearTimeout(timer); clearInterval(watch); el.onclick = null; el.classList.remove('show', 'tap'); setTimeout(nextHintBanner, 250); };
      el.onclick = item.onTap ? () => { const f = item.onTap; done(); f(); } : null;   // 한 번 탭하면 배너를 걷고 실행
```

`ui.showHintBanner` 한 줄을 교체:

```js
      showHintBanner({ ico, title, line, near, attention, onTap }) { hintBQ.push({ ico, title, line, near, attention, onTap }); if (!hintBShowing) nextHintBanner(); },
```

- [ ] **Step 4: `endCoach` 끝에 알림**

`      else trackEvent('tutorial_skip', { at });   // [①] 중간 이탈(어느 단계에서)` 아래(함수 닫는 `}` 앞):

```js
      // 📖 튜토리얼을 마치거나 건너뛴 직후 한 번만: 안내서가 있다는 걸 상단 컨텍스트 슬롯으로 알린다(졸업 토스트 뒤 3초)
      if (!Input.guideNudgeSeen()) {
        Input.markGuideNudgeSeen();
        setTimeout(() => ui.showHintBanner({
          ico: '📖', title: '초보자 안내서가 있어요', line: '눌러서 열기 · ☰ 메뉴 → 📖 에서 언제든',
          near: () => true, attention: true, onTap: () => openGuide('nudge'),
        }), 3000);
      }
```

- [ ] **Step 5: i18n 키 추가** (`js/i18n-en.js`, Task 4 키 아래)

```js
  '초보자 안내서가 있어요': "There's a beginner's guide",
  '눌러서 열기 · ☰ 메뉴 → 📖 에서 언제든': 'Tap to open · anytime via ☰ → 📖',
```

- [ ] **Step 6: 브라우저 검증 — 새 게스트**

새로고침(게스트는 매번 새 마을) → 프롤로그 건너뛰기 → 환영 모달 "건너뛰고 바로 시작" → 3초 뒤 상단 중앙에 📖 배너(`find "초보자 안내서가 있어요"`). 배너 클릭 → 패널 열림(`javascript_tool`: `document.body.classList.contains('guide-open')` true). 닫기. 스크린샷(배너 상태) 1장.
"튜토리얼 시작" 경로도 한 번: 코치 "건너뛰기" 클릭 → 같은 배너.
폰 세로(`resize_window mobile`)에서 배너가 코치 카드 자리(상단 중앙)에 뜨고 HUD 와 안 겹치는지 스크린샷 1장. `desktop` 복귀.

- [ ] **Step 7: 1회성 확인**

같은 게스트 세션에서 패널을 닫고 ☰ → 📖 를 두 번 열어도 배너가 다시 안 뜨는 것(`Input.guideNudgeSeen()` 이 true)만 확인. 기존 세이브(Supabase)는 직접 못 바꾸므로 코드 경로(`applySave` 복원)로 갈음.

- [ ] **Step 8: 테스트·커밋**

Run: `npm test` → PASS.

```bash
git add js/game.js index.html js/i18n-en.js
git commit -m "Feat: 📖 튜토리얼 직후 1회 안내서 배너 — hint-banner onTap·guideNudgeSeen 저장

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: 마무리 — README · 전체 검증 · 메모리

**Files:**
- Create: `docs/beginner-guide/README.md`
- Modify: `/Users/uicheol_hwang/.claude/projects/-Users-uicheol-hwang-calm-forest/memory/` — 새 메모리 `in-game-guide.md` + `MEMORY.md` 한 줄

- [ ] **Step 1: README**

````markdown
# 초보자 안내서 원본

- **게임 안 안내서의 원본은 `guide/guide.html`** 이다(fragment). 문구를 고치면 여기서 고친다.
- `guide-source.html` 은 2026-09-07 슬라이드용 HTML, `고요한숲_초보자_안내서.pdf` 는 사용자가 확정한 20쪽 PDF, `guide-text.txt` 는 그 PDF 의 텍스트 추출본(`pdftotext -layout`)이다. 셋 다 참고용.
- 스크린샷 원본은 `img/`(1400px). 게임에 들어가는 압축본 `guide/img/` 는 아래로 다시 만든다.

```bash
sips -Z 1200 -s format jpeg -s formatOptions 72 docs/beginner-guide/img/X.jpg --out guide/img/X.jpg
```

- 장당 160KB · 총 3MB 제한은 `tests/guide.test.mjs` 가 지킨다.
````

- [ ] **Step 2: 전체 테스트·빌드**

```bash
npm test && node scripts/build-web.mjs && node scripts/build-ait.mjs && test ! -e dist-toss/guide && echo OK
```

Expected: 전부 성공, 마지막에 `OK`.

- [ ] **Step 3: 최종 브라우저 확인 스크린샷 4장 → `SendUserFile`**

PC 열림 / 폰 세로 열림 / 폰 세로 배너 / 토스 예약(platform-toss) 상단.

- [ ] **Step 4: 메모리**

`in-game-guide.md`(type: project): 패널 구조(fetch 주입·iframe 금지 이유), 입구(☰📖·튜토리얼 직후 배너 1회), 토스는 GUIDE_BASE 로 웹 오리진, 이미지 제한, 원본은 `guide/guide.html`. `MEMORY.md` 에 한 줄.

- [ ] **Step 5: Commit**

```bash
git add docs/beginner-guide/README.md
git commit -m "Docs: 📖 안내서 원본 위치·이미지 압축 절차 README

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

배포(`git push` → Workers Builds, 토스 번들 업로드)는 사용자가 결정한다 — 이 계획에 포함하지 않는다.
