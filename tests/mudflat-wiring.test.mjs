import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const game = read('js/game.js');
const sea = read('js/spaces/sea.js');
const doors = read('js/spaces/doors.js');
const mud = read('js/spaces/mudflat.js');

test('the mudflat lives inside the sea space, far from every other instance', () => {
  assert.match(read('js/data/places.js'), /export const MUDFLAT = new THREE\.Vector3\(400, 0, 300\);/);
  assert.match(read('js/spaces/sea-pick.js'), /mudflat: \(o\) => enterMudflat\(o\)/);
});

test('sea branches hand control to the mudflat while it is active', () => {
  assert.match(sea, /if \(mudflat\.active\) return updateMudflat\(dt, t\);/);
  assert.match(sea, /if \(mudflat\.active\) return mudflatCamera\(camera, look, dt\);/);
  assert.match(sea, /export function exitSea\(\) \{\n  leaveMudflat\(\);/);
  assert.match(game, /if \(atSea\) \{ \(mudflat\.active \? mudflatAction : seaAction\)\(\); return; \}/);
  assert.match(game, /if \(mudflat\.active\) clampMudflat\(player\.position\);/);
  assert.match(game, /if \(atSea && \(seaRodMesh \|\| mudflat\.active\)\) return;/);
  assert.match(game, /place === 'sea' \? \(mudflat\.active \? MUDFLAT : SEA\)/);
  assert.match(game, /_wq\.get\('mudflat'\) === '1'/);
  assert.match(doors, /if \(mudflat\.active\) \{/);
  assert.match(doors, /else prompt = mudflatHint\(\);/);
  assert.match(mud, /hint: '🫧 방울 올라오는 구간에서 캐기'/);
  assert.match(mud, /const HINT_MS = 2500;/);
  assert.match(mud, /hintUntil = startMs \+ HINT_MS;/);
  assert.match(doors, /else prompt = seaPrompt\(\);\n    \$w\.nearDoor = nd;\n    const key = `\$\{nd \? '' : 'i\|'\}\$\{prompt\}`;\n    if \(key !== lastDoorPrompt\) \{ \$w\.lastDoorPrompt = key; ui\.setDoorPrompt\?\.\(prompt, \{ info: !nd \}\); \}/);
});

test('the mudflat holds a homi and uses its own homi motion without touching the shovel dig', () => {
  assert.match(mud, /buildHoe\(THREE, clayMat, /);
  assert.match(mud, /doPlayerAction\(wx, wz, 'homi'\)/);
  assert.doesNotMatch(mud, /playerArms\.[RL]\.pivot\.rotation/);
  assert.match(game, /\} else if \(playerArms && actKind === 'homi'\) \{/);
  assert.match(game, /actKind === 'dig' \? 1 \/ DIG_ANIM_DUR : actKind === 'homi' \? 1 \/ HOMI_ANIM_DUR : 2\.4/);
  const art = read('js/forage/hoe-art.js');
  assert.match(art, /export const HOE_DEFAULT = 'A3';/);
  assert.match(art, /export const HOE_FACE = -Math\.PI \/ 2;/);
  assert.match(mud, /HOE_VARIANTS\.includes\(hoe\) \? hoe : HOE_DEFAULT/);
  assert.match(game, /if \(hf\) hf\.body\.rotation\.y = hf\.rest \* \(1 - up \* k\);/);
});

test('every run is tracked from start to finish or abandon with one run_id', () => {
  assert.match(mud, /trackEvent\('forage_start', startEventParams\(ctx\)\)/);
  assert.match(mud, /trackEvent\('forage_result', resultEventParams\(/);
  assert.match(mud, /trackDiffAbandon\('mudflat', /);
  assert.match(mud, /sendForageRun\(forageRow\(/);
  assert.match(mud, /rollDifficulty\('mudflat'\)/);
  assert.match(mud, /reach: eff\.reach, missLimit: eff\.missLimit/);
  assert.match(mud, /return mudflat\.active && run && !run\.over \? speedMul : 1;/);
  assert.match(mud, /giveReward\(\{ \[sp\.key\]: 1, coins: sp\.coin \}, 'mudflat_dig', sp\.id\)/);
  const tax = read('docs/analysis/event-taxonomy.csv');
  assert.match(tax, /^forage_start,/m);
  assert.match(tax, /^forage_result,/m);
});

test('the mudflat sits in a curved bay with a rolling sea that follows the tide', async () => {
  assert.match(mud, /group\.add\(buildShore\(THREE, clayMat, \{ z0: MUD_Z0, z1: MUD_Z1 \}\)\);/);
  assert.match(mud, /sea = buildSea\(THREE, \{ mobile: IS_MOBILE \}\);/);
  assert.match(mud, /updateSea\(sea, t, front\);/);
  assert.doesNotMatch(mud, /BoxGeometry\(46, 1/);
  const { bayEdge } = await import('../js/forage/mudflat-shore.js');
  for (let z = -15; z <= 12; z += .5) assert.ok(bayEdge(z, 15) - 1.8 * 1.7 > 14, `bay edge clears the walk area at z=${z}`);
});
