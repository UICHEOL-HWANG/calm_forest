export function buildEarmuff(THREE, g, k, h) {
  const HR = k.HR, pad = h.clay(0xf2f4f8), band = h.clay(0x6b8fd6);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(HR * 1.02, HR * 0.07, 6, 18, Math.PI), band);
  arc.position.y = HR * 0.1;
  g.add(arc);
  [-1, 1].forEach(s => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.34, 12, 10), pad);
    m.position.set(s * HR * 1.0, HR * 0.05, 0);
    m.scale.set(0.7, 1, 1);
    g.add(m);
  });
}

export function buildSledPack(THREE, g, k, h) {
  const R = k.R, w = R * 0.9, wood = h.clay(0xb5793f), runner = h.clay(0xc8463c);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, w * 0.08, w * 1.05), wood);
  deck.position.set(0, R * 0.35, -R * 0.12);
  deck.rotation.x = Math.PI / 2 - 0.15;
  g.add(deck);
  [-1, 1].forEach(s => {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w * 0.05, w * 0.05, w * 1.15), runner);
    r.position.set(s * w * 0.26, R * 0.35, -R * 0.2);
    r.rotation.x = Math.PI / 2 - 0.15;
    g.add(r);
  });
}
