import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const IX = read('../js/decor-drops/index.js');
const HTML = read('../index.html');

const ENTRIES = [
  ['../js/spaces/mist.js', 'orchard', "trackEvent('orchard_enter'"],
  ['../js/game.js', 'cook', "trackEvent('kitchen_open')"],
  ['../js/spaces/visitors.js', 'crop', "trackEvent('enter_farm'"],
  ['../js/spaces/dream.js', 'dream', "trackEvent('dream_enter'"],
  ['../js/spaces/mountain.js', 'sled', "trackEvent('mountain_enter'"],
  ['../js/spaces/observatory.js', 'star', "trackEvent('observatory_enter')"],
  ['../js/spaces/mine.js', 'mine', "trackEvent('enter_mine')"],
  ['../js/spaces/carving.js', 'carve', "trackEvent('carve_start'"],
  ['../js/spaces/river.js', 'ferry', "trackEvent('boat_enter'"],
  ['../js/spaces/mist.js', 'mist', "trackEvent('mist_enter'"],
  ['../js/spaces/night-visit.js', 'duel', "trackEvent('night_trace'"],
  ['../js/spaces/doors.js', 'firefly', "trackEvent('zone_enter', { zone: 'glade'"],
];

test('each activity entry shows its set banner next to its entry event', () => {
  for (const [f, src, ev] of ENTRIES) {
    const s = read(f);
    const i = s.indexOf(ev);
    assert.ok(i >= 0, `${f} ${ev}`);
    const around = s.slice(Math.max(0, i - 300), i + 400);
    assert.ok(around.includes(`decorBanner('${src}')`), `${f} → decorBanner('${src}')`);
    assert.match(s, /import \{[^}]*\bdecorBanner\b[^}]*\} from '[./]+\/?decor-drops\/index\.js'/, `${f} import`);
  }
});

test('banner uses the hint banner queue with a set thumbnail and opens the album on tap', () => {
  const fn = IX.slice(IX.indexOf('export function decorBanner('));
  assert.match(fn, /bannerDue\(/);
  assert.match(fn, /ui\.showHintBanner\?\.\(\{/);
  assert.match(fn, /img: /);
  assert.match(fn, /onTap: \(\) => \{[^\n]*openDecorAlbum\('banner'\)/);
  for (const act of ['show', 'tap', 'dismiss']) assert.ok(fn.includes(`act: '${act}'`), act);
});

test('hint banner supports an optional image without changing other banners', () => {
  assert.match(HTML, /<img class="hb-img" id="hb-img" alt="" hidden>/);
  assert.match(HTML, /showHintBanner\(\{ ico, img, title,/);
  assert.match(HTML, /\$\('hb-img'\)\.hidden = !item\.img/);
  assert.match(HTML, /#hint-banner \.hb-img \{/);
});
