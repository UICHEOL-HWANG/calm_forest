import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('낚시 보장: 다음 한 번만, DDA 안 건드림, assist 기록', () => {
  const f = src('js/spaces/fishing.js');
  assert.match(f, /export function setFishAssist\(on\)/);
  assert.match(f, /const ASSIST_BITE_SEC = 1\.2;/);
  assert.match(f, /const ASSIST_HOLD_SEC = 20;/);
  assert.match(f, /if \(!assisted\) settleDifficulty\('fish', 1\);/);
  assert.match(f, /\.\.\.\(assisted \? \{ assist: 1 \} : \{\}\)/);
});

test('먹이·수첩 연결', () => {
  const f = src('js/pond/feed.js');
  assert.match(f, /export function feedPond\(kind = 'free'\)/);
  assert.match(f, /export function openPondBook\(\)/);
  assert.match(f, /trackEvent\('pond_feed', \{ kind, count: pondCount\(\) \}\)/);
  assert.match(f, /trackEvent\('pond_book_open', \{ count: book\.got \}\)/);
  assert.match(f, /buffs\.luck = Math\.max\(buffs\.luck, clock\.elapsedTime\) \+ FEED_BUFF_SEC/);
  assert.doesNotMatch(f, /^\s*\/\//m);
});

test('🐟 행동 버튼: 프롬프트·아이콘·분기·광고', () => {
  const d = src('js/spaces/doors.js');
  assert.match(d, /if \(!prompt && pondNear\(\)\) \{ \$w\.nearDoor = 'pond'; prompt = POND_COPY\.prompt; \}/);
  const h = src('index.html');
  assert.equal((h.match(/\|🗑️\|🐟\)\/u/g) || []).length, 2);
  const g = src('js/game.js');
  assert.match(g, /if \(nearDoor === 'pond'\) return openPondBook\(\);/);
  assert.match(g, /rewarded\.button\('pond_feed_more', \['광고 보고', ' ', POND_COPY\.adMore\]/);
  assert.match(src('js/guide/prepass-rules.js'), /'sell_bonus', 'pond_feed_more'\]/);
});

