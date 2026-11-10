import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const {
  FORGE_COPY, EFFECT_LABEL, SHORT_NAME, METER, effectValue, effectText, upgradeLabel, pendingTag, gameTitle,
  refundLine, foretell, doneToast, iga, eulo,
} = await import('../js/workbench/copy.js');
const { STAR_TOOLS, STAR_EFFECT } = await import('../js/workbench/rules.js');

const NAMES = { rod: '튼튼한 낚싯대', water: '큰 물조리개', pot: '큰 냄비', net: '촘촘한 포충망', hammer: '묵직한 망치' };

test('approved copy, candidate 1', () => {
  assert.equal(upgradeLabel(2), '🔨 ★2로 강화하기');
  assert.equal(FORGE_COPY.note, '망치질 5번 · 내일 아침 완성 · 그동안도 쓸 수 있어요');
  assert.equal(pendingTag(2), '🌙 ★2 내일');
  assert.equal(FORGE_COPY.max, '최고 별이에요');
  assert.equal(FORGE_COPY.noTool, '먼저 만들어야 별을 달 수 있어요');
  assert.equal(FORGE_COPY.busy, '모루에 다른 도구가 있어요');
  assert.equal(gameTitle('rod', 2), '🔨 낚싯대 ★2 강화');
  assert.equal(FORGE_COPY.ringHint, '고리가 금색 원에 닿을 때 탭해요');
  assert.deepEqual(FORGE_COPY.judge, ['빗나감', '좋아요!', '완벽!']);
  assert.equal(FORGE_COPY.resultTitle, '좋은 망치질이에요!');
  assert.equal(refundLine(48), '🪙 48 돌려받았어요');
  assert.equal(foretell(2), '🌙 내일 아침 ★2가 돼요. 그동안도 쓸 수 있어요');
  assert.equal(doneToast('🎣', '튼튼한 낚싯대', 2), '🎣 튼튼한 낚싯대가 ★2가 됐어요');
});

test('particles follow the final sound', () => {
  assert.equal(upgradeLabel(1), '🔨 ★1로 강화하기');
  assert.equal(upgradeLabel(3), '🔨 ★3으로 강화하기');
  assert.equal(foretell(1), '🌙 내일 아침 ★1이 돼요. 그동안도 쓸 수 있어요');
  assert.equal(foretell(3), '🌙 내일 아침 ★3이 돼요. 그동안도 쓸 수 있어요');
  assert.equal(doneToast('🦋', '촘촘한 포충망', 1), '🦋 촘촘한 포충망이 ★1이 됐어요');
  assert.equal(iga('망치'), '가');
  assert.equal(iga('포충망'), '이');
  assert.equal(eulo('★1'), '로');
  assert.equal(eulo('★3'), '으로');
});

test('effect values read like the sim', () => {
  assert.equal(effectValue('rod', 2.6), '2.6초');
  assert.equal(effectValue('rod', 3.0), '3.0초');
  assert.equal(effectValue('water', 2.25), '×2.25');
  assert.equal(effectValue('pot', 2.0), '2배');
  assert.equal(effectValue('pot', 1.65), '1.65배');
  assert.equal(effectValue('net', 0.18), '+18%');
  assert.equal(effectValue('hammer', 0.7), '30% 덜');
  assert.equal(effectValue('hammer', 0.55), '45% 덜');
  assert.equal(effectText('rod', 3.0), '입질 여유 3.0초');
  assert.equal(effectText('net', 0.18), '포획 +18%');
  assert.equal(effectText('hammer', 0.7), '목재 30% 덜');
});

test('copy has no banned characters', () => {
  const all = [
    ...Object.values(FORGE_COPY).flat(), ...Object.values(EFFECT_LABEL), ...Object.values(SHORT_NAME),
    ...METER.flatMap(m => [m.label, m.rate]),
    ...[1, 2, 3].flatMap(n => [upgradeLabel(n), pendingTag(n), foretell(n), refundLine(n * 10)]),
  ];
  for (const s of all) {
    assert.doesNotMatch(s, /—/, s);
    assert.doesNotMatch(s, /놀다|놀아요/, s);
    assert.doesNotMatch(s, /[←-⇿⬅-⬇➡]/, s);
  }
});

test('every forge string has an English translation', () => {
  const all = [
    ...Object.values(FORGE_COPY).flat(), ...Object.values(EFFECT_LABEL), ...Object.values(SHORT_NAME),
    ...METER.flatMap(m => [m.label, m.rate]),
  ];
  for (const n of [1, 2, 3]) {
    all.push(upgradeLabel(n), pendingTag(n), foretell(n), refundLine(n * 24));
    for (const tool of STAR_TOOLS) all.push(gameTitle(tool, n), doneToast('🔨', NAMES[tool], n));
  }
  for (const tool of STAR_TOOLS) {
    for (const v of STAR_EFFECT[tool]) all.push(effectValue(tool, v), effectText(tool, v));
  }
  for (const s of all) assert.doesNotMatch(t(s), /[가-힣]/, `${s} => ${t(s)}`);
});

test('english reads naturally', () => {
  assert.equal(t(upgradeLabel(3)), '🔨 Upgrade to ★3');
  assert.equal(t(doneToast('🎣', '튼튼한 낚싯대', 2)), '🎣 Sturdy Fishing Rod is now ★2');
  assert.equal(t(refundLine(48)), '🪙 48 back');
});
