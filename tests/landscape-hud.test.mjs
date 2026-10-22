import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const LAND = '@media (orientation: landscape) and (max-height: 500px)';
const landBlock = () => {
  const i = html.indexOf(`${LAND} {\n    body.is-touch #topleft`);
  assert.ok(i > 0, '가로 폰 HUD 블록이 있어야 한다');
  return html.slice(i, html.indexOf('\n  }\n', i));
};

test('오른쪽 열 실측 배치는 가로 폰에서도 돈다 — 폭 640 만 보던 판정이 겹침의 원인', () => {
  assert.match(html, /const _phone = window\.matchMedia\('\(max-width: 640px\), \(orientation: landscape\) and \(max-height: 500px\)'\);/);
});

test('가로 폰 HUD — 자원 패널 한 줄, 조이스틱·액션 버튼은 아래로, 미니맵은 작게', () => {
  const b = landBlock();
  assert.match(b, /body\.is-touch #topright \{[^}]*flex-direction: row;/);
  assert.match(b, /body\.is-touch #minimap \{[^}]*width: 84px; height: 84px;/);
  assert.match(b, /body\.is-touch #joy-base \{[^}]*bottom: calc\(12px \+ env\(safe-area-inset-bottom\)\);[^}]*width: 104px; height: 104px;/);
  assert.match(b, /body\.is-touch #action-btn \{[^}]*bottom: calc\(14px \+ env\(safe-area-inset-bottom\)\);/);
});

test('아이폰 가로 — 노치 쪽 좌우 여백(safe-area-inset-left/right)을 비킨다', () => {
  const b = landBlock();
  for (const id of ['topleft', 'minimap', 'joy-base', 'quest-panel']) {
    assert.match(b, new RegExp(`#${id}[^{]*\\{[^}]*left: max\\(\\d+px, (calc\\()?env\\(safe-area-inset-left\\)`), `#${id} 왼쪽 여백`);
  }
  for (const id of ['topright', 'action-btn', 'feedback-tab', 'dex-tab']) {
    assert.match(b, new RegExp(`#${id}[^{]*\\{[^}]*right: max\\(\\d+px, (calc\\()?env\\(safe-area-inset-right\\)`), `#${id} 오른쪽 여백`);
  }
});

test('가로 폰 의뢰 패널 — 미니맵 바로 아래, 조이스틱 위까지만', () => {
  const b = landBlock();
  assert.match(b, /body\.is-touch #quest-panel, body\.is-touch\.story-on #quest-panel, body\.is-touch:has\(#hint-banner\.show\) #quest-panel \{[^}]*--qp-top: calc\(168px \+ var\(--top-inset\)\);/);
  assert.match(b, /#quest-panel \{[^}]*max-height: calc\(100dvh - var\(--qp-top\) - 124px - env\(safe-area-inset-bottom\)\);/);
});

test('가로 폰 블록은 터치에만 — 높이가 낮은 PC 창에는 안 걸린다', () => {
  const b = landBlock();
  const sels = [...b.matchAll(/\n\s{4}([^\n{]+)\{/g)].map(m => m[1].trim()).filter(s => !s.startsWith('/*'));
  for (const s of sels) assert.match(s, /body\.is-touch/, `터치 한정이 아닌 규칙: ${s}`);
});

test('🎓 코치는 미니맵 아래 한 줄 알약 — 짧은 문구 "n/17", 탭하면 설명·진행바·건너뛰기가 펼쳐진다', () => {
  assert.doesNotMatch(html, /id="coach-dots"/);
  assert.match(html, /<button id="coach-head" type="button"><span id="coach-short"><\/span><span id="coach-count"><\/span><span id="coach-chev">▾<\/span><\/button>/);
  assert.match(html, /<div id="coach-foot"><div id="coach-bar"><i id="coach-fill"><\/i><\/div><button id="coach-skip">건너뛰기<\/button><\/div><\/div>/);
  assert.match(html, /#coach\.open #coach-body \{ display: flex; \}/);
  assert.match(html, /\$\('coach-count'\)\.textContent = `\$\{tutIdx \+ 1\}\/\$\{TUT_STEPS\.length\}`;/);
  assert.match(html, /\$\('coach-short'\)\.textContent = t\(TUT_STEPS\[tutIdx\]\.short\);/);
  assert.match(html, /body\.menu-open #coach \{ display: none !important; \}/);
  assert.match(html, /body:has\(\[id\$="-modal"\]\.show\) #coach \{ display: none !important; \}/);
});

test('🎓 코치 짧은 문구 16개 — 전부 있고 영어 사전에도 있다', async () => {
  const shorts = [...html.matchAll(/short: '([^']+)'/g)].map(m => m[1]);
  assert.equal(shorts.length, 16);
  const { EN } = await import('../js/i18n-en.js');
  for (const s of shorts) assert.ok(EN[s], s);
});

test('🎓 진행바 카드 — 원문(번역 키)으로 번역한 뒤 앞 번호만 뗀다(순서가 바뀌어도 영어가 안 깨진다)', () => {
  assert.match(html, /\$\('coach-text'\)\.textContent = t\(TUT_STEPS\[tutIdx\]\.text\)\.replace\(\/\^\[①-⑰\]\\s\*\/, ''\);/);
  assert.doesNotMatch(html, /const CIRC = '①②③/);
});

test('🎓 코치 자리는 미니맵 바로 아래(가로·세로 폰 공통) — 캐릭터 위를 덮지 않게', () => {
  assert.doesNotMatch(landBlock(), /body\.is-touch #coach \{/);
  assert.match(html, /document\.body\.style\.setProperty\('--coach-top', Math\.round\(r\.bottom \+ 8\) \+ 'px'\);/);
});

test('is-touch 는 playing 보다 먼저 — 세이브 로드 동안 폰에 키보드 안내가 넘쳐 보였다', () => {
  assert.match(html, /if \(TOUCH\) document\.body\.classList\.add\('is-touch'\);\n\s*document\.body\.classList\.add\('playing'\);/);
});

test('가로 폰 — 토스트는 오른쪽 열 아래(가운데는 문 프롬프트 자리), 대화 프롬프트는 세로 폰처럼 대화 버튼으로', () => {
  const b = landBlock();
  assert.match(b, /body\.is-touch #npc-prompt \{ display: none; \}/);
  assert.match(b, /body\.is-touch\.coaching #toast[^{]*\{[^}]*top: max\(calc\(72px \+ var\(--top-inset\)\), var\(--rcol-bottom, 0px\)\);[^}]*right: max\(12px, env\(safe-area-inset-right\)\);/);
});

test('가로 판정은 터치 기기만 — 높이 낮은 PC 창에서 문의하기가 위아래로 늘어나지 않게', () => {
  assert.match(html, /const _narrow = window\.matchMedia\('\(max-width: 640px\)'\);/);
  assert.match(html, /if \(!_phone\.matches \|\| \(!_narrow\.matches && !TOUCH\)\) \{ fb\.style\.top/);
});

test('꾸미기는 튜토리얼 단계가 아니다 — 실내 꾸미기 안내는 자기 카드로', () => {
  assert.doesNotMatch(html, /key: 'decor'/);
  assert.doesNotMatch(html, /TUT_STEPS\[tutIdx\]\.key === 'decor'/);
});

test('가로 폰 — 문·구역 프롬프트는 도구바 바로 위로(코치 카드 아래 공간 확보)', () => {
  assert.match(landBlock(), /body\.is-touch #door-prompt, body\.is-touch #fish-prompt, body\.is-touch #zone-prompt \{ bottom: calc\(104px \+ env\(safe-area-inset-bottom\)\); \}/);
});

test('가로 폰 — 캐릭터 선택창은 아이폰 Safari 가로(높이 약 293pt)에서도 시작 버튼이 스크롤 없이 보인다', () => {
  const i = html.indexOf('@media (orientation: landscape) and (max-height: 500px) {\n    #char-modal .tut-card');
  assert.ok(i > 0);
  const b = html.slice(i, html.indexOf('\n  }\n', i));
  assert.match(b, /#char-modal > \.tut-card > p \{ display: none; \}/);
  assert.match(b, /#char-preview, #char-preview-fallback \{ width: 120px; height: 96px; \}/);
});

test('가로 폰 — 첫 환영 창은 조작 목록·큰 이모지를 접어 시작 버튼이 바로 보인다', () => {
  assert.match(html, /#tutorial-modal \.tut-emoji, #tutorial-modal \.tut-list \{ display: none; \}/);
});
