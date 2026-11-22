import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { TOOL_THEMES, SKIN_TOOLS, themeOf } from '../js/cosmetics/tool-skin-rules.js';
import { buildToolSkin, buildUmbrella } from '../js/cosmetics/tool-skins.js';
import { OW } from '../js/cosmetics/tool-skins-owl.js';
import { HG } from '../js/cosmetics/tool-skins-hedgehog.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const FILES = { owl: '../js/cosmetics/tool-skins-owl.js', hedgehog: '../js/cosmetics/tool-skins-hedgehog.js', kit: '../js/cosmetics/tool-skins-critter-kit.js' };
const verts = g => { let n = 0; g.traverse(o => { if (o.isMesh) n += o.geometry.attributes.position.count; }); return n; };

test('owl and hedgehog are tool themes with catalog ids, wired like frog', () => {
  assert.deepEqual(TOOL_THEMES.slice(-2), ['owl', 'hedgehog']);
  const ts = read('../js/cosmetics/tool-skins.js');
  for (const t of ['owl', 'hedgehog']) {
    const UP = t.toUpperCase();
    assert.equal(themeOf(`tools_${t}`), t);
    assert.match(ts, new RegExp(`import \\{ ${t}Themes, ${UP}_UMBRELLA, ${t}UmbrellaLook \\} from './tool-skins-${t}\\.js'`));
    assert.match(ts, new RegExp(`\\[${t}Themes, ${t}UmbrellaLook, '${t}'\\]`));
    assert.match(ts, new RegExp(`${t}: ${UP}_UMBRELLA`));
  }
});

test('every tool and the umbrella bake within the frog-level vertex budget', () => {
  const frog = Math.max(...SKIN_TOOLS.map(id => verts(buildToolSkin(THREE, 'frog', id))));
  for (const t of ['owl', 'hedgehog']) {
    for (const id of SKIN_TOOLS) {
      const g = buildToolSkin(THREE, t, id);
      assert.ok(g?.children.length > 0, `${t}.${id}`);
      assert.ok(verts(g) <= frog, `${t}.${id} ${verts(g)} > ${frog}`);
    }
    const u = buildUmbrella(THREE, t);
    assert.ok(u?.children.length > 0 && verts(u) <= verts(buildUmbrella(THREE, 'frog')), `${t} umbrella ${verts(u)}`);
  }
});

test('handle tools keep the critter above the paw grip', () => {
  for (const t of ['owl', 'hedgehog']) for (const id of ['axe', 'hoe', 'sickle', 'shovel', 'hammer', 'net']) {
    const box = new THREE.Box3().setFromObject(buildToolSkin(THREE, t, id));
    assert.ok(box.max.y > 0.5, `${t}.${id}`);
  }
});

test('colors stay under bloom, eyes carry lift, no glow, no comments', () => {
  for (const [k, c] of [...Object.entries(OW), ...Object.entries(HG)]) assert.ok(luma(c) <= 0.85, `${k} ${luma(c).toFixed(3)}`);
  for (const f of Object.values(FILES)) {
    const src = read(f);
    assert.doesNotMatch(src, /glow:|emissive/);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
    assert.doesNotMatch(src, /TOOL_GRIP|TOOL_QREST|SLASH|slashPhase|sims\//);
  }
  assert.match(read(FILES.kit), /const lift = o\.lift \?\? 0\.3;/);
});
