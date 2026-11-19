import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRewarded } from '../js/ads/rewarded.js';
import { adBuildInfo } from '../js/ads/diag.js';

function make(available, arm = 'ad') {
  const events = [];
  const r = createRewarded({
    enabled: () => true, forceArm: () => arm, clientId: () => 'c', platform: 'android',
    provider: () => ({ available: () => available, show: async () => ({ result: 'complete' }) }),
    track: (name, p) => events.push([name, p]), translate: (s) => s, toast: () => {},
  });
  return { r, events };
}

test('diagnose sends the provider state once per session', () => {
  const { r, events } = make(false, 'control');
  r.diagnose({ build: '1.4.25(137)' });
  r.diagnose({ build: '1.4.25(137)' });
  assert.deepEqual(events, [['ad_provider_state', { enabled: true, available: false, arm: 'control', build: '1.4.25(137)' }]]);
});

test('diagnose reports a live provider', () => {
  const { r, events } = make(true);
  r.diagnose();
  assert.equal(events[0][1].available, true);
});

test('native build info comes from the Capacitor App plugin', async () => {
  const cap = () => ({ getInfo: async () => ({ version: '1.4.25', build: '137' }) });
  assert.deepEqual(await adBuildInfo({ platform: 'android', capPlugin: cap }), { build: '1.4.25(137)' });
  assert.deepEqual(await adBuildInfo({ platform: 'ios', capPlugin: () => undefined }), { build: 'no_app_plugin' });
  const broken = () => ({ getInfo: async () => { throw new Error('x'); } });
  assert.deepEqual(await adBuildInfo({ platform: 'ios', capPlugin: broken }), { build: 'error' });
  assert.deepEqual(await adBuildInfo({ platform: 'ios', capPlugin: () => ({ getInfo: async () => ({}) }) }), { build: 'no_version' });
  assert.deepEqual(await adBuildInfo({ platform: 'android', capPlugin: () => ({ getInfo: async () => ({ version: '1.4.25' }) }) }), { build: '1.4.25(?)' });
});

test('toss without a version API reports unknown', async () => {
  assert.deepEqual(await adBuildInfo({ platform: 'toss', loadSdk: async () => ({}) }), { build: 'toss-unknown' });
});

test('game.js swallows a failing diagnosis', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /rewarded\.diagnose\(info\); \}\)\.catch\(\(\) => \{\}\)/);
});

test('toss build info is the Toss app version', async () => {
  const loadSdk = async () => ({ getTossAppVersion: () => '5.230.0' });
  assert.deepEqual(await adBuildInfo({ platform: 'toss', loadSdk }), { build: 'toss-5.230.0' });
  assert.deepEqual(await adBuildInfo({ platform: 'toss', loadSdk: async () => { throw new Error('x'); } }), { build: 'error' });
});

test('web and itch are not diagnosed', async () => {
  assert.equal(await adBuildInfo({ platform: 'web' }), null);
  assert.equal(await adBuildInfo({ platform: 'itch' }), null);
});

test('game.js runs the diagnosis after the rewarded module is created', () => {
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /import \{ adBuildInfo \} from '\.\/ads\/diag\.js';/);
  assert.match(game, /adBuildInfo\(\{ platform: PLATFORM, capPlugin, loadSdk: loadTossSDK \}\)/);
  assert.match(game, /rewarded\.diagnose\(/);
});
