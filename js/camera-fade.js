export const FADE_MIN_TOP = 2;
export const FADE_MAX_SPAN = 16;

const span = (b) => Math.max(b.max.x - b.min.x, b.max.z - b.min.z);

export function isFadeMeshBox(b) {
  return Number.isFinite(b.max.y) && b.max.y >= FADE_MIN_TOP && span(b) <= FADE_MAX_SPAN;
}

export function isFadeUnitBox(b) {
  return Number.isFinite(b.max.y) && span(b) <= FADE_MAX_SPAN;
}

const helper = (o) => o.isLight || o.isCamera || o.isPoints || o.isLine || o.isLineSegments || o.isSprite || o.isInstancedMesh;

export function fadeCandidatesOf(children, { skip, boxOf }) {
  const out = [];
  const visit = (o) => {
    if (!o.visible || skip.has(o) || helper(o)) return;
    if (o.isMesh && isFadeMeshBox(boxOf(o))) out.push(o);
    o.children.forEach(visit);
  };
  children.forEach(visit);
  return out;
}

export function fadeUnitOf(mesh, scene) {
  let o = mesh;
  while (o.parent && o.parent !== scene && !o.parent.name?.startsWith('unlock:')) o = o.parent;
  return o;
}

export function underAny(obj, set) {
  for (let o = obj; o; o = o.parent) if (set.has(o)) return true;
  return false;
}

export function shownInScene(obj) {
  for (let o = obj; o; o = o.parent) if (!o.visible) return false;
  return true;
}
