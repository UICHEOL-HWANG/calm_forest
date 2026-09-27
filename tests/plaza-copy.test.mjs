import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAZA_COPY, fill, toastText, subtitleText, nextTierText, tierLabel, stagePct, giveText } from '../js/plaza/copy.js';
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

test('익명(게스트) 기부 거절 문구 login — auth 와 같은 안내', () => {
  assert.equal(PLAZA_COPY.toast.login, PLAZA_COPY.toast.auth);
  assert.equal(PLAZA_COPY.toast.login, '로그인하면 함께 지을 수 있어요');
});

test('게이트 D 확정 문구 — 좌판·명판·환전(전부 A안)', () => {
  assert.deepEqual(PLAZA_COPY.stall, {
    title: '🍂 수확제 좌판', sub: '가진 단풍잎 🍂{0}', buy: '🍂{0} 사기',
    bought: '보관함에 넣었어요 — 작업대 장식 탭에서 꺼내 놓아요 🧺',
    leaf: '단풍잎이 모자라요 — 광장에 보태면 🍂 을 받아요', item: '지금은 팔지 않아요',
  });
  assert.deepEqual(PLAZA_COPY.plaque, {
    title: '🌾 광장 명판', sub: '광장을 함께 지은 이웃 {0}명', mine: '내 등급 {0}', claim: '🎁 보상 받기',
    claimed: '받았어요 — 🧺 보관함을 확인해 보세요', claimedBtn: '받았어요', none: '10개 이상 보탠 분께 드려요',
  });
  assert.equal(fill(PLAZA_COPY.convert.done, 12, 24), '수확제가 끝났어요 🍂12 → 🪙24');
  assert.equal(PLAZA_COPY.stall.title, PLAZA_COPY.prompt.stall);   // 근접 프롬프트와 모달 제목이 같다
});

test('게이트 D 확정 — 장식 4종 이름·설명, 배지, 토큰 이름 단풍잎', () => {
  const src = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
  for (const [id, name, desc] of [['haybale', '볏단', '수확제 좌판에서 산 볏단'], ['pumpkins', '호박 더미', '수확제 좌판에서 산 호박 더미'],
    ['pumpkinlamp', '호박 등불', '수확제 광장 🥈 보상 — 밤에 은은히'], ['harvestscarecrow', '수확제 허수아비', '수확제 광장 🥇 보상']]) {
    assert.match(src, new RegExp(`id: '${id}',\\s+name: '${name}',.*desc: '${desc}', hidden: true`), id);
  }
  assert.ok(!src.includes('<확정'), 'catalog.js 에 <확정 주석이 남았다');
  const dex = readFileSync(new URL('../js/data/dex.js', import.meta.url), 'utf8');
  assert.ok(dex.includes("{ id: 'harvest_helper', name: '수확제 일꾼', ico: '🌾', desc: '수확제 광장에 10개 이상 보태기', reward: { coins: 20 } }"));
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.ok(game.includes("leaf: '🍂단풍잎' }"));
  for (const f of ['js/game.js', 'js/i18n-en.js', 'js/plaza/copy.js', 'js/data/catalog.js']) {
    assert.ok(!readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').includes('수확제 잎사귀'), f);
  }
});

test('옛 문구 있는 만큼 은 광장 코드·사전에서 사라졌다', () => {
  for (const f of ['js/plaza/copy.js', 'js/plaza/ui.js', 'js/i18n-en.js']) {
    assert.ok(!readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').includes("'있는 만큼'"), f);
  }
});

test('copy.js 에 자리표시 <확정 이 남지 않는다', () => {
  assert.ok(!readFileSync(new URL('../js/plaza/copy.js', import.meta.url), 'utf8').includes('<확정'));
});

test('🦉 광장 초대 문구(Task 10 사용자 확정)', () => {
  assert.deepEqual(PLAZA_COPY.invite, {
    land: '🦉 의뢰 올빼미가 수확제 초대장을 물고 왔어요! 동쪽 돌길을 따라가 보세요',
    arrive: '🌾 수확제 광장에 왔어요! 🍂5 🪙10 — 기부함에 재료를 보태 보세요',
  });
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
  ...Object.values(PLAZA_COPY.stall).map(v => fill(v, 40)), ...Object.values(PLAZA_COPY.plaque).map(v => fill(v, 12)),
  fill(PLAZA_COPY.plaque.mine, tierLabel('gold')), fill(PLAZA_COPY.convert.done, 12, 24), '🍂단풍잎',
  '볏단', '수확제 좌판에서 산 볏단', '호박 더미', '수확제 좌판에서 산 호박 더미', '호박 등불', '수확제 광장 🥈 보상 — 밤에 은은히',
  '수확제 허수아비', '수확제 광장 🥇 보상', '수확제 일꾼', '수확제 광장에 10개 이상 보태기',
  PLAZA_COPY.invite.land, PLAZA_COPY.invite.arrive,
];
for (const ko of SHOWN) {
  test(`영어 모드에서 한국어가 안 남는다: ${ko}`, () => {
    const en = t(ko);
    assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
  });
}