test('마당 채우기 연결', () => {
  const y = src('js/pond/yard-guide.js');
  assert.match(y, /export function createYardGuide\(deps\)/);
  assert.match(y, /export function installYardGuide\(deps\)/);
  assert.match(y, /export function yardGuidePointTo\(kind\)/);
  assert.match(y, /run\('yard_fill', yardSteps\(POND_COPY\)/);
  assert.match(y, /run\('pond_d1', d1Steps\(POND_COPY\)/);
  assert.match(y, /onStep: e => deps\.track\('guide_step', e\)/);
  assert.match(y, /hintsSeen\.yardFill = true/);
  assert.match(y, /hintsSeen\.pondD1 = true/);
  assert.doesNotMatch(y, /guideRevamp|e6Decision/);
  const g = src('js/game.js');
  assert.match(g, /yardGuide = installYardGuide\(\{/);
  assert.match(g, /if \(mode === 'play'\) yardGuide\?\.update\(dt\);/);
  assert.match(g, /guideArbiter\.register\(\{ name: 'yard', active: \(\) => !!yardGuide\?\.active\(\) \}\);/);
  assert.match(g, /free: \(\) => [^\n]*cameraFree\(\) && guideMay\('yard'\),/);
  assert.match(g, /held: \(\) => !guideMay\('yard'\),/);
  assert.match(y, /if \(deps\.held\?\.\(\)\) \{ suspend\(\); return; \}/);
});

test('마당 안내: 시작 횟수·멈춤 종료·레거시 다리·시작 전 먹이 확인', () => {
  const y = src('js/pond/yard-guide.js');
  assert.match(y, /h\.yardTries = \(h\.yardTries \| 0\) \+ 1;/);
  assert.match(y, /tries: h\.yardTries/);
  assert.match(y, /guideStalled\(lastProgressAt, nowSec\)/);
  assert.match(y, /bridge: bridgeDone\(s\)/);
  assert.match(y, /if \(!deps\.pondPos\(\)\) deps\.setAssist\(true\);/);
  assert.match(y, /h\.yardFill = true;\n\s*deps\.save\(\);\n\s*return;/);
});

test('항구·식당 안내는 마당 안내 중엔 시작하지 않는다', () => {
  const g = src('js/game.js');
  assert.match(g, /maybeStartPortGuide\([^;]*&& !yardGuide\?\.active\(\)\)/);
  assert.match(g, /maybeStartRestaurantGuide\([^;]*&& !yardGuide\?\.active\(\)\)/);
});

test('수첩 바다 칸: 닫힌 바다는 이동 버튼 없이 문구만', () => {
  const f = src('js/pond/feed.js');
  assert.match(f, /if \(h\.kind === 'sea' && !isOpen\('sea'\)\) return \{ line: POND_COPY\.hintSeaLocked \};/);
  assert.match(src('js/pond/copy.js'), /hintSeaLocked: '🌊 바다터가 열리면 낚을 수 있어요'/);
  assert.match(src('js/i18n-en.js'), /'🌊 바다터가 열리면 낚을 수 있어요': '🌊 You can catch it once the sea spot opens'/);
});

test('보장 캐스팅은 놓침·포기에서도 DDA 를 안 움직인다', () => {
  const f = src('js/spaces/fishing.js');
  assert.match(f, /if \(!assisted\) settleDifficulty\('fish', 0\);/);
  assert.match(f, /trackEvent\('fishing_miss', \{[^}]*\.\.\.\(assisted \? \{ assist: 1 \} : \{\}\) \}\)/);
  assert.equal((f.match(/if \(!assisted\) trackDiffAbandon/g) || []).length, 2);
});

test('마이그레이션은 한 트랜잭션', () => {
  const s = src('sql/migrations/migrate_push_pond.sql').trim();
  assert.ok(s.startsWith('begin;') && s.endsWith('commit;'));
});

test('안내 중 무관한 HUD·NPC 말풍선 숨김 배선', () => {
  const g = src('js/pond/yard-guide.js');
  assert.match(g, /export const YARD_HUD_CLASS = 'yard-guiding';/);
  const css = g.match(/export const YARD_HUD_CSS =\s*`([^`]*)`|export const YARD_HUD_CSS =\s*'([^']*)'/);
  assert.ok(css, 'YARD_HUD_CSS');
  const body = css[1] ?? css[2];
  for (const id of ['story-chip', 'quest-panel', 'habitat-meter', 'app-banner']) assert.ok(body.includes(`body.yard-guiding #${id}`), id);
  assert.ok(body.includes('display: none !important'));
  assert.match(g, /document\.body\.classList\.toggle\(YARD_HUD_CLASS, hidden\)/);
  assert.match(g, /deps\.setHudHidden\(hidden\)/);
  const n = src('js/spaces/npc.js');
  assert.match(n, /export function setNpcGlyphsHidden\(on\)/);
  assert.match(n, /o\.sprite\.visible = !glyphsHidden;/);
  assert.match(src('js/game.js'), /setHudHidden: setNpcGlyphsHidden,/);
});

test('HUD 숨김 다듬기: 올빼미 배너·모드 전환·좌판 표시', () => {
  const h = src('index.html');
  assert.match(h, /body:not\(\.yard-guiding\):has\(#habitat-meter:not\(\[hidden\]\)\) #hint-banner/);
  assert.doesNotMatch(h, /body:has\(#habitat-meter:not\(\[hidden\]\)\) #hint-banner/);
  const y = src('js/pond/yard-guide.js');
  assert.match(y, /const suspend = \(\) => \{\s*lastProgressAt = performance\.now\(\) \/ 1000;/);
  assert.match(src('js/game.js'), /if \(mode === 'play'\) yardGuide\?\.update\(dt\); else yardGuide\?\.suspend\(\);/);
  const n = src('js/spaces/npc.js');
  assert.match(n, /shopCue\.visible = shopCueVisible\(\{ now: clock\.elapsedTime, until: shopCueUntil, hidden: glyphsHidden \}\);/);
});
