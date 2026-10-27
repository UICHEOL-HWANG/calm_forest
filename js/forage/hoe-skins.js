export const HOE_SKINS = ['najeon', 'coral', 'whale', 'mudset'];

const ring = (THREE, mat, color, r, tube, y) => {
  const t = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 18), mat(color));
  t.rotation.x = Math.PI / 2; t.position.y = y;
  return t;
};

const ball = (THREE, mat, color, r, x, y, z, sy = 1) => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat(color, false));
  m.position.set(x, y, z); m.scale.y = sy;
  return m;
};

function flower(THREE, mat, colors, r, cx, cy, z, n = 5) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6), mat(colors[i % colors.length], false));
    p.scale.set(1, .55, .35); p.rotation.z = a;
    p.position.set(cx + Math.cos(a) * r * .9, cy + Math.sin(a) * r * .9, z);
    g.add(p);
  }
  g.add(ball(THREE, mat, 0xd9b44a, r * .55, cx, cy, z + .002));
  return g;
}

const TIER_LOOKS = {
  1: { pal: { wood: 0x6b4224, woodDark: 0x4a3018, iron: 0x5c646c, steel: 0xd3dade }, deco() {} },
  2: {
    pal: { wood: 0x6b4224, woodDark: 0x4a3018, iron: 0x2f4f58, steel: 0xd9e0e4, rope: 0xc0573a },
    deco(THREE, mat, { body, neck, spec }) { body.add(ball(THREE, mat, 0x4fb8c8, spec.nr * 1.4, neck.x, neck.y + .004, 0)); },
  },
};

export const tierLook = tier => TIER_LOOKS[tier] || null;

