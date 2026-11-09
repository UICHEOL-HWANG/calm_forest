import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWiki, WIKI_CATS } from '../scripts/lib/wiki/load-data.mjs';
import { renderDoc, renderCat, renderHome, buildIndex } from '../scripts/lib/wiki/render.mjs';
import { loadAllContent } from '../scripts/lib/wiki/build.mjs';
import { categoryGuide, entryGuide, buildBacklinks } from '../scripts/lib/wiki/guides.mjs';
import { josa } from '../scripts/lib/wiki/faq.mjs';
import { renderInline } from '../scripts/lib/wiki/content.mjs';

const wiki = await loadWiki();
const index = buildIndex(wiki.entries);
const content = loadAllContent();
const backlinks = buildBacklinks(content, index);
const ctx = { index, entries: wiki.entries, cats: wiki.cats, backlinks };
const plainLen = (s) => s.replace(/\[\[[^\]|]+\|?([^\]]*)\]\]/g, '$1').replace(/\s/g, '').length;
const catEntries = (id) => wiki.entries.filter(e => e.cat === id);

test('분류 대문: 13개 모두 공략 절 8개 이상, 본문 1000자 이상', () => {
  for (const cat of WIKI_CATS) {
    const sections = categoryGuide(cat.id, catEntries(cat.id));
    assert.ok(sections.length >= 8, `${cat.id} 절 ${sections.length}`);
    const total = sections.reduce((n, [, t]) => n + plainLen(t), 0);
    assert.ok(total >= 1000, `${cat.id} ${total}자`);
  }
});

test('개별 문서: 81개 모두 공략 메모 300자 이상, 페이지 전체 450자 이상', () => {
  for (const e of wiki.entries) {
    const total = entryGuide(e, wiki.entries, backlinks).reduce((n, p) => n + plainLen(p), 0);
    assert.ok(total >= 300, `${e.cat}/${e.id} 공략 ${total}자`);
    const body = [...content.get(`${e.cat}/${e.id}`).values()].reduce((n, t) => n + plainLen(t), 0);
    assert.ok(body + total >= 450, `${e.cat}/${e.id} 본문+공략 ${body + total}자`);
  }
});

