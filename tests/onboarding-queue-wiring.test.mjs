import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const game = read('js/game.js'), html = read('index.html'), npc = read('js/spaces/npc.js');

test('first-entry hint cards go through the modal queue', () => {
  const body = game.slice(game.indexOf('function firstHint('), game.indexOf('function firstHintBanner('));
  assert.match(body, /modalQueue\.request\(\{ kind: 'hint', key: 'hint-' \+ key,/);
  assert.doesNotMatch(body, /setTimeout/);
  assert.doesNotMatch(game, /firstHintRetries/);
});

test('the merchant welcome visit waits out the spotlight, E1 sheet and cutscenes', () => {
  assert.match(html, /tutorialOverlay\(\) \{ return !!spot\?\.active\(\) \|\| \['spot-on', 'intro-open', 'cine-open', 'e1-pending'\]/);
  assert.equal((npc.match(/ui\.anyModalOpen\?\.\(\) \|\| ui\.tutorialOverlay\?\.\(\)/g) || []).length, 3);
});

test('a banner on screen steps aside for a modal and comes back later', () => {
  assert.match(html, /if \(!ui\.anyModalOpen\(\)\) return;\n\s*hintBQ = enqueueBanner\(hintBQ, \{ \.\.\.item, burn: null \}\);\n\s*done\('modal'\);/);
  assert.match(html, /clearInterval\(watch\); clearInterval\(yieldT\);/);
});

test('the touch quest button intro runs through one busy check and keeps banners away', () => {
  assert.match(html, /const chipBusy = \(\) => chipIntroLive \|\| !document\.body\.classList\.contains\('playing'\) \|\| tutorialRunning\(\) \|\| ui\.anyModalOpen\(\) \|\| modalQueue\.due\(\)/);
  assert.match(html, /b\.contains\('quest-sheet-open'\) \|\| chipIntroLive/);
  assert.match(html, /Input\.markHintsSeen\(\[CHIP_INTRO_KEYS\[kind\]\]\); requestSave\(\);/);
  assert.match(game, /if \(!gameState\.character \|\| !gameState\.tutorialSeen\) gameState\.hintsSeen = \{ \.\.\.gameState\.hintsSeen, chipNew: 1 \};/);
});

test('first-visit lines use the place banner once per place', () => {
  assert.match(game, /if \(!gameState\.hintsSeen\[v\.key\] && at\(\)\) firstHintBanner\(v\.key, v\.ico, v\.title, v\.line\);/);
  assert.match(game, /syncUnlocks\(\); tickPlaceGuides\(gap\); tickFirstVisits\(\);/);
});

test('a skipped player without a house gets the house goal', () => {
  assert.match(game, /houseDue: \(\) => houseGoalDue\(gameState, document\.body\.classList\.contains\('coaching'\)\),/);
  assert.match(game, /house: \{ at: HOUSE_POS \}/);
});

test('the house goal waits behind mine and story goals and stays in the village', () => {
  const src = read('js/guide/goal-guide.js');
  const at = (re) => src.search(re);
  const house = at(/if \(deps\.houseDue\?\.\(\) && deps\.inVillage\(\)\) return \{ flow: 'house'/);
  assert.ok(house > 0);
  assert.ok(at(/if \(deps\.atMine\(\)\) \{/) < house);
  assert.ok(at(/if \(storyMemo && storyMemo\.where !== 'board'\)/) < house);
  assert.ok(at(/deps\.farmBranchDue\(\)\) return/) < house);
});
