import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chipState, snapshot, progressed, sheetTab, sheetPlacement, chipIntroNext, CHIP_INTRO_GAP_MS, CHIP_INTRO_MS, CHIP_INTRO_COPY, CHIP_INTRO_KEYS } from '../js/hud/quest-chips-model.js';
import { questPanelView } from '../js/quest-panel-view.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const q = (id, progress, target, extra = {}) => ({ id, title: id, progress, target, ...extra });
const tr = (npc, value, pct, extra = {}) => ({ npc, value, pct, ...extra });

test('의뢰 고리는 맨 위 의뢰의 진행도, 배지는 n/m', () => {
  const s = chipState({ list: [q('a', 1, 4), q('b', 2, 2)], tracker: null, unread: 0 });
  assert.equal(s.q.show, true);
  assert.equal(s.q.pct, 0.25);
  assert.equal(s.q.badge, '1/4');
});

test('pct 가 있는 카드는 pct 를 쓰고, 넘친 진행도는 목표에서 멈춘다', () => {
  assert.equal(chipState({ list: [q('a', 3, 2)], tracker: null, unread: 0 }).q.badge, '2/2');
  assert.equal(chipState({ list: [q('a', 3, 2)], tracker: null, unread: 0 }).q.pct, 1);
  const s = chipState({ list: [{ id: 'p', title: 'p', pct: 0.4 }], tracker: null, unread: 0 });
  assert.equal(s.q.pct, 0.4);
  assert.equal(s.q.badge, '');
});

test('의뢰가 없으면 의뢰 버튼을 숨긴다', () => {
  const s = chipState({ list: [], tracker: tr('owl', 1, 0.5), unread: 0 });
  assert.equal(s.q.show, false);
  assert.equal(s.a.show, true);
});

test('친해지기 버튼은 tracker 가 없으면 숨고, 시작 상태면 고리가 비어 있다', () => {
  assert.equal(chipState({ list: [], tracker: null, unread: 0 }).a.show, false);
  const s = chipState({ list: [], tracker: { start: true, text: 'x' }, unread: 0 });
  assert.equal(s.a.show, true);
  assert.equal(s.a.pct, 0);
});

test('읽지 않은 편지가 있으면 친해지기 버튼에 빨간 점', () => {
  assert.equal(chipState({ list: [], tracker: tr('owl', 1, 1 / 3), unread: 2 }).a.dot, true);
  assert.equal(chipState({ list: [], tracker: tr('owl', 1, 1 / 3), unread: 0 }).a.dot, false);
  assert.equal(chipState({ list: [], tracker: tr('owl', 1, 1 / 3), unread: 0 }).a.pct, 1 / 3);
});

test('진행이 오르면 해당 버튼만 빛난다', () => {
  const a = snapshot([q('a', 1, 4)], tr('owl', 1, 0.3));
  assert.deepEqual(progressed(a, snapshot([q('a', 2, 4)], tr('owl', 1, 0.3))), ['q']);
  assert.deepEqual(progressed(a, snapshot([q('a', 1, 4)], tr('owl', 2, 0.6))), ['a']);
  assert.deepEqual(progressed(a, snapshot([q('a', 2, 4)], tr('owl', 2, 0.6))), ['q', 'a']);
});

test('처음 값·내려간 값·다른 의뢰·다른 주민은 빛나지 않는다', () => {
  assert.deepEqual(progressed(null, snapshot([q('a', 2, 4)], tr('owl', 2, 0.6))), []);
  const a = snapshot([q('a', 2, 4)], tr('owl', 2, 0.6));
  assert.deepEqual(progressed(a, snapshot([q('a', 1, 4)], tr('owl', 1, 0.3))), []);
  assert.deepEqual(progressed(a, snapshot([q('b', 3, 4)], tr('fox', 3, 0.9))), []);
});

test('맨 위가 아닌 의뢰가 올라도 의뢰 버튼이 빛난다', () => {
  const a = snapshot([q('a', 1, 4), q('b', 0, 2)], null);
  assert.deepEqual(progressed(a, snapshot([q('a', 1, 4), q('b', 1, 2)], null)), ['q']);
});

test('친해지기 단계가 넘어가 비율이 내려가도 호감도 값이 오르면 빛난다', () => {
  const a = snapshot([], tr('owl', 3, 1));
  assert.deepEqual(progressed(a, snapshot([], tr('owl', 4, 0.66))), ['a']);
});

test('열린 탭의 버튼이 사라지면 다른 탭으로, 둘 다 없으면 닫는다', () => {
  const both = chipState({ list: [q('a', 1, 2)], tracker: tr('owl', 1, 0.5), unread: 0 });
  const onlyA = chipState({ list: [], tracker: tr('owl', 1, 0.5), unread: 0 });
  const none = chipState({ list: [], tracker: null, unread: 0 });
  assert.equal(sheetTab('q', both), 'q');
  assert.equal(sheetTab('q', onlyA), 'a');
  assert.equal(sheetTab('a', none), null);
  assert.equal(sheetTab(null, both), null);
});

test('세로 시트는 좌우 8, 아래 끝이 조이스틱 위 8', () => {
  const p = sheetPlacement({ vw: 360, vh: 740, joy: { top: 530, left: 28, right: 148 }, tools: null });
  assert.deepEqual(p, { left: 8, width: 344, bottom: 218, maxHeight: 514, dimBottom: 218 });
});

test('가로 시트는 가운데 344 카드, 아래 8, 조이스틱·도구 버튼 사이', () => {
  const p = sheetPlacement({ vw: 740, vh: 360, joy: { top: 244, left: 20, right: 124 }, tools: { left: 555 } });
  assert.deepEqual(p, { left: 198, width: 344, bottom: 8, maxHeight: 344, dimBottom: 124 });
});

