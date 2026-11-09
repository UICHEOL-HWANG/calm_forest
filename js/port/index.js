import * as THREE from 'three';
import { PORT } from '../data/places.js';
import { ISLAND, ISLAND_R, ISLAND_DOCK, VILLAGE_DOCK, PIER_END, WALK_R, LAND_Y, ROUTE, SEA_BOUNDS, MARKET_POS, HUT_POS, LIGHT_POS,
  BOAT_SPEED, BOAT_TURN, FAST_MULT, BITE_FIRST, BITE_WIN, SEA_SPOTS, PIER_SPOT, SPOT_LEFT, PANTRY_ICO, PORT_COPY } from './data.js';
import { tubBoat, buildPortShops, setPortNight, mat, glow } from './models.js';
import { defaultPort, rollCatch, addToPantry } from './rules.js';
import { steer, pushOutOfIsland, fastStep } from './sail.js';
import { seaHoldRod } from '../spaces/sea.js';

export const port = { active: false };
const env = {};
let group = null, boat = null, shops = null, justLeft = false, night = null, btnKey = '';
const P = { phase: 'sail', dir: 1, fast: false, wp: 1, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null, trip: null, spots: [], t: 0 };
const W = (x, z, y = 0) => new THREE.Vector3(PORT.x + x, y, PORT.z + z);
const ZONE_COL = { near: 0xbfe6ff, far: 0x9fd0ff, night: 0xffd27a, pier: 0xbfe6ff };
const guideActive = () => false;

export function bindPortEnv(e) { Object.assign(env, e); }

function add(geo, m, x, y, z) { const o = new THREE.Mesh(geo, m); o.position.copy(W(x, z, y)); group.add(o); return o; }

function tree(x, z, s = 1) {
  add(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 1.4 * s, 6), mat(0x8a5a36), x, LAND_Y + 0.7 * s, z);
  add(new THREE.IcosahedronGeometry(0.95 * s, 0), mat(0x4f8a45), x, LAND_Y + 1.9 * s, z);
}

function buildIsland() {
  add(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R + 1.8, 1.2, 28), mat(0xe8d7a8), ISLAND.x, 0, ISLAND.z);
  add(new THREE.CylinderGeometry(13.5, 14, 0.1, 22), mat(0x86b86f), ISLAND.x + 4, LAND_Y + 0.02, -2.5);
  const stone = new THREE.CylinderGeometry(0.5, 0.55, 0.06, 7);
  for (let i = 0; i <= 17; i++) add(stone, mat(0xcbb48c), 27 + i * 1.8, LAND_Y + 0.04, -1 - Math.sin(i * 0.3) * 1.6 + (i % 2 ? 0.35 : -0.35)).rotation.y = i;
  add(new THREE.BoxGeometry(4.4, 0.2, 1.6), mat(0x9b6b3f), 23.6, 0.55, 0);
  const post = new THREE.CylinderGeometry(0.1, 0.1, 1.3, 6);
  for (const z of [-0.75, 0.75]) for (let i = 0; i < 3; i++) add(post, mat(0x6e4a2c), 21.8 + i * 1.6, 0.05, z);
  add(new THREE.IcosahedronGeometry(0.22, 0), glow(0xffc56b), 21.6, 1.7, 0.85);
  for (const [x, z] of [[31, 16], [34.5, 18.2], [37.2, 18.9], [29.5, 13.8], [39.5, 19]]) {
    const r = add(new THREE.DodecahedronGeometry(0.84, 0), mat(0x8d8f8a), x, LAND_Y + 0.24, z); r.scale.y = 0.6; r.rotation.y = x;
  }
  for (const [x, z, r] of [[33.3, 16.2, 1.2], [36.4, 17.6, 1]]) add(new THREE.CircleGeometry(r, 10), mat(0x3f8fb0), x, LAND_Y + 0.03, z).rotation.x = -Math.PI / 2;
  const fp = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 5);
  for (let i = 0; i <= 6; i++) for (const z of [-6.8, -13.2]) add(fp, mat(0x9b6b3f), 51 + i, LAND_Y + 0.35, z);
  for (const z of [-6.8, -13.2]) add(new THREE.BoxGeometry(6, 0.06, 0.06), mat(0x9b6b3f), 54, LAND_Y + 0.55, z);
  add(new THREE.BoxGeometry(5.6, 0.08, 5.6), mat(0x8a6040), 54, LAND_Y + 0.04, -10);
  for (let i = 0; i < 4; i++) add(new THREE.CylinderGeometry(0.95 - i * 0.1, 1.05 - i * 0.1, 1.2, 12), mat(i % 2 ? 0xc0432b : 0xf4ece0), LIGHT_POS.x, LAND_Y + 0.6 + i * 1.2, LIGHT_POS.z);
  add(new THREE.CylinderGeometry(0.75, 0.75, 0.15, 12), mat(0x40585f), LIGHT_POS.x, LAND_Y + 4.9, LIGHT_POS.z);
  add(new THREE.IcosahedronGeometry(0.4, 1), glow(0xffd27a), LIGHT_POS.x, LAND_Y + 5.35, LIGHT_POS.z);
  add(new THREE.ConeGeometry(0.75, 0.8, 12), mat(0x40585f), LIGHT_POS.x, LAND_Y + 6.1, LIGHT_POS.z);
  for (const [x, z, s] of [[44, -16, 1.2], [40, -14, 0.9], [47, 8, 1.3], [51, 4, 1], [38, 6, 0.9], [59, 2, 1.1], [36, -14, 1]]) tree(x, z, s);
}

