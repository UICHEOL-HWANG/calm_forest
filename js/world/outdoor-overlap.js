import { AFF_BOX, AFF_SOLID_K } from '../data/affinity-decor.js';
const SMALL = ['postlamp', 'scarecrow', 'spiritlamp', 'ghostlamp', 'pumpkinlamp', 'harvestscarecrow', 'promoballoon'];
const FLAT = ['path', 'flowerbed'];
const KILN_HALF = [1.01, 0.58];
const GAP = 0.05;

function box(x, z, hw, hd, ry) {
  const [a, b] = ry % 2 ? [hd, hw] : [hw, hd];
  return { x1: x - a, z1: z - b, x2: x + a, z2: z + b };
}

export function outdoorFootprint(id, x, z, ry, { cartBox, vatBox, cartId, suitcaseBox, defBox } = {}) {
  if (defBox) return box(x, z, defBox[0] / 2, defBox[1] / 2, ry);
  if (id === 'kiln') return box(x, z, KILN_HALF[0], KILN_HALF[1], ry);
  if (cartBox && id === cartId) return box(x, z, cartBox.w / 2, cartBox.d / 2, ry);
  if (vatBox && id === 'vat') return box(x, z, vatBox.w / 2, vatBox.d / 2, ry);
  if (suitcaseBox && id === 'promosuitcase') return box(x, z, suitcaseBox.w / 2, suitcaseBox.d / 2, ry);
  if (AFF_BOX[id]) return box(x, z, AFF_BOX[id].w * AFF_SOLID_K / 2, AFF_BOX[id].d * AFF_SOLID_K / 2, ry);
  if (SMALL.includes(id)) return { x, z, r: 0.22 };
  if (FLAT.includes(id)) return { x, z, r: 0.35 };
  return { x, z, r: 0.5 };
}

export function postCircles(posts, x, z, ry) {
  return posts.map(([px, pz, r]) => {
    const [a, b] = [[px, pz], [pz, -px], [-px, -pz], [-pz, px]][ry % 4];
    return { x: +(x + a).toFixed(6), z: +(z + b).toFixed(6), r };
  });
}

const isBox = (s) => s.x1 !== undefined;

function circleBox(c, b) {
  const nx = Math.max(b.x1, Math.min(c.x, b.x2));
  const nz = Math.max(b.z1, Math.min(c.z, b.z2));
  return Math.hypot(c.x - nx, c.z - nz) < c.r - GAP;
}

export function shapesOverlap(a, b) {
  if (isBox(a) && isBox(b)) return a.x1 < b.x2 - GAP && b.x1 < a.x2 - GAP && a.z1 < b.z2 - GAP && b.z1 < a.z2 - GAP;
  if (isBox(a)) return circleBox(b, a);
  if (isBox(b)) return circleBox(a, b);
  return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r - GAP;
}

export function blockedByWorld(fp, colliders, ignore = new Set()) {
  return colliders.some(c => !c.off && !ignore.has(c) && shapesOverlap(fp, c));
}
