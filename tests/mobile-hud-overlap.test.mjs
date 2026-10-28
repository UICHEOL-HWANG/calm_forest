import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const mobileHud = read('js/hud/mobile-hud.js');
const sledHud = read('js/mountain/sled-hud.js');

test('touch: the cold gauge joins the right column instead of the top centre', () => {
  assert.match(mobileHud, /body\.is-touch #cold-hud \{[^}]*left: auto;[^}]*transform: none;[^}]*top: max\(var\(--rcol-bottom[^}]*var\(--qp-bottom/);
});

test('touch: the facility banner drops below the cold gauge while it shows', () => {
  assert.match(mobileHud, /body\.is-touch:not\(\.coaching\):has\(#cold-hud\.show\) #hint-banner:not\(\.slot-bottom\) \{[^}]*\+ 32px\)/);
});

test('sled run hides the story chip, quest panel, banner and proximity pill', () => {
  for (const id of ['story-chip', 'quest-panel', 'hint-banner', 'near-pill']) {
    assert.match(sledHud, new RegExp(`body\\.sled-run #${id}[,{ ]`), id);
  }
});

test('the world tree choice card hides the proximity pill', () => {
  assert.match(mobileHud, /body:has\(#mist-choice\.show\) #near-pill/);
});
