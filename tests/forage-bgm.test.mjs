import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DIVE_BAR, MUDFLAT_BAR, diveBar, mudflatBar } from '../js/sound-forage.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

function fakeAudio() {
  const made = { osc: 0, starts: [] };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect: (n) => n, gain: param(), frequency: param(), delayTime: param(), Q: param(), type: '' });
  const c = {
    createOscillator: () => { made.osc++; return { ...node(), start: (t) => made.starts.push(t), stop() {} }; },
    createGain: node, createBiquadFilter: node, createDelay: node,
  };
  return { k: { c, out: node(), echo: node() }, made };
}

test('mudflat and dive bars schedule notes inside their own bar length', () => {
  for (const [fn, len, loop] of [[mudflatBar, MUDFLAT_BAR, 8], [diveBar, DIVE_BAR, 4]]) {
    for (let bar = 0; bar < loop; bar++) {
      const { k, made } = fakeAudio();
      fn(k, 10, bar);
      assert.ok(made.osc > 4, `bar ${bar} plays notes`);
      assert.ok(made.starts.every(t => t >= 10 && t < 10 + len / 1000), `bar ${bar} stays in its bar`);
    }
  }
  assert.ok(Math.abs(MUDFLAT_BAR - 1875) < 1);
  assert.ok(Math.abs(DIVE_BAR - 3333.33) < 1);
});

test('entering mudflat or dive switches the music and leaving brings the village theme back', () => {
  const snd = read('js/sound.js');
  assert.match(snd, /bgmTheme === 'mudflat' \? playMudflatBar : bgmTheme === 'dive' \? playDiveBar/);
  assert.match(snd, /bgmTheme === 'mudflat' \? MUDFLAT_BAR : bgmTheme === 'dive' \? DIVE_BAR/);
  for (const [file, theme] of [['js/spaces/mudflat.js', 'mudflat'], ['js/spaces/dive.js', 'dive']]) {
    const src = read(file);
    assert.match(src, new RegExp(`setBGMTheme\\('${theme}'\\);`));
    const leave = src.slice(src.indexOf(`export function leave`), src.indexOf('\n}\n', src.indexOf('export function leave')));
    assert.match(leave, /setBGMTheme\('main'\);/);
  }
});
