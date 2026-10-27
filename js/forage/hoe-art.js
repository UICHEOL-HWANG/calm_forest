export const HOE_VARIANTS = ['A1', 'A2', 'A3'];
export const HOE_DEFAULT = 'A3';
export const HOE_FACE = -Math.PI / 2;
export const HOMI_ANIM_DUR = 0.55;

export const HOE_PAL = Object.freeze({ wood: 0xb57c46, woodDark: 0x7a4b28, iron: 0x3d4148, steel: 0xb9c2c9, rope: 0xcdb48a });

const SPEC = {
  A1: { handle: .34, r: .034, neck: [[0, 0], [0, .06], [.04, .125], [.11, .14], [.16, .1]], nr: .014, blade: 'tri', bw: .08, bl: .2, tilt: .42, dish: 5, scale: .55 },
  A2: { handle: .32, r: .036, neck: [[0, 0], [0, .05], [.035, .11], [.1, .125], [.145, .09]], nr: .014, blade: 'round', bw: .09, bl: .17, tilt: .36, dish: 4, scale: .5 },
  A3: { handle: .3, r: .04, neck: [[0, 0], [0, .07], [.05, .13], [.12, .135], [.165, .095]], nr: .017, blade: 'forged', bw: .075, bl: .21, tilt: .48, dish: 6, scale: .62, rope: true },
};

function handle(THREE, mat, g, spec, c) {
  const { handle: l, r } = spec;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(r * .8, r * 1.1, l, 10), mat(c.wood, false));
  h.position.y = l / 2 - .08;
  const end = new THREE.Mesh(new THREE.SphereGeometry(r * 1.12, 10, 8), mat(c.wood, false));
  end.scale.y = .6; end.position.y = -.08;
  g.add(h, end);
  if (spec.rope) {
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(r * 1.03, .006, 5, 14), mat(c.rope));
      t.rotation.x = Math.PI / 2; t.position.y = .02 + i * .014; g.add(t);
    }
  } else {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.04, .007, 5, 14), mat(c.woodDark));
    ring.rotation.x = Math.PI / 2; ring.position.y = .03; g.add(ring);
  }
  const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(r * .82, r * .86, .05, 10), mat(c.iron));
  ferrule.position.y = l - .08 + .015;
  g.add(ferrule);
  return l - .08 + .03;
}

function neck(THREE, mat, g, top, spec, c) {
  const curve = new THREE.CatmullRomCurve3(spec.neck.map(([x, y]) => new THREE.Vector3(x, top + y, 0)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, spec.nr, 7, false), mat(c.iron, false)));
  const end = curve.getPoint(1);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(spec.nr * 1.5, 8, 6), mat(c.iron, false));
  knob.position.copy(end); g.add(knob);
  return end;
}

function outline(THREE, kind, w, l) {
  const s = new THREE.Shape();
  if (kind === 'fluke') {
    s.moveTo(-w * .22, 0); s.lineTo(w * .22, 0);
    s.quadraticCurveTo(w * .3, -l * .5, w * .55, -l * .72);
    s.quadraticCurveTo(w * 1.25, -l * .78, w * 1.3, -l * 1.02);
    s.quadraticCurveTo(w * .7, -l * .92, 0, -l * .82);
    s.quadraticCurveTo(-w * .7, -l * .92, -w * 1.3, -l * 1.02);
    s.quadraticCurveTo(-w * 1.25, -l * .78, -w * .55, -l * .72);
    s.quadraticCurveTo(-w * .3, -l * .5, -w * .22, 0);
  } else if (kind === 'shell') {
    s.moveTo(-w * .3, 0); s.lineTo(w * .3, 0);
    s.lineTo(w * .5, -l * .12);
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI * .1 - i * Math.PI * .8 / 6, b = a - Math.PI * .8 / 12;
      s.quadraticCurveTo(Math.cos(b) * w * 1.35, -l * .2 + Math.sin(b) * l * .95, Math.cos(a - Math.PI * .8 / 6) * w * 1.2, -l * .2 + Math.sin(a - Math.PI * .8 / 6) * l * .82);
    }
    s.lineTo(-w * .3, 0);
  } else if (kind === 'round') {
    s.moveTo(-w * .55, 0); s.lineTo(w * .55, 0);
    s.bezierCurveTo(w * 1.15, -l * .05, w * 1.05, -l * .6, 0, -l);
    s.bezierCurveTo(-w * 1.05, -l * .6, -w * 1.15, -l * .05, -w * .55, 0);
  } else if (kind === 'forged') {
    s.moveTo(-w * .5, 0); s.lineTo(w * .5, 0);
    s.lineTo(w, -l * .22);
    s.quadraticCurveTo(w * .55, -l * .7, 0, -l);
    s.quadraticCurveTo(-w * .55, -l * .7, -w, -l * .22);
    s.lineTo(-w * .5, 0);
  } else {
    s.moveTo(-w * .45, 0); s.lineTo(w * .45, 0);
    s.quadraticCurveTo(w * 1.05, -l * .12, w * .95, -l * .3);
    s.quadraticCurveTo(w * .6, -l * .72, 0, -l);
    s.quadraticCurveTo(-w * .6, -l * .72, -w * .95, -l * .3);
    s.quadraticCurveTo(-w * 1.05, -l * .12, -w * .45, 0);
  }
  return s;
}

function plate(THREE, shape, depth, dish) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .003, bevelSize: .004, bevelSegments: 2, curveSegments: 18 });
  geo.translate(0, 0, -depth / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + dish * p.getX(i) * p.getX(i));
  geo.computeVertexNormals();
  return geo;
}

function blade(THREE, mat, g, at, spec, c) {
  const tilt = new THREE.Group();
  tilt.position.copy(at);
  tilt.rotation.z = -spec.tilt;
  const face = new THREE.Group();
  face.rotation.y = Math.PI / 2;
  const shape = outline(THREE, spec.blade, spec.bw, spec.bl);
  face.add(new THREE.Mesh(plate(THREE, shape, .008, spec.dish), mat(c.steel, false)));
  const body = new THREE.Mesh(plate(THREE, shape, .013, spec.dish), mat(c.iron, false));
  body.scale.set(1.002, spec.scale, 1);
  face.add(body);
  tilt.add(face);
  g.add(tilt);
  return face;
}

export function buildHoe(THREE, mat, variant = HOE_DEFAULT, face = 0, pal = null, over = null) {
  const spec = { ...(SPEC[variant] || SPEC[HOE_DEFAULT]), ...over };
  const c = { ...HOE_PAL, ...pal };
  const root = new THREE.Group();
  const g = new THREE.Group();
  g.rotation.y = face;
  root.add(g);
  const top = handle(THREE, mat, g, spec, c);
  const at = neck(THREE, mat, g, top, spec, c);
  const bladeFace = blade(THREE, mat, g, at, spec, c);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  root.scale.setScalar(1.45);
  root.userData.toolId = 'homi';
  root.userData.face = { body: g, rest: face };
  root.userData.parts = { body: g, top, neck: at, blade: bladeFace, spec, c };
  return root;
}
