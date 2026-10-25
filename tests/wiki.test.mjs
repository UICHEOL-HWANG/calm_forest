import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { loadWiki, WIKI_CATS } from '../scripts/lib/wiki/load-data.mjs';
import { parseContent, renderInline, toPlain, firstSentence, SECTION_ORDER } from '../scripts/lib/wiki/content.mjs';
import { renderDoc, renderCat, renderHome, searchIndex, buildIndex, docPath } from '../scripts/lib/wiki/render.mjs';
import { loadAllContent } from '../scripts/lib/wiki/build.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const wiki = await loadWiki();
const index = buildIndex(wiki.entries);

test('loadWiki: 81 문서 · 13 분류 · 영문명 전부', () => {
  assert.equal(wiki.entries.length, 81);
  assert.equal(wiki.cats.length, 13);
  assert.deepEqual(wiki.entries.filter(e => !e.nameEn).map(e => e.id), []);
});

test('loadWiki: 정보 상자 수치는 게임 데이터에서', () => {
  const buri = index.get('fish/sea_buri');
  assert.deepEqual(buri.facts.find(f => f[0] === '무게'), ['무게', '6 ~ 14kg']);
  assert.deepEqual(index.get('fish/rare').facts.find(f => f[0] === '날씨'), ['날씨', '비']);
  assert.deepEqual(index.get('ore/gem').facts.find(f => f[0] === '날씨'), ['날씨', '안개']);
  assert.equal(index.get('cook/lunchbox').facts.find(f => f[0] === '난이도')[1], '★★★');
});

test('parseContent: ## id 아래 ### 절', () => {
  const m = parseContent('## a\n### 개요\n첫 줄.\n\n둘째 문단.\n### 얻는 법\n여기서.\n## b\n### 개요\nB.\n### 얻는 법\nC.\n');
  assert.equal(m.get('a').get('개요'), '첫 줄.\n\n둘째 문단.');
  assert.equal(m.get('b').get('얻는 법'), 'C.');
});

test('renderInline: 링크 변환 · 이스케이프 · 깨진 링크는 throw', () => {
  const html = renderInline('<b> [[fish/sea_buri]] 와 [[npc/angler|할아버지]]', index);
  assert.match(html, /&lt;b&gt;/);
  assert.match(html, /<a href="\/wiki\/fish\/sea_buri">방어<\/a>/);
  assert.match(html, /<a href="\/wiki\/npc\/angler">할아버지<\/a>/);
  assert.throws(() => renderInline('[[fish/nope]]', index), /fish\/nope/);
});

test('firstSentence: 링크를 이름으로 풀고 첫 문장만', () => {
  assert.equal(firstSentence(toPlain('[[fish/sea_buri]]는 바다 물고기다. 둘째 문장.', index)), '방어는 바다 물고기다.');
});

