import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWiki, WIKI_CATS, WIKI_DATA_FILES } from '../scripts/lib/wiki/load-data.mjs';
import { renderDoc, renderCat, renderHome, buildIndex } from '../scripts/lib/wiki/render.mjs';
import { loadAllContent } from '../scripts/lib/wiki/build.mjs';
import { buildBacklinks } from '../scripts/lib/wiki/guides.mjs';
import { ENTRY_TIPS } from '../scripts/lib/wiki/guides-tips.mjs';
import { CAT_GUIDES } from '../scripts/lib/wiki/guides-text.mjs';
import { REWARD_DECOR } from '../js/data/reward-decor.js';
import { TIERS } from '../js/referral/rules.js';

const wiki = await loadWiki();
const index = buildIndex(wiki.entries);
const content = loadAllContent();
const ctx = { index, entries: wiki.entries, cats: wiki.cats, backlinks: buildBacklinks(content, index) };
const gifts = wiki.entries.filter(e => e.cat === 'gift');
const fact = (id, k) => index.get(`gift/${id}`).facts.find(f => f[0] === k)?.[1];

test('선물 꾸미기 분류가 보상 꾸미기 데이터 전부를 문서로 싣는다', () => {
  const cat = WIKI_CATS.find(c => c.id === 'gift');
  assert.equal(cat.name, '선물 꾸미기');
  assert.deepEqual(gifts.map(e => e.id), REWARD_DECOR.map(d => d.id));
  assert.deepEqual(gifts.map(e => e.ico), REWARD_DECOR.map(d => d.ico));
  assert.ok(WIKI_DATA_FILES.includes('js/data/reward-decor.js'));
  assert.ok(WIKI_DATA_FILES.includes('js/referral/rules.js'));
});

test('선물 꾸미기 정보 표는 지급 규칙 데이터에서 나온다', () => {
  const arch = TIERS.find(t => t.item === 'friendarch').need;
  assert.equal(fact('friendarch', '구분'), '친구 초대 보상');
  assert.equal(fact('friendarch', '받는 조건'), `초대한 친구 ${arch}명`);
  const signup = REWARD_DECOR.filter(d => d.reward === 'signup').length;
  assert.equal(fact('giftsprout', '구분'), '가입 선물');
  assert.equal(fact('giftsprout', '받는 조건'), '새 계정 가입');
  assert.equal(fact('giftsprout', '지급'), `가입 선물 ${signup}가지 가운데 무작위 하나`);
  assert.equal(fact('promoballoon', '지급'), undefined);
  assert.equal(fact('promoballoon', '구분'), '링크 선물');
  assert.equal(fact('promosuitcase', '받는 조건'), '선물 코드를 받은 뒤 로그인');
  for (const e of gifts) {
    assert.equal(fact(e.id, '보관'), '작업대 🧺 보관함');
    assert.equal(fact(e.id, '놓는 곳'), '마당');
    assert.equal(fact(e.id, '판매'), '팔지 않음');
  }
});

test('선물 꾸미기 문서와 분류 대문이 렌더되고 실제 코드 값은 없다', () => {
  const doc = renderDoc(index.get('gift/promoballoon'), content.get('gift/promoballoon'), ctx);
  assert.match(doc, /<title>꼬마 열기구 · 고요위키<\/title>/);
  assert.match(doc, /<th>받는 조건<\/th><td>선물 코드를 받은 뒤 로그인<\/td>/);
  assert.match(doc, /꼬마 열기구는 어떻게 받아요\?/);
  const cat = renderCat(WIKI_CATS.find(c => c.id === 'gift'), gifts, ctx);
  assert.match(cat, /<title>선물 꾸미기 · 고요위키<\/title>/);
  assert.match(cat, /<meta name="description" content="고요한 숲의 선물 꾸미기 6가지를 한눈에\. 이름을 누르면 받는 조건과 놓는 법을 볼 수 있어요\."/);
  assert.match(cat, /<td>링크 선물 · 선물 코드를 받은 뒤 로그인<\/td>/);
  assert.doesNotMatch(cat, /도감 한눈에 보기|만날 수 있다/);
  for (const html of [doc, cat]) assert.doesNotMatch(html, /QAPROMO|[?&]gift=|\/g\/[A-Z0-9]/);
  const home = renderHome(wiki.cats, wiki.entries);
  assert.match(home, /열네 개 분류/);
  assert.match(home, /href="\/wiki\/gift\/"/);
});

test('친구 초대 단계 문구는 TIERS 와 맞고 공략 메모가 여섯 문서 모두 있다', () => {
  const word = { 1: '첫', 3: '세 번째', 5: '다섯 번째' };
  assert.deepEqual(TIERS.map(t => t.need), [1, 3, 5]);
  const tiers = CAT_GUIDES.gift.find(([h]) => h === '친구 초대 보상 단계')[1];
  for (const t of TIERS) assert.ok(tiers.includes(`${word[t.need]} 친구에게`), t.item);
  assert.match(content.get('gift/friendarch').get('얻는 법'), /세 명이 되면/);
  for (const e of gifts) assert.ok(ENTRY_TIPS[`gift/${e.id}`], e.id);
});
