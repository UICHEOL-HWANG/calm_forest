import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOOT_STEPS, createBootScreen, activeBootVeil } from '../js/boot-screen.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

function fakeLoading() {
  const classes = new Set(['boot-bg']);
  const vars = {};
  const fill = { style: { setProperty: (k, v) => { vars[k] = v; } } };
  const label = { textContent: BOOT_STEPS[0].text };
  return {
    vars, label,
    style: { display: '' },
    classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
    querySelector: (sel) => (sel === '.boot-bar i' ? fill : sel === '.boot-step' ? label : null),
  };
}

const instant = { t: (s) => `T(${s})`, wait: () => Promise.resolve() };

test('BOOT_STEPS: 1안 문구 순서이고 막대 목표치는 1 미만에서 점점 커진다', () => {
  assert.deepEqual(BOOT_STEPS.map(s => s.text), ['숲길을 여는 중', '주민을 깨우는 중', '내 마을을 불러오는 중']);
  BOOT_STEPS.forEach((s, i) => {
    assert.ok(s.to > 0 && s.to < 1);
    if (i) assert.ok(s.to > BOOT_STEPS[i - 1].to);
  });
});

test('step: 문구(번역)와 막대를 올리고 뒤로 가지 않는다', () => {
  const el = fakeLoading();
  const screen = createBootScreen(el, instant);
  screen.step(1);
  assert.equal(el.label.textContent, 'T(주민을 깨우는 중)');
  assert.equal(el.vars['--to'], String(BOOT_STEPS[1].to));
  screen.step(0);
  assert.equal(el.label.textContent, 'T(주민을 깨우는 중)');
  screen.step(9);
  assert.equal(el.vars['--to'], String(BOOT_STEPS[1].to));
});

test('veil: 남색 가림막 대신 쓰는 가림막 — hide 가 원을 열고 화면을 내린다', async () => {
  const el = fakeLoading();
  const screen = createBootScreen(el, instant);
  const veil = activeBootVeil();
  assert.ok(veil);
  veil.show();
  assert.equal(el.style.display, '');
  await veil.hide();
  assert.equal(el.style.display, 'none');
  assert.equal(el.vars['--to'], '1');
  assert.equal(el.classList.contains('boot-open'), false);
  assert.equal(screen.isUp(), false);
  assert.equal(activeBootVeil(), null);
});

test('dismiss: 로그인 화면으로 갈 땐 페이드로 내리고, 그 뒤엔 가림막을 주지 않는다', async () => {
  const el = fakeLoading();
  const screen = createBootScreen(el, instant);
  await screen.dismiss();
  assert.equal(el.style.display, 'none');
  assert.equal(screen.veil(), null);
  screen.step(2);
  assert.equal(el.label.textContent, BOOT_STEPS[0].text);
});

test('veil: 다른 경로(세이브 복구 등)로 이미 숨겨졌으면 null — 남색 가림막으로 돌아간다', () => {
  const el = fakeLoading();
  const screen = createBootScreen(el, instant);
  el.style.display = 'none';
  assert.equal(screen.isUp(), false);
  assert.equal(activeBootVeil(), null);
});

