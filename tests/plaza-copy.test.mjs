import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAZA_COPY, toastText, subtitleText, nextTierText, tierLabel, stagePct, giveText } from '../js/plaza/copy.js';
import { nextTier } from '../js/plaza/rules.js';
import { PLAZA_STAGE_NAMES, PLAZA_TIERS } from '../js/data/plaza.js';

const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const STAGE2 = [{ item: 'coal', have: 10, need: 100 }, { item: 'stone', have: 180, need: 400 }, { item: 'wood', have: 60, need: 200 }];

test('확정 문구 조합', () => {
  assert.equal(toastText('ok', 'stone', 5), '🪨 돌 5개를 보탰어요! 🍂+5');
  assert.equal(toastText('upstream', 'stone', 0), PLAZA_COPY.toast.offline);
  assert.equal(toastText('???', 'stone', 0), PLAZA_COPY.toast.offline);
  assert.equal(stagePct(STAGE2), 36);
  assert.equal(subtitleText(2, STAGE2), '2단계 · 돌바닥 깔기 — 다 같이 36%');
  assert.equal(nextTierText(nextTier(34)), '🥈 은빛 일꾼까지 26개');
  assert.equal(nextTierText(null), '');
  assert.equal(tierLabel('bronze'), '🥉 동빛 일꾼');
  assert.equal(giveText(18), '18개 보태기');     // 게이트 C: 누르면 실제로 낼 개수를 버튼에 적는다
  assert.equal(giveText(0), '보태기');
  assert.deepEqual(PLAZA_COPY.buttons, ['+1', '+5']);
});

test('옛 문구 있는 만큼 은 광장 코드·사전에서 사라졌다', () => {
  for (const f of ['js/plaza/copy.js', 'js/plaza/ui.js', 'js/i18n-en.js']) {
    assert.ok(!readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').includes("'있는 만큼'"), f);
  }
});

test('copy.js 에 자리표시 <확정 이 남지 않는다', () => {
  assert.ok(!readFileSync(new URL('../js/plaza/copy.js', import.meta.url), 'utf8').includes('<확정'));
});

test('doors.js 프롬프트가 확정 문구와 같다', () => {
  const doors = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');
  for (const s of Object.values(PLAZA_COPY.prompt)) assert.ok(doors.includes(`'${s}'`), `doors.js 에 ${s} 없음`);
});

const SHOWN = [
  ...Object.values(PLAZA_COPY.prompt), PLAZA_COPY.title, ...PLAZA_COPY.buttons, giveText(18), giveText(3), giveText(0),
  ...Object.keys(PLAZA_COPY.toast).map(k => toastText(k, 'wood', 3)), toastText('ok', 'coal', 1), toastText('ok', 'stone', 12),
  ...[1, 2, 3].map(s => subtitleText(s, STAGE2)), PLAZA_STAGE_NAMES[4],
  '오늘 7개 더 보탤 수 있어요', '오늘 18개 더 보탤 수 있어요',
  ...PLAZA_TIERS.map(x => tierLabel(x.id)), nextTierText(nextTier(34)), nextTierText(nextTier(0)), nextTierText(nextTier(120)),
];
for (const ko of SHOWN) {
  test(`영어 모드에서 한국어가 안 남는다: ${ko}`, () => {
    const en = t(ko);
    assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
  });
}
