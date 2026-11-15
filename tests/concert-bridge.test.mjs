import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeConcertBridge } from '../js/concert/bridge.js';

const classes = new Set();
globalThis.document = { body: { classList: { add: (...c) => c.forEach(x => classes.add(x)), remove: (...c) => c.forEach(x => classes.delete(x)) } } };

const makeEnv = () => {
  const log = [];
  const player = { position: { set() {} }, rotation: { y: 0 } };
  return {
    log,
    getPlayer: () => player,
    getPlayerRig: () => ({}),
    setCameraRig: () => {},
    hideTool: (h) => log.push(['tool', h]),
    hideLabels: (h) => log.push(['labels', h]),
  };
};

const lastLabels = (env) => env.log.filter(e => e[0] === 'labels').at(-1)[1];

test('labels stay hidden every frame of a show and come back on exit', () => {
  const env = makeEnv();
  const { stage } = makeConcertBridge(env);
  stage.enter('drum');
  assert.equal(lastLabels(env), true);
  stage.update(0.016);
  stage.update(0.016);
  assert.equal(env.log.filter(e => e[0] === 'labels' && e[1] === true).length, 3);
  stage.exit();
  assert.equal(lastLabels(env), false);
});

test('the compass button and house nameplate are hidden while the show is open', () => {
  const css = readFileSync(new URL('../js/concert/style.js', import.meta.url), 'utf8');
  assert.match(css, /body\.concert-open #cam-reset-btn/);
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /const showHouseCue = .*!document\.body\.classList\.contains\('concert-open'\)/);
});
