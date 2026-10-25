import { colored, mergeColored } from './merge-colored.js';
import { moverPos } from './course.js';
import { slopePoint } from './terrain.js';

const RAMP = Object.freeze({ deck: 0x9fd0f0, stripe: 0xe5484d, tilt: -0.32, len: 2.2 });
const PENGUIN = Object.freeze({ body: 0x24303e, belly: 0xfafafa, beak: 0xf2a33a });
const BALL = 0xf4f8fc;

function rampGeos(THREE, r) {
  const p = slopePoint(r.z, r.x);
  const deck = new THREE.BoxGeometry(r.half * 2, 0.12, RAMP.len);
  deck.rotateX(RAMP.tilt);
  deck.translate(p.x, p.y + 0.35, p.z - 0.8);
  const stripe = new THREE.BoxGeometry(r.half * 2, 0.13, 0.25);
  stripe.rotateX(RAMP.tilt);
  stripe.translate(p.x, p.y + 0.7, p.z + 0.2);
  return [colored(THREE, deck, RAMP.deck), colored(THREE, stripe, RAMP.stripe)];
}

function penguinGeo(THREE) {
  const body = new THREE.CapsuleGeometry(0.32, 0.4, 4, 10);
  body.translate(0, 0.6, 0);
  const belly = new THREE.SphereGeometry(0.27, 12, 10);
  belly.scale(0.9, 1.3, 0.6);
  belly.translate(0, 0.55, 0.16);
  const beak = new THREE.ConeGeometry(0.07, 0.16, 8);
  beak.rotateX(Math.PI / 2);
  beak.translate(0, 0.92, 0.32);
  return mergeColored(THREE, [colored(THREE, body, PENGUIN.body), colored(THREE, belly, PENGUIN.belly), colored(THREE, beak, PENGUIN.beak)]);
}

export function buildSledProps(THREE, course) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const ramps = course.ramps?.length
    ? new THREE.Mesh(mergeColored(THREE, course.ramps.flatMap(r => rampGeos(THREE, r))), mat)
    : null;
  if (ramps) group.add(ramps);
  const penguin = penguinGeo(THREE);
  const movers = (course.movers || []).map(m => {
    const geo = m.kind === 'ball' ? colored(THREE, new THREE.IcosahedronGeometry(m.r, 1), BALL) : penguin;
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    return mesh;
  });
  function update(tMs) {
    (course.movers || []).forEach((m, i) => {
      const p = moverPos(m, tMs), s = slopePoint(p.z, p.x), mesh = movers[i];
      mesh.position.set(s.x, s.y + (m.kind === 'ball' ? m.r * 0.9 : 0), s.z);
      if (m.kind === 'ball') mesh.rotation.x = p.spin;
      else mesh.rotation.y = p.face > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  }
  update(0);
  return { group, ramps, movers, update };
}