test('가로가 좁으면 카드를 조이스틱과 도구 버튼 사이에 맞춘다', () => {
  const p = sheetPlacement({ vw: 560, vh: 320, joy: { top: 204, left: 20, right: 124 }, tools: { left: 420 } });
  assert.equal(p.left, 132);
  assert.equal(p.width, 280);
});

test('조이스틱이 없으면 아래 8에 붙는다', () => {
  const p = sheetPlacement({ vw: 360, vh: 740, joy: null, tools: null });
  assert.equal(p.bottom, 8);
  assert.equal(p.dimBottom, 0);
});

test('시트 안 의뢰는 접기·펼치기 없이 펼친 카드로', () => {
  const v = questPanelView([q('A', 1, 2), q('B', 0, 2)], { phone: true, open: false, short: true, more: 1, sheet: true });
  assert.deepEqual(v.items.map(i => i.mode), ['lead', 'sub']);
  assert.equal(v.toggle, null);
  assert.equal(v.more, 1);
});

test('새 문구는 영어 사전에 한 번씩만', () => {
  const en = read('js/i18n-en.js');
  for (const k of ['의뢰', '친해지기']) assert.equal(en.split(`\n  '${k}': `).length - 1, 1, k);
  assert.match(en, /'닫기': 'Close'/);
});

test('시트가 열린 동안 화면 위 안내 화살표·칩·거리 표시를 가린다', async () => {
  const { QUEST_CHIPS_CSS } = await import('../js/hud/quest-chips-css.js');
  for (const sel of ['#goal-arrow', '#guide-card', '#guide-mark', '#guide-edge', '[id$="-guide-compass"]', '[id$="-guide-mark"]', '[id$="-guide-edge"]']) {
    assert.ok(QUEST_CHIPS_CSS.includes(`body.quest-sheet-open ${sel}`), sel);
  }
  assert.match(QUEST_CHIPS_CSS, /body\.quest-sheet-open [^{]*\{ display: none !important; \}/);
  const src = read('js/hud/quest-chips.js');
  assert.match(src, /document\.body\.classList\.add\('quest-sheet-open'\)/);
  assert.match(src, /document\.body\.classList\.remove\('quest-sheet-open'\)/);
});

const idle = { hints: {}, shown: { q: true, a: true }, now: 60000, lastAt: -Infinity, busy: false };

test('기존 유저는 의뢰 버튼이 보이면 전환 소개를 한 번 본다', () => {
  assert.equal(chipIntroNext(idle), 'old');
  assert.equal(chipIntroNext({ ...idle, hints: { chipOld: 1 } }), null);
  assert.equal(chipIntroNext({ ...idle, shown: { q: false, a: false } }), null);
});

test('신규 유저는 의뢰 소개 다음에 친해지기 소개를 본다', () => {
  const fresh = { ...idle, hints: { chipNew: 1 } };
  assert.equal(chipIntroNext(fresh), 'q');
  assert.equal(chipIntroNext({ ...fresh, shown: { q: false, a: false } }), null);
  assert.equal(chipIntroNext({ ...fresh, hints: { chipNew: 1, chipQ: 1 } }), 'a');
  assert.equal(chipIntroNext({ ...fresh, hints: { chipNew: 1, chipQ: 1 }, shown: { q: true, a: false } }), null);
  assert.equal(chipIntroNext({ ...fresh, hints: { chipNew: 1, chipQ: 1, chipA: 1 } }), null);
});

test('의뢰 버튼이 없을 땐 친해지기 버튼부터 소개하고, 의뢰 버튼은 생길 때 소개한다', () => {
  const onlyA = { ...idle, shown: { q: false, a: true } };
  assert.equal(chipIntroNext(onlyA), 'a');
  assert.equal(chipIntroNext({ ...onlyA, hints: { chipNew: 1 } }), 'a');
  assert.equal(chipIntroNext({ ...idle, hints: { chipA: 1 } }), 'old');
});

test('전환을 본 기존 유저는 두 소개를 모두 본 것으로 친다', () => {
  assert.equal(chipIntroNext({ ...idle, hints: { chipOld: 1 } }), null);
});

test('소개는 바쁠 때 기다리고 서로 10초 이상 떨어진다', () => {
  const fresh = { ...idle, hints: { chipNew: 1, chipQ: 1 } };
  assert.equal(chipIntroNext({ ...fresh, busy: true }), null);
  assert.equal(chipIntroNext({ ...fresh, lastAt: idle.now - CHIP_INTRO_GAP_MS + 1 }), null);
  assert.equal(chipIntroNext({ ...fresh, lastAt: idle.now - CHIP_INTRO_GAP_MS }), 'a');
  assert.equal(CHIP_INTRO_MS, 8000);
});

test('소개 문구는 승인 시안 그대로이고 엠대시·놀다·화살표 이모지가 없다', () => {
  assert.deepEqual({ ...CHIP_INTRO_COPY }, { old: '의뢰는 여기서 볼 수 있어요', q: '첫 의뢰가 왔어요', a: '주민과 친해지면 선물이 와요' });
  for (const s of Object.values(CHIP_INTRO_COPY)) assert.doesNotMatch(s, /—|놀|[⬅➡⬆⬇]/u);
  assert.deepEqual({ ...CHIP_INTRO_KEYS }, { old: 'chipOld', q: 'chipQ', a: 'chipA' });
});

test('새 요소는 의뢰 패널 안에 들어가 패널 숨김 규칙을 그대로 따른다', () => {
  const src = read('js/hud/quest-chips.js');
  assert.match(src, /panel\.append\(/);
  assert.doesNotMatch(src, /—|놀/);
});