test('공략 문장: 링크 유효 · 엠대시 · 금지어 · 깨진 조사 없음', () => {
  const texts = [];
  for (const cat of WIKI_CATS) for (const [h, t] of categoryGuide(cat.id, catEntries(cat.id))) texts.push([`${cat.id} ${h}`, h + t]);
  for (const e of wiki.entries) for (const p of entryGuide(e, wiki.entries, backlinks)) texts.push([`${e.cat}/${e.id}`, p]);
  for (const [where, t] of texts) {
    renderInline(t, index);
    assert.doesNotMatch(t, /—/, `${where} 엠대시`);
    assert.doesNotMatch(t, /놀(다|아|았|고|자|며)/, `${where} 놀다`);
    assert.doesNotMatch(t, /시간는|날씨는는|undefined|NaN|\[object/, `${where} 깨진 문장`);
  }
});

test('링크 뒤 조사가 이름의 받침과 맞는다', () => {
  const texts = [];
  for (const cat of WIKI_CATS) for (const [h, t] of categoryGuide(cat.id, catEntries(cat.id))) texts.push(t);
  for (const e of wiki.entries) for (const p of entryGuide(e, wiki.entries, backlinks)) texts.push(p);
  const bad = [];
  for (const t of texts) {
    for (const m of t.matchAll(/\[\[([a-z]+\/[a-z0-9_]+)\]\](은|는|이|가|을|를|와|과|으로|로)(?![가-힣])/g)) {
      const name = index.get(m[1]).name;
      const pairs = { 은: '은/는', 는: '은/는', 이: '이/가', 가: '이/가', 을: '을/를', 를: '을/를', 와: '과/와', 과: '과/와', 으로: '으로/로', 로: '으로/로' };
      const want = josa(name, pairs[m[2]]).slice(name.length);
      if (want !== m[2]) bad.push(`${name}${m[2]} -> ${name}${want}`);
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('문서 이름 뒤 조사가 받침과 맞는다 (본문 평문)', () => {
  const pairs = { 은: '은/는', 는: '은/는', 이: '이/가', 가: '이/가', 을: '을/를', 를: '을/를', 와: '과/와', 과: '과/와' };
  const bad = [];
  for (const e of wiki.entries) {
    const re = new RegExp(`(?<![가-힣])${e.name}(은|는|이|가|을|를|와|과)(?![가-힣])`, 'g');
    for (const p of entryGuide(e, wiki.entries, backlinks)) {
      for (const m of p.replace(/\[\[[^\]]+\]\]/g, '#').matchAll(re)) {
        const want = josa(e.name, pairs[m[1]]).slice(e.name.length);
        if (want !== m[1]) bad.push(`${e.name}${m[1]} -> ${want}`);
      }
    }
  }
  assert.deepEqual([...new Set(bad)], []);
});

test('개별 문서: 같은 분류 안에서 공략 문단이 그대로 반복되지 않는다', () => {
  for (const cat of WIKI_CATS) {
    const seen = new Map();
    for (const e of catEntries(cat.id)) {
      for (const p of entryGuide(e, wiki.entries, backlinks)) {
        const key = p.replace(/\[\[([a-z]+\/[a-z0-9_]+)\]\]/g, (_, r) => index.get(r).name);
        if (seen.has(key)) assert.fail(`${cat.id}: ${seen.get(key)} 와 ${e.id} 문단 동일`);
        seen.set(key, e.id);
      }
    }
  }
});

test('명칭 변경: 배타기 · 광석 캐기, 옛 이름은 위키 HTML에 없다', () => {
  assert.equal(WIKI_CATS.find(c => c.id === 'river').name, '배타기');
  assert.equal(WIKI_CATS.find(c => c.id === 'dig').name, '광석 캐기');
  const htmls = [];
  for (const cat of wiki.cats) htmls.push(renderCat(cat, catEntries(cat.id), ctx));
  for (const e of wiki.entries) htmls.push(renderDoc(e, content.get(`${e.cat}/${e.id}`), ctx));
  for (const h of htmls) assert.doesNotMatch(h, /강가 줍기|땅속 보물/);
});

test('대문: 소개 · 읽는 순서 · 분류별 안내가 있고 링크가 유효하다', () => {
  const html = renderHome(wiki.cats, wiki.entries);
  assert.match(html, /고요위키 소개/);
  assert.match(html, /처음 시작했다면 이 순서로/);
  for (const c of wiki.cats) assert.match(html, new RegExp(`href="/wiki/${c.id}/"[^>]*>[^<]*${c.name}`));
  assert.doesNotMatch(html, /강가 줍기|땅속 보물/);
});

test('분류 대문 HTML: 공략 절 · 자주 묻는 질문 · 전체 목록이 함께 렌더된다', () => {
  for (const cat of wiki.cats) {
    const html = renderCat(cat, catEntries(cat.id), ctx);
    assert.match(html, /wk-cat-guide/);
    assert.match(html, /<h3>자주 묻는 질문<\/h3>/);
    assert.match(html, /전체 목록/);
    assert.doesNotMatch(html, /\[\[|\]\]/);
  }
});

test('🪙 값 뒤 으로/로가 수의 받침과 맞는다', () => {
  const texts = [];
  for (const cat of WIKI_CATS) for (const [, t] of categoryGuide(cat.id, catEntries(cat.id))) texts.push(t);
  for (const e of wiki.entries) for (const p of entryGuide(e, wiki.entries, backlinks)) texts.push(p);
  const bad = [];
  for (const t of texts) for (const m of t.matchAll(/(\d+🪙)(으로|로)(?![가-힣])/g)) if (josa(m[1], '으로/로') !== m[1] + m[2]) bad.push(m[0]);
  assert.deepEqual([...new Set(bad)], []);
});

test('순위 문장: 동점은 같은 순위, 깨진 문장 없음', () => {
  const stew = entryGuide(index.get('cook/veg_stew'), wiki.entries, backlinks).join(' ');
  const yam = entryGuide(index.get('cook/baked_yam'), wiki.entries, backlinks).join(' ');
  const rank = (t) => t.match(/카페 값이 ([^.]+)\./)[1];
  assert.equal(rank(stew), rank(yam));
  assert.match(rank(stew), /^[가-힣]+ 번째로 비싸다$/);
});