function buildBuoys() {
  const cone = new THREE.ConeGeometry(0.35, 0.8, 8), top = new THREE.IcosahedronGeometry(0.14, 0);
  for (const [x, z] of ROUTE.slice(1, -1)) { add(cone, mat(0xe8763a), x, 0.3, z); add(top, glow(0xffd27a), x, 0.85, z); }
}

function makeSpot(x, z, zone) {
  const g = new THREE.Group(); g.position.copy(W(x, z, 0.05)); group.add(g);
  const big = zone === 'far' ? 1.3 : 1;
  const ringMat = () => new THREE.MeshBasicMaterial({ color: ZONE_COL[zone], transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  const ringGeo = new THREE.RingGeometry(1.1 * big, 1.35 * big, 24);
  const rings = [0, 1].map(() => { const r = new THREE.Mesh(ringGeo, ringMat()); r.rotation.x = -Math.PI / 2; g.add(r); return r; });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5 * big, 10), new THREE.MeshBasicMaterial({ color: 0x0b1a26, transparent: true, opacity: 0.6, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.6, 0.7, 1); shadow.position.y = -0.02; g.add(shadow);
  if (zone === 'night') { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), glow(0xffd27a)); f.position.y = 0.5; g.add(f); }
  return { g, rings, shadow };
}

function buildPort() {
  group = new THREE.Group(); group.name = 'port'; env.scene.add(group);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(300, 180), new THREE.MeshLambertMaterial({ color: 0x4fb3c9 }));
  sea.rotation.x = -Math.PI / 2; sea.position.copy(W(20, 0, -0.02)); group.add(sea);
  buildIsland();
  buildBuoys();
  shops = new THREE.Group(); group.add(shops);
  const { market, hut } = buildPortShops();
  market.position.copy(W(MARKET_POS.x, MARKET_POS.z, LAND_Y)); market.rotation.y = 0.55; shops.add(market);
  hut.position.copy(W(HUT_POS.x, HUT_POS.z, LAND_Y)); hut.rotation.y = 0.5; shops.add(hut);
  boat = tubBoat(); group.add(boat);
}

function resetSpots() {
  for (const s of P.spots) group.remove(s.mesh);
  P.spots = [...SEA_SPOTS, PIER_SPOT].map(s => {
    const m = makeSpot(s.at[0], s.at[1], s.zone);
    return { zone: s.zone, pos: W(s.at[0], s.at[1]), left: SPOT_LEFT[s.zone], mesh: m.g, rings: m.rings, shadow: m.shadow };
  });
}

function seatPlayer() {
  env.player.position.set(boat.position.x, 0.34, boat.position.z);
  env.player.rotation.y = P.heading + Math.PI;
}

