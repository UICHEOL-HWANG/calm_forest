import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICON_BY_ID } from '../js/icons/toss-icons.js';
import { iconById } from '../js/icons/index.js';

test('homi tiers and engraving options have their own game icons, not emoji', () => {
  for (const id of ['homi', 'homi_long', 'homi_eye', 'homi_gold', 'homi_opt_reach', 'homi_opt_eye', 'homi_opt_spare', 'homi_opt_feet']) {
    assert.match(ICON_BY_ID[id], /^<svg class="ti" viewBox="0 0 24 24" aria-hidden="true">/);
    assert.equal(iconById(id), ICON_BY_ID[id]);
  }
});
