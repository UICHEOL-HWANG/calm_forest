import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };

const C = await import('../js/decor-drops/copy.js');
const { DECOR_SETS, SRC_LIST, DROP_SOURCES } = await import('../js/data/decor-sets.js');
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const SRC = readFileSync(new URL('../js/decor-drops/copy.js', import.meta.url), 'utf8');
const CATALOG = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
const HAS_KO = /[가-힣]/;
const nameOf = (id) => CATALOG.match(new RegExp(`id: '${id}', name: '([^']+)'`))[1];

test('names and effects for all 6 sets, place for all 12 sources', () => {
  for (const s of DECOR_SETS) {
    assert.ok(C.SET_NAMES[s.id], s.id);
    assert.ok(C.SET_EFFECT[s.id], s.id);
  }
  for (const s of SRC_LIST) assert.ok(C.SRC_PLACE[s], s);
});

test('exact picked strings', () => {
  assert.equal(C.dropToast('소복 과일 바구니', 'picnic', 1), '🎁 소복 과일 바구니를 찾았어요. 오후의 피크닉 세트 1/2');
  assert.equal(C.dropToast('텃밭 한 그릇', 'teatime', 1), '🎁 텃밭 한 그릇을 찾았어요. 별빛 티타임 세트 1/2');
  assert.equal(C.setCompleteToast('picnic'), '✨ 오후의 피크닉 세트 완성! 식탁에 체크 식탁보가 깔렸어요');
  assert.equal(C.bannerCopy('picnic', 'orchard').line, '과수원에서 일정 확률로 나와요!');
  assert.equal(C.bannerCopy('picnic', 'orchard').title, '🎁 오후의 피크닉 세트');
});

test('no em dash and no numeric odds', () => {
  assert.doesNotMatch(SRC, /—/);
  assert.doesNotMatch(SRC, /\d\s*%|확률이 \d|\d+분의/);
});

test('every runtime string translates fully to English', () => {
  const runtime = [];
  for (const [src, d] of Object.entries(DROP_SOURCES)) {
    runtime.push(C.dropToast(nameOf(d.item), d.set, 1), C.dropToast(nameOf(d.item), d.set, 2));
    const b = C.bannerCopy(d.set, src);
    runtime.push(b.title, b.line, b.go);
  }
  for (const s of DECOR_SETS) {
    runtime.push(C.setCompleteToast(s.id), C.SET_NAMES[s.id]);
    for (const id of [...s.items, s.bonus]) runtime.push(nameOf(id));
  }
  runtime.push(C.ALBUM_COPY.title, C.ALBUM_COPY.lead, C.ALBUM_COPY.soon);
  for (const ko of runtime) assert.doesNotMatch(t(ko), HAS_KO, `${ko} → ${t(ko)}`);
});

test('english keeps the picked set names', () => {
  assert.equal(t('오후의 피크닉 세트'), 'Afternoon Picnic Set');
  assert.equal(t('한밤의 텃밭 세트'), 'Midnight Garden Set');
  assert.equal(t(C.dropToast('소복 과일 바구니', 'picnic', 1)), '🎁 Found a Heaped Fruit Basket! Afternoon Picnic Set 1/2');
});
