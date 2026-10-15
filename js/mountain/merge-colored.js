export function colored(THREE, geo, hex) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  g.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n }, () => [c.r, c.g, c.b]).flat(), 3));
  return g;
}

export function mergeColored(THREE, geos) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color']) {
    const arr = new Float32Array(geos.reduce((t, g) => t + g.getAttribute(name).array.length, 0));
    geos.reduce((off, g) => { arr.set(g.getAttribute(name).array, off); return off + g.getAttribute(name).array.length; }, 0);
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  geos.forEach(g => g.dispose());
  return out;
}
