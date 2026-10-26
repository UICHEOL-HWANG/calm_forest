import { buildCafeRoom } from './cafe-art.js';
import { CAFE_OFFSET, ENTRY, EXIT_SPOT, ORDER_SPOT, SPOT_R, BARISTA, TABLES, clampCafe, nearestSeat, DRINK, drinkPose } from './cafe-layout.js';
export { DRINK, drinkPose };
import { disposeTree } from './dispose.js';
import { applyLook } from './interior-look.js';
import { animateBubble, makeRing, onTop } from '../bubble-fx.js';

export const CAFE_LOOK = Object.freeze({
  hemiSky: 0xfff1dc, hemiGround: 0x5a4636, hemi: 1.0, sun: 0xffe2b8, sunI: 1.2, sunDir: [-6, 14, 9],
  fog: 0x2a2320, fogNear: 30, fogFar: 90, grade: 0, torch: 0.6,
});
const BUBBLE = Object.freeze({ w: 0.8, h: 0.8, y: 3.0 });
export function createCafe({ THREE, scene, mountain, makeNameTag, fadeNameTag, getMountainGroup }) {
  const origin = { x: mountain.x + CAFE_OFFSET.x, z: mountain.z + CAFE_OFFSET.z };
  const sunAt = new THREE.Vector3(origin.x, 0, origin.z);
  const group = new THREE.Group();
  group.position.set(origin.x, 0, origin.z);
  group.add(buildCafeRoom(THREE));
  const tag = makeNameTag({ emoji: '🦊', name: '북극여우', color: 0xf4f6fa });
  tag.position.set(BARISTA.x, 2.2, BARISTA.z);
  group.add(tag);
  const bubble = onTop(new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(THREE, '☕'), transparent: true, depthWrite: false, fog: false, toneMapped: false })));
  const ring = makeRing(BUBBLE.y);
  bubble.position.set(BARISTA.x, BUBBLE.y, BARISTA.z);
  ring.position.set(BARISTA.x, BUBBLE.y, BARISTA.z);
  group.add(bubble, ring);
  group.visible = false;
  scene.add(group);
  let on = false;
  let seated = null;
  const release = o => { group.remove(o); disposeTree(o); };
  const clearSeated = () => { if (!seated) return; [seated.mug, ...seated.steam].forEach(release); seated = null; };
  const local = p => ({ x: p.x - origin.x, z: p.z - origin.z });
  const near = (p, s) => Math.hypot(p.x - s.x, p.z - s.z) < SPOT_R;
  return {
    group,
    origin,
    active: () => on,
    enter(player) {
      on = true;
      group.visible = true;
      const mg = getMountainGroup();
      if (mg) mg.visible = false;
      player.position.set(origin.x + ENTRY.x, 0, origin.z + ENTRY.z);
      player.rotation.y = Math.PI;
    },
    exit(player, back) {
      clearSeated();
      on = false;
      group.visible = false;
      const mg = getMountainGroup();
      if (mg) mg.visible = true;
      player.position.set(back.x, back.y, back.z);
    },
    clamp(p) {
      if (seated) { p.x = seated.x; p.z = seated.z; p.y = 0; return; }
      const q = clampCafe(local(p));
      p.x = origin.x + q.x; p.z = origin.z + q.z; p.y = 0;
    },
    atExit: p => near(local(p), EXIT_SPOT),
    atOrder: p => near(local(p), ORDER_SPOT),
    lookFrame(env) {
      applyLook({ ...env, target: sunAt }, CAFE_LOOK, null);
    },
    sit(player, cup) {
      const back = { x: player.position.x, z: player.position.z, ry: player.rotation.y };
      const seat = nearestSeat(local(player.position));
      player.position.set(origin.x + seat.x, 0, origin.z + seat.z);
      player.rotation.y = seat.ry;
      const tb = TABLES[seat.table];
      const mug = new THREE.Group();
      mug.rotation.order = 'YXZ';
      mug.rotation.y = seat.ry;
      mug.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.2, 12), new THREE.MeshLambertMaterial({ color: 0xf3e6cf })));
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 12), new THREE.MeshLambertMaterial({ color: cup }));
      top.position.y = 0.1;
      mug.add(top);
      const table = { x: tb.x + (seat.x - tb.x) * 0.35, y: 0.89, z: tb.z };
      const mouth = { x: seat.x + Math.sin(seat.ry) * DRINK.mouth.fwd, y: DRINK.mouth.y, z: seat.z + Math.cos(seat.ry) * DRINK.mouth.fwd };
      mug.position.set(table.x, table.y, table.z);
      group.add(mug);
      const steam = [0, 1, 2].map(i => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.05 + i * 0.015, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }));
        s.position.set(table.x, table.y + 0.16 + i * 0.12, table.z);
        group.add(s);
        return s;
      });
      clearSeated();
      seated = { mug, steam, t: DRINK.s, table, mouth, back, rise: 0, x: origin.x + seat.x, z: origin.z + seat.z };
    },
    drinking: () => !!seated,
    update(dt, time, p) {
      let done = null, sip = 0;
      if (seated) {
        seated.t -= dt;
        seated.rise = (seated.rise + dt * 0.25) % 0.36;
        const pose = drinkPose(1 - Math.max(0, seated.t) / DRINK.s, seated.table, seated.mouth);
        seated.mug.position.set(pose.at.x, pose.at.y, pose.at.z);
        seated.mug.rotation.x = -pose.tilt;
        sip = pose.sip;
        seated.steam.forEach((s, i) => {
          s.position.set(pose.at.x, pose.at.y + 0.16 + i * 0.12 + seated.rise, pose.at.z);
          s.material.opacity = Math.max(0, 0.6 - i * 0.12 - seated.rise);
        });
        if (seated.t <= 0) { done = { ...seated.back }; clearSeated(); }
      }
      const l = local(p);
      const d = Math.hypot(l.x - BARISTA.x, l.z - BARISTA.z);
      fadeNameTag(tag, d);
      animateBubble({ bubble, ring, base: BUBBLE, dist: d, alertR: 3, time, dt });
      return { done, sip };
    },
  };
}