export function enterPort(o = {}) {
  if (port.active) return;
  if (!group) buildPort();
  justLeft = false;
  env.$w.atSea = true;
  port.active = true;
  group.visible = true;
  Object.assign(P, { phase: 'sail', dir: 1, fast: !!o.fast, wp: 1, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null,
    trip: { t0: performance.now(), caught: 0, quests: 0, via: o.fast ? 'fast' : 'sail' } });
  resetSpots();
  night = null; btnKey = '';
  boat.position.copy(W(VILLAGE_DOCK.x, VILLAGE_DOCK.z)); boat.rotation.y = P.heading;
  seatPlayer();
  seaHoldRod(true);
  env.$w.lastFloorChoiceKey = null; env.ui.setFloorChoice?.(null);
  env.ui.setSeaMode?.(true);
  env.snapCamera(); env.setSpaceVisible();
}

export function leavePort() {
  if (!port.active) return;
  env.player.position.y = 0;
  port.active = false;
  P.fishing = null;
  justLeft = true;
  if (group) group.visible = false;
}

export function leftPort() { const was = justLeft; justLeft = false; return was; }

export const portView = () => P;

export function portOwnsMovement() { return port.active && P.phase === 'sail'; }

export function clampPort(pos) {
  const cx = PORT.x + ISLAND.x, cz = PORT.z + ISLAND.z;
  const dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
  const lx = pos.x - PORT.x, lz = pos.z - PORT.z;
  const onPier = lx >= 21.9 && lx <= 26.5 && Math.abs(lz) <= 0.75;
  if (!onPier && d > WALK_R) { pos.x = cx + (dx / d) * WALK_R; pos.z = cz + (dz / d) * WALK_R; }
}

const _v = new THREE.Vector3();
export function portCamera(camera, look, dt) {
  const tall = camera.aspect < 1, low = !tall && innerHeight < 500;
  const fov = tall ? 60 : low ? 30 : 36;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const t = P.phase === 'sail' ? boat.position : env.player.position;
  const off = P.phase === 'island' ? (low ? [17, 11.5] : [20, 13]) : (low ? [14, 9.8] : [16.5, 11.5]);
  look.lerp(_v.set(t.x, 0, t.z), Math.min(1, dt * 4));
  camera.position.lerp(_v.set(look.x, off[0], look.z + off[1]), Math.min(1, dt * 3));
  camera.lookAt(look);
}

function inputVec() {
  const { mx, mz } = env.keys.moveAxes();
  let x = env.analog.x + mx, y = env.analog.z + mz;
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
  return { x, y };
}

function sailTick(dt) {
  const p = { x: boat.position.x - PORT.x, z: boat.position.z - PORT.z }, ox = p.x, oz = p.z;
  let next = p;
  if (P.fast) {
    const route = P.dir > 0 ? ROUTE : [...ROUTE].reverse();
    const st = fastStep(p, route, P.wp ?? 1, BOAT_SPEED * FAST_MULT * dt);
    P.wp = st.wp; next = st.p;
    if (Math.hypot(next.x - ox, next.z - oz) > 1e-6) P.heading = Math.atan2(-(next.x - ox), -(next.z - oz));
    if (st.done) return arrive();
  } else {
    const s = P.fishing ? { heading: P.heading, speed: Math.max(0, P.speed - dt * 10) } : steer(P, inputVec(), dt, { speed: BOAT_SPEED, turn: BOAT_TURN });
    P.heading = s.heading; P.speed = s.speed;
    next = { x: p.x - Math.sin(P.heading) * P.speed * dt, z: p.z - Math.cos(P.heading) * P.speed * dt };
    next = pushOutOfIsland(next, ISLAND, ISLAND_R + 2.2);
    next = { x: Math.max(SEA_BOUNDS.x0, Math.min(SEA_BOUNDS.x1, next.x)), z: Math.max(SEA_BOUNDS.z0, Math.min(SEA_BOUNDS.z1, next.z)) };
  }
  P.moved += Math.hypot(next.x - ox, next.z - oz);
  boat.position.set(PORT.x + next.x, 0, PORT.z + next.z);
  boat.rotation.y = P.heading;
  seatPlayer();
  const dock = P.dir > 0 ? ISLAND_DOCK : VILLAGE_DOCK;
  if (!P.fast && !P.fishing && Math.hypot(next.x - dock.x, next.z - dock.z) < 1.2) arrive();
}

