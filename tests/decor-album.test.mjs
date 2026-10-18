import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { albumView, albumHtml } from '../js/decor-drops/album.js';
import { DECOR_SETS } from '../js/data/decor-sets.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const HTML = read('../index.html');
const IX = read('../js/decor-drops/index.js');
const info = (id) => ({ name: `name-${id}`, ico: '🎁' });

test('view lists 6 sets in order with progress and owned chips', () => {
  const v = albumView(['picnicBasket', 'teaBowl', 'teaCake'], info);
  assert.deepEqual(v.sets.map(s => s.id), DECOR_SETS.map(s => s.id));
  const picnic = v.sets[0], tea = v.sets[1];
  assert.equal(picnic.n, 1);
  assert.equal(picnic.complete, false);
  assert.deepEqual(picnic.items.map(i => i.owned), [true, false]);
  assert.equal(tea.complete, true);
  assert.equal(picnic.thumb, 'assets/decor-sets/picnic.jpg');
  assert.deepEqual(picnic.from.map(f => f.place), ['과수원', '요리']);
});

test('html has 6 set cards, a coming-soon card, done class only for complete sets', () => {
  const html = albumHtml(albumView(['teaBowl', 'teaCake'], info));
  assert.equal((html.match(/class="da-set( done)?"/g) || []).length, 6);
  assert.equal((html.match(/class="da-set done"/g) || []).length, 1);
  assert.equal((html.match(/class="da-soon"/g) || []).length, 1);
  assert.ok(html.includes('🎣 곧 만나요'));
  assert.ok(html.includes('2/2') && html.includes('0/2'));
  assert.ok(html.includes('da-chip got'));
});

test('no numeric odds in the album', () => {
  const html = albumHtml(albumView([], info));
  assert.doesNotMatch(html, /\d\s*%|확률이 \d/);
});

test('menu button and panel exist and open through openDecorAlbum', () => {
  assert.match(HTML, /<button id="decor-set-btn"><span class="uico">🎁<\/span><span class="ulbl">꾸미기 세트<\/span><\/button>/);
  assert.equal((HTML.match(/id="decor-btn"/g) || []).length, 1, 'decor-btn id must stay unique');
  assert.match(HTML, /\$\('decor-set-btn'\)\.addEventListener\('click', \(\) => openDecorAlbum\('menu'\)\)/);
  assert.match(HTML, /<div id="decor-album" aria-hidden="true">/);
  assert.match(HTML, /openDecorAlbum\(html\) \{/);
  assert.match(IX, /trackEvent\('decor_album_open', \{ src: from \}\)/);
  assert.match(IX, /ui\.openDecorAlbum\?\.\(albumHtml\(albumView\(/);
});

test('menu label translates', () => {
  assert.match(read('../js/i18n-en.js'), /'꾸미기 세트': 'Decor Sets'/);
});

test('album blocks game keys, closes on Escape and suppresses other banners', () => {
  assert.match(HTML, /function closeDecorAlbum\(\) \{/);
  assert.match(HTML, /if \(!\$\('decor-album'\)\.classList\.contains\('show'\)\) return;\n\s*if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); closeDecorAlbum\(\); \}\n\s*e\.stopPropagation\(\);/);
  assert.match(HTML, /\$\('decor-close'\)\.addEventListener\('click', closeDecorAlbum\)/);
  assert.match(read('../js/game.js'), /if \(b\.classList\.contains\('decor-open'\)\) return 'decor';/);
  assert.match(read('../js/app-banner-ui.js'), /'guide-open', 'decor-open',/);
});
