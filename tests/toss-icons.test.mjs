import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { GAME_EMOJI, GAME_IDS, renderModule } from '../tools/icons/build-game-icons.mjs';
import { ICON_BY_EMOJI, ICON_BY_ID } from '../js/icons/toss-icons.js';
import { iconHtml, iconById, hasIcon, setIcon } from '../js/icons/index.js';
import { TOOLS, TOOL_PAGES } from '../js/data/tools.js';

const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const isMarkup = (s) => /^<svg class="ti" /.test(s) || /^<img class="ti" src="js\/icons\/tossface\/u[0-9A-F]+\.svg"/.test(s);
const TOSSFACE = { '✋': 'u270B', '👋': 'u1F44B', '🤝': 'u1F91D', '🪓': 'u1FA93', '⛏': 'u26CF', '🌰': 'u1F330', '💧': 'u1F4A7', '🔨': 'u1F528', '🎣': 'u1F3A3', '🌾': 'u1F33E', '🏕': 'u1F3D5' };

test('생성된 아이콘 모듈이 sims/icon-set 원본과 같다 (node tools/icons/build-game-icons.mjs 로 다시 만든다)', () => {
  assert.equal(src('js/icons/toss-icons.js'), renderModule());
});

test('게임이 쓰는 이모지·id 가 전부 SVG 나 토스페이스 이미지로 바뀐다', () => {
  for (const e of GAME_EMOJI) assert.ok(isMarkup(ICON_BY_EMOJI[e]), e);
  for (const id of GAME_IDS) assert.ok(isMarkup(ICON_BY_ID[id]), id);
});

test('손 모양·도구는 토스페이스 원본 파일을 그대로 불러오고 코드로 옮기지 않는다', () => {
  for (const [e, file] of Object.entries(TOSSFACE)) {
    assert.ok(ICON_BY_EMOJI[e].startsWith(`<img class="ti" src="js/icons/tossface/${file}.svg"`), e);
    assert.ok(existsSync(new URL(`../js/icons/tossface/${file}.svg`, import.meta.url)), file);
  }
  assert.match(src('js/icons/tossface/LICENSE.txt'), /토스페이스 저작권 안내/);
});

test('iconHtml 은 변형 선택자를 무시하고, 없는 이모지는 그대로 돌려준다', () => {
  assert.equal(iconHtml('⚙️'), ICON_BY_EMOJI['⚙']);
  assert.equal(iconHtml('🛸'), '🛸');
  assert.equal(hasIcon('🛸'), false);
  assert.equal(iconById('sickle'), ICON_BY_ID.sickle);
});

test('도구·도구 세트 아이콘이 모두 마크업이다', () => {
  for (const t of TOOLS) assert.ok(isMarkup(t.ico), t.id);
  for (const p of TOOL_PAGES) assert.ok(isMarkup(p.ico), p.id);
});

test('HUD 가 아이콘 도우미로 연결돼 있다', () => {
  const html = src('index.html');
  assert.match(html, /import \{[^}]*hydrateIcons[^}]*\} from '\.\/js\/icons\/index\.js'/);
  assert.match(html, /hydrateIcons\(\)/);
  assert.match(html, /setIcon\(\$\('time-emoji'\)/);
  assert.match(html, /setIcon\(\$\('season-emoji'\)/);
  assert.doesNotMatch(html, /\$\('time-emoji'\)\?\.textContent/);
  assert.match(src('js/hud/menu-sheet.js'), /iconHtml\(/);
  assert.doesNotMatch(src('js/hud/tool-fan.js'), /[?:] '✋'/);
  assert.doesNotMatch(html, /lastToolIco = (bare \? )?'✋'/);
});

test('설정 화면에 토스페이스 출처 문구가 있고 영어로도 나온다', () => {
  const credit = '이 서비스에는 토스팀에서 제공한 토스페이스가 적용되어 있습니다.';
  assert.ok(src('index.html').includes(credit));
  assert.ok(src('js/i18n-en.js').includes(credit));
});

test('없는 이모지는 HTML 로 해석되지 않게 이스케이프하고, 프로토타입 키에 걸리지 않는다', () => {
  assert.equal(iconHtml('<b>x</b>'), '&#60;b&#62;x&#60;/b&#62;');
  assert.equal(hasIcon('constructor'), false);
  assert.equal(iconById('constructor'), '');
});

test('setIcon 은 같은 이모지면 다시 그리지 않는다 (시간 아이콘이 매 프레임 불림)', () => {
  let writes = 0;
  let html = '';
  const el = { dataset: {}, get firstChild() { return html ? {} : null; }, set innerHTML(v) { writes++; html = v; }, get innerHTML() { return html; } };
  setIcon(el, '🌙');
  setIcon(el, '🌙');
  setIcon(el, '🌧️');
  assert.equal(writes, 2);
  assert.equal(el.dataset.ico, '🌧️');
});

test('이모트 버튼은 아이콘으로 바뀌어도 이름이 남는다', () => {
  const html = src('index.html');
  for (const e of ['👋', '❤️', '😄', '🎵']) assert.match(html, new RegExp(`data-e="${e}" aria-label="[^"]+"`), e);
});
