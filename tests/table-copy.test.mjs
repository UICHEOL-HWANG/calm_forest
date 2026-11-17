import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TABLE_COPY } from '../js/table/copy.js';
import { readFileSync } from 'node:fs';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const CAT = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8').split('export const RECIPES = [')[1].split('];')[0] + readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8').split('export const BUFF_META = {')[1].split('};')[0];
const RECIPES = [...CAT.matchAll(/\{ id: '(\w+)',\s*name: '([^']+)',\s*ico: '([^']+)', cost: \{([^}]*)\}/g)]
  .map(([, id, name, ico, cost]) => ({ id, name, ico, cost: Object.fromEntries([...cost.matchAll(/(\w+): (\d+)/g)].map(([, k, n]) => [k, +n])) }));
const BUFF_META = Object.fromEntries([...CAT.matchAll(/^\s+(speed|luck|chop|mine):\s+\{ ico: '([^']+)', name: '([^']+)'/gm)].map(([, k, ico, name]) => [k, { ico, name: name.trim() }]));
const strings = (o) => (typeof o === 'string' ? [o] : Object.values(o).flatMap(strings));
const fill = (s) => s.replace(/\{(\d)\}/g, (_, i) => String(30 + Number(i)));
const LABEL = { crop: '작물', fish: '물고기', egg: '달걀', forage: '채집물', flour: '🌾밀가루', juice: '🍷포도즙' };
const TIERS = ['최고의 맛', '훌륭한 맛', '무난한 맛', '아쉬운 맛'];
const english = (s) => {
  const en = t(s);
  assert.ok(!/[가-힣]/.test(en), `영어 없음: ${s} → ${en}`);
  assert.ok(!/\{\d/.test(en), `자리 남음: ${s} → ${en}`);
  return en;
};

test('초안 문구 그대로', () => {
  const { prompt, created, long, ...rest } = TABLE_COPY;
  assert.deepEqual(rest, {
    bookTitle: '📖 나의 요리책',
    bookHint: '빈 칸을 누르면 필요한 재료가 보여요',
    bookClose: '닫기',
    secDish: '요리',
    goKitchen: '주방으로',
    kitchenLocked: '🍳 주방이 열리면 만들 수 있어요',
    station: {
      kiln: '🔥 밀가루는 화덕에 밀을 넣어 두면 다음 날 나와요',
      vat: '🫙 포도즙은 발효통에 포도를 넣어 두면 다음 날 나와요',
    },
    biteBtn: '🥄 오늘의 한 입',
    biteTitle: '🥄 오늘의 한 입',
    biteHint: '먹을 요리를 하나 골라 주세요',
    biteEat: '먹기',
    biteLine: '{0}초 동안 힘이 나요',
    biteDone: '🥄 한 입 먹었어요. 힘이 조금 더 가요',
    bitToday: '오늘은 한 입 먹었어요. 내일 또 먹을 수 있어요',
    adMore: '한 입 더',
    stepTable: '🍽️ 마당에 식탁이 생겼어요. 가 보세요',
    stepBite: '🥄 오늘의 한 입을 먹어 보세요',
    stepBook: '📖 요리책에서 빈 칸을 눌러 보세요',
    goStepKitchen: '🍳 주방으로 가 보세요',
  });
});

test('문구 규칙: 엠대시·놀다·화살표 이모지 없음', () => {
  for (const s of strings(TABLE_COPY)) {
    assert.ok(!s.includes('—'), s);
    assert.ok(!/놀/.test(s), s);
    assert.ok(!/[⬅➡⬆⬇↗↘↙↖←→↑↓]/u.test(s), s);
  }
});

test('모든 문구는 숫자가 들어간 뒤에도 영어로 다 바뀐다', () => {
  for (const s of strings(TABLE_COPY)) english(fill(s));
  assert.equal(t('45초 동안 힘이 나요'), 'A boost for 45 seconds');
});

test('창에서 조합하는 줄도 영어로 다 바뀐다', () => {
  assert.equal(RECIPES.length, 11);
  assert.equal(Object.keys(BUFF_META).length, 4);
  for (const r of RECIPES) {
    for (const tier of TIERS) english(`${r.ico} ${r.name} · ${tier}`);
    const pieces = Object.entries(r.cost).map(([k, need]) => `${LABEL[k]} 0/${need}`);
    english(pieces.join(' · '));
    english([...pieces, TABLE_COPY.kitchenLocked].join(' · '));
    if (r.cost.flour) english([...pieces, TABLE_COPY.station.kiln].join(' · '));
    if (r.cost.juice) english([...pieces, TABLE_COPY.station.vat].join(' · '));
  }
  for (const m of Object.values(BUFF_META)) english(`${m.ico} ${m.name} · ${TABLE_COPY.biteLine.replace('{0}', 38)}`);
  assert.equal(t('작물 1/2 · 물고기 0/1'), 'Crop 1/2 · Fish 0/1');
});