const SKINS = {
  najeon: {
    pal: { wood: 0x1e1719, woodDark: 0xd4a73a, rope: 0xd9b44a, iron: 0x2a2226, steel: 0xd9d0ea },
    over: { blade: 'forged', dish: 7 },
    deco(THREE, mat, { body, blade, spec, top, neck }) {
      const PEARL = [0xf0e4ff, 0xd5f6ee, 0xffe1ec, 0xdfeaff];
      [[.03, 1], [.13, 1], [.08, -1], [.18, -1]].forEach(([y, sd]) => {
        const f = flower(THREE, mat, PEARL, spec.r * .5, 0, y, 0);
        f.position.x = sd * spec.r * .98; f.rotation.y = sd * Math.PI / 2; body.add(f);
      });
      body.add(ring(THREE, mat, 0xd9b44a, spec.r * 1.05, .006, -.04));
      body.add(ring(THREE, mat, 0xd9b44a, spec.r * .95, .006, top - .04));
      body.add(ball(THREE, mat, 0xd9b44a, spec.nr * 1.9, neck.x, neck.y, 0));
      body.add(ball(THREE, mat, 0xd9b44a, spec.r * 1.2, 0, -.085, 0, .55));
      [1, -1].forEach(s => { const f = flower(THREE, mat, PEARL, spec.bw * .3, 0, -spec.bl * .32, s * .022); if (s < 0) f.rotation.y = Math.PI; blade.add(f); });
    },
  },
  coral: {
    pal: { wood: 0xf08a6a, woodDark: 0xc65a44, rope: 0xfff1e0, iron: 0x2f6f78, steel: 0xf7c6b2 },
    over: { blade: 'shell', bw: .09, bl: .17, dish: 2, scale: .14 },
    deco(THREE, mat, { body, blade, spec, top }) {
      const CORAL = 0xff6f61;
      const branch = (x, y, z, len, rz, rx) => {
        const c = new THREE.Mesh(new THREE.CylinderGeometry(.006, .009, len, 6), mat(CORAL));
        c.position.set(x, y + len / 2 * Math.cos(rz), z); c.rotation.set(rx, 0, rz);
        body.add(c);
        body.add(ball(THREE, mat, CORAL, .009, x - Math.sin(rz) * len, y + Math.cos(rz) * len, z));
      };
      branch(spec.r, top - .1, .01, .07, -.5, .2);
      branch(spec.r * .9, top - .07, -.01, .05, -.9, -.3);
      branch(-spec.r, top - .12, 0, .06, .6, .1);
      [[0, .03], [.12, .05], [-.1, .09]].forEach(([a, y]) => body.add(ball(THREE, mat, 0xf8f4ee, .012, Math.sin(a) * spec.r * 1.05, y, Math.cos(a) * spec.r * 1.05)));
      const hinge = -spec.bl * .16, len = spec.bl * .82;
      for (let i = -3; i <= 3; i++) {
        const a = i * .2;
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(.0035, .008, len, 6), mat(i % 2 ? 0xe0705a : 0xf59a80));
        rib.rotation.z = a;
        rib.position.set(Math.sin(a) * len / 2, hinge - Math.cos(a) * len / 2, 0);
        [1, -1].forEach(sd => { const r = rib.clone(); r.position.z = sd * .018; blade.add(r); });
      }
      [1, -1].forEach(sd => blade.add(ball(THREE, mat, 0xf8f4ee, .016, 0, hinge + .005, sd * .02)));
    },
  },
  whale: {
    pal: { wood: 0x3f6fa0, woodDark: 0x24476b, rope: 0xeaf6ff, iron: 0x2a4f73, steel: 0xb2d8ee },
    over: { blade: 'fluke', bw: .085, bl: .2, dish: 2, scale: .45, tilt: .4 },
    deco(THREE, mat, { body, blade, spec, neck }) {
      for (let i = 0; i < 5; i++) body.add(ring(THREE, mat, i % 2 ? 0x7fc6ef : 0xeaf6ff, spec.r * 1.02, .005, i * .03));
      body.add(ball(THREE, mat, 0x7fd3ff, spec.nr * 1.3, neck.x, neck.y + .01, 0, 1.3));
      [-1, 0, 1].forEach(i => body.add(ball(THREE, mat, 0xdff3ff, .014 - Math.abs(i) * .003, neck.x + i * .022, neck.y + .04 + (1 - Math.abs(i)) * .016, 0)));
      [1, -1].forEach(s => {
        const belly = new THREE.Mesh(new THREE.BoxGeometry(.004, spec.bl * .45, .004), mat(0xeaf6ff));
        belly.position.set(0, -spec.bl * .3, s * .016); blade.add(belly);
      });
    },
  },
  mudset: {
    pal: { wood: 0xf2c94c, woodDark: 0xd9a520, rope: 0x3a7bd5, iron: 0x3b4a54, steel: 0xd8dee3 },
    over: { blade: 'round', bw: .085, bl: .16 },
    deco(THREE, mat, { body, spec, top }) {
      const crab = new THREE.Group();
      crab.position.set(spec.r * 1.9, top - .1, 0);
      crab.add(ball(THREE, mat, 0xf05a3c, .032, 0, 0, 0, .62));
      [-1, 1].forEach(sd => {
        crab.add(ball(THREE, mat, 0xf05a3c, .014, sd * .036, .016, 0));
        crab.add(ball(THREE, mat, 0xffffff, .008, sd * .011, .02, .016));
        crab.add(ball(THREE, mat, 0x2b2b2b, .004, sd * .011, .021, .023));
      });
      const str = new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, .09, 4), mat(0x3a7bd5));
      str.position.set(-spec.r * .9, .05, 0); str.rotation.z = .55; crab.add(str);
      body.add(crab);
      body.add(ring(THREE, mat, 0xffffff, spec.r * 1.03, .006, .1));
    },
  },
};

export function skinOf(id) {
  return SKINS[id] || null;
}

export function dressHoe(THREE, mat, hoe, id, tier = 0) {
  const skin = SKINS[id] || TIER_LOOKS[tier];
  if (skin) skin.deco(THREE, mat, hoe.userData.parts);
  hoe.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return hoe;
}