function nearSpot(r) {
  let best = null, bd = r;
  for (const s of P.spots) { if (!s.left || !s.mesh.visible) continue; const d = s.pos.distanceTo(boat.position); if (d < bd) { bd = d; best = s; } }
  return best;
}

function startFish(spot) {
  if (!spot) return;
  const first = P.trip.caught === 0 && guideActive();
  P.fishing = { spot, t: 0, bite: first ? BITE_FIRST.delay : 1.2 + Math.random() * 1.6, win: first ? BITE_FIRST.win : BITE_WIN, state: 'wait' };
}

function tapFish() {
  const f = P.fishing; if (!f) return;
  if (f.state === 'bite') {
    const kind = rollCatch(f.spot.zone, Math.random());
    const gs = env.gameState(); gs.port = addToPantry(gs.port ?? defaultPort(), { [kind]: 1 });
    P.trip.caught++; f.spot.left--; if (!f.spot.left) f.spot.mesh.visible = false;
    env.popAt?.(f.spot.pos, PANTRY_ICO[kind]);
  }
  P.fishing = null;
}

function fishTick(dt) {
  const f = P.fishing; if (!f) return;
  f.t += dt;
  if (f.state === 'wait' && f.t > f.bite) { f.state = 'bite'; f.t = 0; env.popAt?.(f.spot.pos, '❗'); }
  else if (f.state === 'bite' && f.t > f.win) { env.popAt?.(f.spot.pos, '💨'); P.fishing = null; }
}

function spotsTick(isNight) {
  for (const s of P.spots) {
    s.mesh.visible = s.left > 0 && (s.zone !== 'night' || isNight);
    if (!s.mesh.visible) continue;
    s.rings.forEach((r, i) => { const k = (P.t * 0.6 + i * 0.5) % 1; r.scale.setScalar(0.6 + k * 0.8); r.material.opacity = 0.6 * (1 - k); });
    s.shadow.position.x = Math.sin(P.t * 0.8 + s.pos.x) * 0.5;
    s.shadow.rotation.z = P.t * 0.5;
  }
}

function btnState() {
  const f = P.fishing;
  if (f) return f.state === 'bite' ? ['낚아채기!', 'hook', false] : ['낚아채기', 'wait', false];
  if (P.phase === 'sail' && !P.fast && nearSpot(3.4)) return ['🎣 던지기', '', false];
  return [P.phase === 'island' ? '🏝️' : '⛵', 'wait', false];
}

function hudTick() {
  const st = btnState(), key = st.join('|');
  if (key !== btnKey) { btnKey = key; env.ui.setSeaBtn?.(...st); }
}

export function updatePort(dt) {
  P.t += dt;
  const isNight = !!env.isNight?.();
  if (isNight !== night) { night = isNight; setPortNight(shops, isNight); }
  spotsTick(isNight);
  fishTick(dt);
  if (P.phase === 'sail') sailTick(dt);
  if (port.active) hudTick();
}

export function portAction() {
  const nd = env.$w.nearDoor;
  if (nd === 'port_cast') return startFish(nearSpot(3.4));
  if (nd === 'port_fish') return tapFish();
}

export function portPrompt() {
  if (P.phase === 'sail' && P.fishing) return { nd: 'port_fish', prompt: '' };
  if (P.phase === 'sail' && !P.fast && nearSpot(3.4)) return { nd: 'port_cast', prompt: '' };
  return { nd: null, prompt: '' };
}

function arrive() {
  P.speed = 0; P.fast = false; P.wp = 1;
  if (P.dir > 0) return arriveIsland();
  const gs = env.gameState();
  const cur = gs.port ?? defaultPort();
  env.trackEvent('port_trip', { via: P.trip.via, caught: P.trip.caught, quests: P.trip.quests, sec: Math.round((performance.now() - P.trip.t0) / 1000) });
  if (!cur.fastUnlocked) { gs.port = { ...cur, visited: true, fastUnlocked: true }; env.ui.toast?.(PORT_COPY.arrive); }
  env.requestSave();
  env.exitSea();
}

function arriveIsland() {
  P.phase = 'island';
  env.player.position.copy(W(PIER_END.x, PIER_END.z));
}