test('앱 빌드는 첫 페인트 전에 html.boot-b(로컬은 ?bootb=1), B 요소는 웹 알약 뒤에 둔다', () => {
  const html = read('index.html');
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /<script>if \(\/\^\(localhost[^<]*bootb=1[^<]*classList\.add\('boot-b'\);<\/script>/);
  assert.match(read('scripts/build-cap.mjs'), /<script>window\.\$\{FLAGS\[TARGET\]\} = true;\$\{adsFlag\} document\.documentElement\.classList\.add\('boot-b'\);<\/script>/);
  assert.match(html, /<div id="loading" class="boot-bg"><span class="load-pill">[\s\S]*?<\/span><\/span><i class="boot-mark" aria-hidden="true"><\/i><span class="boot-bar" aria-hidden="true"><i><\/i><\/span><span class="boot-step" role="status" aria-live="polite">숲길을 여는 중<\/span><\/div>/);
  assert.match(html, /html\.boot-b #loading\.boot-bg \.boot-mark \{[^}]*assets\/boot\/mark\.png/);
});

test('index.html: 앱에선 월드가 지어져도 로딩을 내리지 않고, 로그인 화면으로 갈 땐 페이드', () => {
  const html = read('index.html');
  assert.match(html, /if \(bootScreen\) \{ bootScreen\.step\(1\); return nextPaint\(\)\.then\(\(\) => bootWorld\(ui\)\); \}\n\s*return bootWorld\(ui\);/);
  assert.match(html, /if \(bootScreen\) \{ bootScreen\.step\(2\); return; \}\n\s*\$\('loading'\)\.style\.display = 'none';\n\s*revealWorld\(\);/);
  assert.match(html, /try \{ await enterGame\(\); \} catch \(e\) \{ if \(bootScreen\?\.isUp\(\)\) showWorldFailed\(\); throw e; \}/, '입장 중 오류면 B 화면 뒤에 갇히지 않고 다시 들어가기 안내');
  assert.match(html, /if \(bootScreen\?\.isUp\(\)\) bootScreen\.dismiss\(\); else \$\('loading'\)\.style\.display = 'none';/);
  assert.match(html, /if \(bootScreen\?\.isUp\(\) && !stuck && el\.dataset\.stuck !== '1'\) \{ if \(on\) bootScreen\.step\(2\); return; \}/);
});

test('game.js: 앱의 B 화면이 떠 있으면 그것을 가림막으로, 아니면 남색 가림막', () => {
  assert.match(read('js/game.js'), /veil: activeBootVeil\(\) \|\| revealVeil\(\)/);
});

test('앱 바탕·실행 화면이 B 화면과 같은 연한 숲색', () => {
  const cap = JSON.parse(read('capacitor.config.json'));
  assert.equal(cap.ios.backgroundColor, '#dfe8d800', 'iOS 는 투명 — 웹이 그려지기 전엔 네이티브 창의 숲색·곰이 비친다');
  assert.match(read('index.html'), /html\.boot-b \{ background: #dfe8d8; \}/);
  assert.equal(cap.android.backgroundColor, '#dfe8d8');
  assert.match(read('ios/App/App/Base.lproj/LaunchScreen.storyboard'), /red="0\.874\d*" green="0\.909\d*" blue="0\.847\d*"/);
  assert.match(read('android/app/src/main/res/values/styles.xml'), /windowSplashScreenBackground">@color\/boot_bg</);
  assert.match(read('android/app/src/main/res/values/colors.xml'), /<color name="boot_bg">#DFE8D8<\/color>/i);
  assert.match(read('scripts/build-cap.mjs'), /cpSync\('assets\/boot', `\$\{OUT\}\/assets\/boot`/);
  const scene = read('ios/App/App/SceneDelegate.swift');
  assert.match(scene, /window\?\.backgroundColor = UIColor\(red: 0\.875, green: 0\.910, blue: 0\.847/);
  assert.match(scene, /UIImageView\(image: UIImage\(named: "Splash"\)\)[\s\S]*b\.height \* 0\.42 - 46[\s\S]*insertSubview\(mark, at: 0\)/);
});

test('영어 사전에 단계 문구 3개가 있다', () => {
  const en = read('js/i18n-en.js');
  for (const s of BOOT_STEPS) assert.match(en, new RegExp(`'${s.text}':`));
});

test('토스 번들도 B 화면 — 첫 페인트 전에 html.boot-b, 곰 마크를 함께 싣는다', () => {
  const ait = read('scripts/build-ait.mjs');
  assert.match(ait, /<script>window\.__APPS_IN_TOSS__ = true; document\.documentElement\.classList\.add\('boot-b'\);<\/script>/);
  assert.match(ait, /cpSync\('assets\/boot', 'dist-toss\/assets\/boot'/);
});
