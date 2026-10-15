import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { questPanelView } from '../js/quest-panel-view.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const q = (title, extra = {}) => ({ title, name: '농부 삼촌', progress: 1, target: 2, ...extra });

test('PC — 지금처럼 맨 위 한 건만 펼치고 나머지는 요약, 펼치기 버튼 없음', () => {
  const v = questPanelView([q('A'), q('B')], { phone: false, open: false, short: false, more: 0 });
  assert.deepEqual(v.items.map(i => i.mode), ['lead', 'sub']);
  assert.equal(v.toggle, null);
  assert.equal(v.more, 0);
});

test('PC 짧은 창 — 전부 요약형(기존 규칙 유지)', () => {
  const v = questPanelView([q('A'), q('B')], { phone: false, open: false, short: true, more: 0 });
  assert.deepEqual(v.items.map(i => i.mode), ['sub', 'sub']);
});

test('폰 접힘 — 한 줄 카드 한 건만, 나머지는 "+N건 더"로 센다', () => {
  const v = questPanelView([q('A'), q('B'), q('C')], { phone: true, open: false, short: false, more: 1 });
  assert.deepEqual(v.items.map(i => i.mode), ['line']);
  assert.equal(v.items[0].q.title, 'A');
  assert.equal(v.more, 3);
  assert.equal(v.toggle, '펼치기');
});

test('폰 펼침 — 맨 위는 수행 방법까지, 나머지는 요약, 버튼은 접기', () => {
  const v = questPanelView([q('A'), q('B')], { phone: true, open: true, short: true, more: 0 });
  assert.deepEqual(v.items.map(i => i.mode), ['lead', 'sub']);
  assert.equal(v.toggle, '접기');
  assert.equal(v.more, 0);
});

test('빈 목록 — 아무것도 그리지 않는다', () => {
  const v = questPanelView([], { phone: true, open: false, short: false, more: 0 });
  assert.deepEqual(v.items, []);
  assert.equal(v.toggle, null);
});

test('index.html — 패널 탭으로 접고 펼치며, 펼치기 문구는 하단 오른쪽', () => {
  assert.match(html, /<div id="quest-foot"><div class="q-more" id="quest-more"><\/div><button id="quest-toggle" type="button"><\/button><\/div>/);
  assert.match(html, /#quest-panel #quest-toggle \{[^}]*margin-left: auto;[^}]*opacity: \.5;/);
  assert.match(html, /questPanelView\(/);
  assert.match(html, /trackEvent\('quest_panel_toggle', \{ open: /);
});

test('영어판 — 펼치기·접기 문구가 있다', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  assert.match(en, /'펼치기': '/);
  assert.match(en, /'접기': '/);
});

test('가로 폰에서 펼치면 미니맵 자리까지 올라가 수행 방법이 보인다', () => {
  const i = html.indexOf('@media (orientation: landscape) and (max-height: 500px) {\n    body.is-touch #topleft');
  const b = html.slice(i, html.indexOf('\n  }\n', i));
  assert.match(b, /body\.is-touch\.quest-open #quest-panel, body\.is-touch\.quest-open:has\(#hint-banner\.show\) #quest-panel \{ --qp-top: calc\(76px \+ var\(--top-inset\)\);/);
  assert.match(b, /body\.is-touch\.quest-open:not\(\.coaching\):not\(\.app-banner-on\) #minimap \{ display: none; \}/);
  assert.match(b, /body\.is-touch\.quest-open #quest-panel \.q-how \{ display: block; \}/);
  assert.match(html, /document\.body\.classList\.toggle\('quest-open', view\.toggle === '접기'\);/);
});

test('접힌 카드도 완료된 의뢰면 누구에게 가야 하는지 남긴다', () => {
  assert.match(html, /if \(!line \|\| q\.ready\) el\.appendChild\(prog\);/);
});

test('패널을 다시 그려도 게이지가 0에서 다시 차오르지 않는다 — 직전 값에서 시작', () => {
  assert.match(html, /const questBarLast = new Map\(\);/);
  assert.match(html, /fill\.style\.width = questBarLast\.get\(barKey\) \|\| '0%';/);
  assert.match(html, /questBarLast\.set\(barKey, pct\);/);
});