test('renderDoc: 제목·canonical·정보 표·목차·BreadcrumbList·게임 버튼', () => {
  const secs = new Map([['개요', '방어는 바다터의 물고기다. 자주 문다.'], ['얻는 법', '부두에서 낚는다.']]);
  const html = renderDoc(index.get('fish/sea_buri'), secs, { index, entries: wiki.entries, cats: wiki.cats });
  assert.match(html, /<title>방어 · 고요위키<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/calmforest\.cloud\/wiki\/fish\/sea_buri"/);
  assert.match(html, /<meta name="description" content="방어는 바다터의 물고기다\."/);
  assert.match(html, /<th>무게<\/th><td>6 ~ 14kg<\/td>/);
  assert.match(html, /<td>Yellowtail<\/td>/);
  assert.match(html, /href="#s-1">1\. 개요/);
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.ok(ld['@graph'].some(n => n['@type'] === 'BreadcrumbList'));
  assert.match(html, /href="\/wiki\/fish\/sea_aji"/);
  assert.match(html, /게임에서 만나러 가기/);
  assert.doesNotMatch(html, /—/);
});

test('renderCat·renderHome·searchIndex', () => {
  const cat = renderCat(wiki.cats[0], wiki.entries.filter(e => e.cat === 'fish'), { cats: wiki.cats });
  assert.match(cat, /<title>물고기 · 고요위키<\/title>/);
  assert.equal((cat.match(/href="\/wiki\/fish\/[a-z_]+"/g) || []).length >= 11, true);
  const home = renderHome(wiki.cats, wiki.entries);
  assert.match(home, /<title>고요위키 · 고요한 숲 공식 위키<\/title>/);
  for (const c of WIKI_CATS) assert.match(home, new RegExp(`href="/wiki/${c.id}/"`));
  const idx = JSON.parse(searchIndex(wiki.entries, wiki.cats));
  assert.equal(idx.length, 81);
  assert.deepEqual(Object.keys(idx[0]).sort(), ['c', 'e', 'i', 'n', 'p']);
  assert.equal(docPath(index.get('fish/sea_buri')), '/wiki/fish/sea_buri');
});

test('본문: 모든 문서에 개요·얻는 법, 숫자·엠대시 없음, 링크 유효', () => {
  const content = loadAllContent();
  for (const e of wiki.entries) {
    const secs = content.get(`${e.cat}/${e.id}`);
    assert.ok(secs, `${e.cat}/${e.id} 본문 없음`);
    for (const need of ['개요', '얻는 법']) assert.ok(secs.get(need)?.trim(), `${e.cat}/${e.id} ${need}`);
    for (const [h, text] of secs) {
      assert.ok(SECTION_ORDER.includes(h), `${e.cat}/${e.id} 모르는 절 ${h}`);
      assert.doesNotMatch(text, /\d/, `${e.cat}/${e.id} ${h} 숫자`);
      assert.doesNotMatch(text, /—/, `${e.cat}/${e.id} ${h} 엠대시`);
      renderInline(text, index);
    }
  }
  const files = readdirSync(new URL('../wiki/content/', import.meta.url)).filter(f => f.endsWith('.md')).map(f => f.replace('.md', '')).sort();
  assert.deepEqual(files, WIKI_CATS.map(c => c.id).sort());
});

test('게임·안내서·가격표가 위키로 링크한다', () => {
  assert.match(read('index.html'), /href="https:\/\/calmforest\.cloud\/wiki\/"/);
  assert.match(read('pages/shop.template.html'), /href="\/wiki\/"/);
  assert.match(read('scripts/lib/guide-page.mjs'), /href="\/wiki\/"/);
  assert.ok(existsSync(new URL('../wiki/wiki.css', import.meta.url)));
});

test('wiki.js: 한글 조합 중 Enter 무시 · 실패 캐시 안 함', () => {
  const js = read('wiki/wiki.js');
  assert.match(js, /ev\.isComposing/);
  assert.match(js, /data = null/);
});

test('위키: GA4 태그와 게임 링크 UTM', () => {
  const secs = new Map([['개요', '방어는 바다 물고기다.'], ['얻는 법', '낚는다.']]);
  const doc = renderDoc(index.get('fish/sea_buri'), secs, { index, entries: wiki.entries, cats: wiki.cats });
  assert.match(doc, /googletagmanager\.com\/gtag\/js\?id=G-ELBTR8BXBF/);
  assert.match(doc, /gtag\('config', 'G-ELBTR8BXBF'\)/);
  assert.match(doc, /class="wk-cta" href="\/\?utm_source=wiki&amp;utm_medium=referral&amp;utm_campaign=fish_sea_buri"/);
  assert.match(doc, /class="wk-foot"><a href="\/\?utm_source=wiki&amp;utm_medium=referral&amp;utm_campaign=fish_sea_buri"/);
  const home = renderHome(wiki.cats, wiki.entries);
  assert.match(home, /utm_campaign=wiki_home/);
  const cat = renderCat(wiki.cats[0], wiki.entries.filter(e => e.cat === 'fish'), { cats: wiki.cats });
  assert.match(cat, /utm_campaign=cat_fish/);
});
