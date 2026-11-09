import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGuide } from '../js/guide/runner.js';
import { portGuideSteps } from '../js/port/guide-steps.js';

const make = () => {
  let t = 0; const log = []; let finished = 0;
  const g = createGuide({
    flow: 'port',
    steps: [
      { id: 'a', text: 'A', target: () => null, done: c => c.a },
      { id: 'b', text: c => `B ${c.n}`, target: () => ({ x: 1, z: 2 }), done: c => c.b, expect: ['go'] },
    ],
    now: () => t, onStep: e => log.push(e), onDone: () => finished++,
  });
  return { g, log, adv: ms => { t += ms; }, finished: () => finished };
};

test('완료 조건을 만족할 때만 다음 단계로 가고 머문 시간을 기록한다', () => {
  const { g, log, adv } = make();
  assert.equal(g.current().id, 'a');
  g.tick({ a: false });
  assert.equal(g.index(), 0);
  adv(1500); g.tick({ a: true, b: false });
  assert.equal(g.current().id, 'b');
  assert.deepEqual(log, [{ flow: 'port', step: 1, ms: 1500 }]);
});

test('한 tick 에 여러 단계가 끝나면 모두 기록하고 끝나면 onDone 한 번', () => {
  const { g, log, adv, finished } = make();
  adv(200); g.tick({ a: true, b: true });
  assert.deepEqual(log.map(e => e.step), [1, 2]);
  assert.equal(g.active(), false);
  assert.equal(g.current(), null);
  assert.equal(finished(), 1);
  g.tick({ a: true, b: true });
  assert.equal(finished(), 1);
});

test('stop 하면 더 기록하지 않는다', () => {
  const { g, log } = make();
  g.stop(); g.tick({ a: true, b: true });
  assert.equal(log.length, 0);
  assert.equal(g.active(), false);
});

test('포구 안내는 12단계, 문구는 확정본 그대로', () => {
  const s = portGuideSteps();
  assert.deepEqual(s.map(x => x.id), ['walk', 'embark', 'move', 'spot', 'cast', 'bite', 'island', 'npc', 'collect', 'turnin', 'free', 'home']);
  const txt = (st, ctx = { device: 'phone', got: 0 }) => (typeof st.text === 'function' ? st.text(ctx) : st.text);
  assert.equal(txt(s[0]), '포구 섬 가는 배가 생겼어요. 부두로 가 보세요');
  assert.equal(txt(s[1]), '배에 타고 바다로 나가 볼까요?');
  assert.equal(txt(s[2]), '화면 왼쪽을 끌어 배를 움직여 보세요');
  assert.equal(txt(s[2], { device: 'pc' }), 'WASD나 방향키로 배를 움직여 보세요');
  assert.equal(txt(s[3]), '물결이 이는 곳이 낚시터예요. 다가가 보세요');
  assert.equal(txt(s[4]), '🎣 👆');
  assert.equal(txt(s[5]), '❗ ➜ 🎣 👆');
  assert.equal(txt(s[6]), '이제 포구 섬으로! 금색 화살표를 따라가세요');
  assert.equal(txt(s[7]), '❗가 뜬 수달 어부에게 말을 걸어 보세요');
  assert.equal(txt(s[8], { got: 2 }), '해변에 떠내려온 부표를 주워 오세요 (2/3)');
  assert.equal(txt(s[9]), '수달 어부에게 부표를 돌려주세요');
  assert.equal(txt(s[10]), '다른 주민도 도와 보세요. 돌아갈 땐 부두 끝으로');
  assert.equal(txt(s[11]), '마을 부두로 돌아가세요');
  for (const st of s) assert.doesNotMatch(txt(st), /—|놀/);
});

test('포구 안내 완료 조건은 ctx 만 보고 순서대로 넘어간다', () => {
  const s = portGuideSteps(), by = id => s.find(x => x.id === id);
  assert.equal(by('walk').done({ phase: 'village', nearPier: false }), false);
  assert.equal(by('walk').done({ phase: 'village', nearPier: true }), true);
  assert.equal(by('embark').done({ phase: 'sail' }), true);
  assert.equal(by('move').done({ moved: 5 }), false);
  assert.equal(by('move').done({ moved: 6 }), true);
  assert.equal(by('bite').done({ caught: 1 }), true);
  assert.equal(by('npc').done({ quest: 'avail' }), false);
  assert.equal(by('npc').done({ quest: 'active' }), true);
  assert.equal(by('collect').done({ got: 3 }), true);
  assert.equal(by('free').done({ phase: 'sail', dir: 1 }), false);
  assert.equal(by('free').done({ phase: 'sail', dir: -1 }), true);
  assert.equal(by('home').done({ done: true }), true);
  for (const id of ['embark', 'cast', 'bite', 'npc', 'collect', 'turnin', 'free']) assert.ok(by(id).expect?.length, id);
  assert.ok(by('walk').joy && by('move').joy);
  const tg = { pierEnd: 1, boat: 2, spot: 3, islandDock: 4, fisher: 5, item: 6, pierEndIsland: 7, villageDock: 8 };
  assert.deepEqual(s.map(x => x.target(tg)), [1, 2, 3, 3, 3, 3, 4, 5, 6, 5, 7, 8]);
});
