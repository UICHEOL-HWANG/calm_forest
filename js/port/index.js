import * as THREE from 'three';
import { PORT, PORT_PIER } from '../data/places.js';
import { ISLAND, ISLAND_R, ISLAND_DOCK, VILLAGE_DOCK, PIER_END, WALK_R, LAND_Y, ROUTE, FAST_ROUTE, BUOYS, SEA_BOUNDS, MARKET_POS, HUT_POS, LIGHT_POS,
  BOAT_SPEED, BOAT_TURN, FAST_MULT, BITE_FIRST, BITE_WIN, SEA_SPOTS, PIER_SPOT, SPOT_LEFT, PANTRY_ICO, PORT_COPY,
  QUESTS, SOLIDS, MARKET_PRICE, MARKET_GIVE } from './data.js';
import { tubBoat, buildPortShops, setPortNight, mat, glow } from './models.js';
import { rollCatch, addToPantry, acceptQuest, pickItem, claimQuest, boardGate } from './rules.js';
import { disarmPortPier, nearPortPier, portPierBoat } from './pier.js';
import { createGuide } from '../guide/runner.js';
import { createGuideView } from '../guide/view.js';
import { portGuideSteps } from './guide-steps.js';
import { buildIslandNPC, beachBuoy, npcPortrait, setNpcNight, ISLAND_NPCS } from './npc-models.js';
import { showTalk, hideTalk, onTalkTap, talkShown } from '../mirror/talk-box.js';
import { splitLines } from './card.js';
import { steer, pushOutOfIsland, pushOutOfCircles, fastStep } from './sail.js';
import { seaHoldRod } from '../spaces/sea.js';
import { initFishing, castSpot, castLine, twitchRod, hookFish, reelIn, clearFishing, tickFishing, fishingState } from './fishing.js';

export const port = { active: false };
const env = {};
let group = null, boat = null, shops = null, justLeft = false, night = null, btnKey = '', chipKey = null, talk = null, boardArmed = false;
const npcs = {}, glyphs = {}, items = [], solids = [];
const P = { phase: 'sail', dir: 1, fast: false, wp: 1, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null, trip: null, spots: [], t: 0 };
const W = (x, z, y = 0) => new THREE.Vector3(PORT.x + x, y, PORT.z + z);
const DBG = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dbg');
const GUIDE_AT = {
  pierEnd: { x: PORT_PIER.end.x, z: PORT_PIER.end.z, y: 0.38 },
  islandDock: W(ISLAND_DOCK.x, ISLAND_DOCK.z),
  pierEndIsland: W(PIER_END.x, PIER_END.z, LAND_Y),
  villageDock: W(VILLAGE_DOCK.x, VILLAGE_DOCK.z),
  solids: SOLIDS.map(([c, r]) => [W(c.x, c.z), r]),
};
const ZONE_COL = { near: 0xbfe6ff, far: 0x9fd0ff, night: 0xffd27a, pier: 0xbfe6ff };
let guide = null, view = null, guideHome = false, pointKey = null;
export const guideActive = () => !!guide?.active();
export const guideHides = () => guideActive() && guide.index() < 10;
const ROD_READY_R = 5;
const TALK_R = 2.6, PICK_R = 1.5, TALK_CLOSE_R = 3, PIER_END_R = 1.2;
const portState = () => env.gameState().port;

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
  initFishing(group);
  buildBuoys();
  shops = new THREE.Group(); group.add(shops);
  const { market, hut } = buildPortShops();
  market.position.copy(W(MARKET_POS.x, MARKET_POS.z, LAND_Y)); market.rotation.y = 0.55; shops.add(market);
  hut.position.copy(W(HUT_POS.x, HUT_POS.z, LAND_Y)); hut.rotation.y = 0.5; shops.add(hut);
  boat = tubBoat(); group.add(boat);
  buildResidents();
  for (const [c, r] of SOLIDS) solids.push(env.solidCircle(PORT.x + c.x, PORT.z + c.z, r));
}

function itemMesh(kind) {
  if (kind === 'buoy') return beachBuoy();
  const g = new THREE.Group();
  const put = (geo, c, y, sc) => { const m = new THREE.Mesh(geo, mat(c)); m.position.y = y; if (sc) m.scale.set(...sc); g.add(m); return m; };
  if (kind === 'clam') put(new THREE.IcosahedronGeometry(0.22, 1), 0xe8d2b4, 0.08, [1.2, 0.45, 1]);
  else if (kind === 'cabbage') { put(new THREE.IcosahedronGeometry(0.36, 1), 0x7fbf55, 0.25, [1, 0.8, 1]); put(new THREE.IcosahedronGeometry(0.22, 1), 0xc9e6a0, 0.45); }
  else if (kind === 'oil') { put(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), 0x3f6d8c, 0.25); put(new THREE.TorusGeometry(0.22, 0.03, 4, 12), 0xd9a066, 0.35).rotation.x = Math.PI / 2; }
  return g;
}

function glyphSprite(npc) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const tex = new THREE.CanvasTexture(cv);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.setScalar(0.9);
  sprite.position.y = new THREE.Box3().setFromObject(npc).max.y - npc.position.y + 0.65;
  sprite.visible = false; npc.add(sprite);
  return { sprite, ctx: cv.getContext('2d'), tex, last: null, y0: sprite.position.y };
}

function buildResidents() {
  for (const q of QUESTS) {
    const m = buildIslandNPC(q.id);
    m.position.copy(W(q.pos[0], q.pos[1], LAND_Y));
    m.rotation.y = Math.atan2(28 - q.pos[0], 4 - q.pos[1]);
    group.add(m); npcs[q.id] = m;
    glyphs[q.id] = glyphSprite(m);
    for (const [x, z] of q.spots) {
      const mesh = itemMesh(q.item); mesh.position.copy(W(x, z, LAND_Y)); mesh.visible = false; group.add(mesh);
      items.push({ id: q.id, mesh, pos: mesh.position, taken: false });
    }
  }
}

const questOpen = q => !q.night || !!env.isNight?.();

function showItems(id, skip = 0) {
  items.filter(it => it.id === id).forEach((it, i) => { it.taken = i < skip; it.mesh.visible = !it.taken; });
}

function syncItems() {
  const pq = portState().quests;
  for (const q of QUESTS) {
    const s = pq[q.id];
    if (s?.state === 'active' && s.got < q.need) showItems(q.id, s.got);
    else items.filter(it => it.id === q.id).forEach(it => { it.mesh.visible = false; });
  }
}

function glyphOf(q, s) {
  if (!s || s.state === 'done') return '';
  if (!questOpen(q)) return '💤';
  if (s.state === 'avail') return '❗';
  return s.got >= q.need ? '🎁' : '';
}

function drawGlyph(o, g) {
  if (g === o.last) return; o.last = g;
  const c = o.ctx; c.clearRect(0, 0, 128, 128);
  o.sprite.visible = !!g;
  if (g) {
    c.fillStyle = g === '🎁' ? '#8fd6a0' : g === '❗' ? '#ffd27a' : '#cfe3ff';
    c.beginPath(); c.roundRect(18, 14, 92, 82, 22); c.fill();
    c.beginPath(); c.moveTo(54, 94); c.lineTo(74, 94); c.lineTo(60, 118); c.closePath(); c.fill();
    c.font = '54px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(g, 64, 57);
  }
  o.tex.needsUpdate = true;
}

function residentsTick() {
  env.player.position.y = LAND_Y;
  const pq = portState().quests;
  for (const q of QUESTS) {
    const o = glyphs[q.id];
    drawGlyph(o, glyphOf(q, pq[q.id]));
    if (o.sprite.visible) o.sprite.position.y = o.y0 + Math.sin(P.t * 2.5 + q.pos[0]) * 0.08;
  }
  if (talk && env.player.position.distanceTo(npcs[talk.id].position) >= TALK_CLOSE_R) closeTalk();
}

function resetSpots() {
  for (const s of P.spots) {
    group.remove(s.mesh);
    s.mesh.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
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
  for (const c of solids) c.off = false;
  env.$w.atSea = true;
  port.active = true;
  group.visible = true;
  Object.assign(P, { phase: 'sail', dir: 1, fast: !!o.fast, wp: 1, heading: -Math.PI / 2, speed: 0, moved: 0, fishing: null,
    trip: { t0: performance.now(), caught: 0, quests: 0, via: o.fast ? 'fast' : 'sail' } });
  resetSpots();
  night = null; btnKey = ''; chipKey = null;
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
  clearFishing();
  closeTalk();
  for (const c of solids) c.off = true;
  setChips(null);
  disarmPortPier();
  justLeft = true;
  if (group) group.visible = false;
  env.refreshQuestPanel();
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

const ROUTE_BACK = [...FAST_ROUTE].reverse();

const _v = new THREE.Vector3();
export function portCamera(camera, look, dt) {
  const tall = camera.aspect < 1, low = !tall && innerHeight < 500;
  const fov = tall ? 60 : low ? 30 : 36;
  if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  if (DBG && window.__portCam) {
    const c = window.__portCam, p = env.player.position;
    camera.position.set(p.x + Math.sin(c.yaw) * c.dist, p.y + c.h, p.z + Math.cos(c.yaw) * c.dist);
    camera.lookAt(p.x, p.y + 0.8, p.z);
    return;
  }
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
    const route = P.dir > 0 ? FAST_ROUTE : ROUTE_BACK;
    const st = fastStep(p, route, P.wp ?? 1, BOAT_SPEED * FAST_MULT * dt);
    P.wp = st.wp; next = st.p;
    if (Math.hypot(next.x - ox, next.z - oz) > 1e-6) P.heading = Math.atan2(-(next.x - ox), -(next.z - oz));
    if (st.done) return arrive();
  } else {
    const s = P.fishing ? { heading: P.heading, speed: Math.max(0, P.speed - dt * 10) } : steer(P, inputVec(), dt, { speed: BOAT_SPEED, turn: BOAT_TURN });
    P.heading = s.heading; P.speed = s.speed;
    next = { x: p.x - Math.sin(P.heading) * P.speed * dt, z: p.z - Math.cos(P.heading) * P.speed * dt };
    next = pushOutOfIsland(next, ISLAND, ISLAND_R + 2.2);
    next = pushOutOfCircles(next, BUOYS);
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
  P.fishing = { spot, t: 0, bite: first ? BITE_FIRST.delay : 1.2 + Math.random() * 1.6, win: first ? BITE_FIRST.win : BITE_WIN, state: 'cast' };
  castLine(spot.pos, env.player.position, env.player.rotation.y);
}

function aimAt(pos) {
  const me = env.player.position;
  return Math.atan2(pos.x - me.x, pos.z - me.z);
}

function tapFish() {
  const f = P.fishing; if (!f) return;
  if (f.state === 'wait') return twitchRod();
  if (f.state !== 'bite') return;
  const kind = rollCatch(f.spot.zone, Math.random());
  const gs = env.gameState(); gs.port = addToPantry(gs.port, { [kind]: 1 });
  P.trip.caught++; f.spot.left--;
  env.requestSave();
  f.state = 'lift';
  hookFish(kind, boat.position, at => env.popAt?.(at, PANTRY_ICO[kind]));
}

function stopFish() {
  const f = P.fishing; if (!f || f.state === 'lift' || f.state === 'reel') return;
  f.state = 'reel'; reelIn();
}

function fishTick(dt) {
  const f = P.fishing; if (!f) return;
  f.t += dt;
  const view = fishingState();
  if (f.state === 'cast' && view === 'wait') { f.state = 'wait'; f.t = 0; }
  else if (f.state === 'wait' && f.t > f.bite) { f.state = 'bite'; f.t = 0; env.popAt?.(f.spot.pos, '❗'); }
  else if (f.state === 'bite' && f.t > f.win) { env.popAt?.(f.spot.pos, '💨'); stopFish(); }
  else if ((f.state === 'lift' || f.state === 'reel') && !view) P.fishing = null;
  if ((f.state === 'wait' || f.state === 'bite') && Math.hypot(...Object.values(inputVec())) > 0.5) stopFish();
}

function rodTick(dt) {
  const f = P.fishing, aim = f ? aimAt(castSpot()) : null;
  if (aim != null) env.player.rotation.y = aim;
  tickFishing(dt, P.t, { yaw: env.player.rotation.y, bite: f?.state === 'bite', aimYaw: aim, ready: !!f || (!P.fast && !!nearSpot(ROD_READY_R)) });
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

const ISLAND_BTN = { port_next: '💬', port_talk: '💬', port_pick: '✋', port_buy: '🛒', port_board: '🛶' };

function btnState() {
  const f = P.fishing;
  if (f) return f.state === 'bite' ? ['낚아채기!', 'hook', false] : ['낚아채기', 'wait', false];
  if (P.phase === 'sail' && !P.fast && nearSpot(3.4)) return ['🎣 던지기', '', false];
  if (P.phase === 'island') return [ISLAND_BTN[env.$w.nearDoor] ?? '🏝️', ISLAND_BTN[env.$w.nearDoor] ? '' : 'wait', false];
  return ['', 'idle', false];
}

function hudTick() {
  const st = btnState(), key = st.join('|');
  if (key !== btnKey) { btnKey = key; env.ui.setSeaBtn?.(...st); }
}

export function updatePort(dt) {
  P.t += dt;
  const isNight = !!env.isNight?.();
  if (isNight !== night) { night = isNight; setPortNight(boat, isNight); for (const m of Object.values(npcs)) setNpcNight(m, isNight); }
  spotsTick(isNight);
  if (port.active && P.phase === 'island') residentsTick();
  fishTick(dt);
  if (P.phase === 'sail') { sailTick(dt); if (port.active && P.phase === 'sail') rodTick(dt); }
  if (port.active) hudTick();
}

export function portAction() {
  const nd = env.$w.nearDoor;
  if (nd === 'port_cast') return startFish(nearSpot(3.4));
  if (nd === 'port_fish') return tapFish();
  if (P.phase !== 'island') return;
  if (nd === 'port_next') return advanceTalk();
  const c = islandContext();
  if (!c) return;
  if (c.nd === 'port_pick') return pick(c.it);
  if (c.nd === 'port_talk') return talkTo(c.id, c.kind);
  if (c.nd === 'port_buy') return buy();
  if (c.nd === 'port_board') return leaveIsland(false);
}

export function portPrompt() {
  if (P.phase === 'sail' && P.fishing) return { nd: 'port_fish', prompt: '' };
  if (P.phase === 'sail' && !P.fast && nearSpot(3.4)) return { nd: 'port_cast', prompt: '' };
  if (P.phase !== 'island') return { nd: null, prompt: '' };
  const c = islandContext();
  setChips(c?.nd === 'port_board' && portState().fastUnlocked ? 'island' : null);
  return c ? { nd: c.nd, prompt: c.prompt ?? '' } : { nd: null, prompt: '' };
}

function setChips(kind) {
  if (kind === chipKey) return;
  chipKey = kind;
  if (env.$w) env.$w.lastFloorChoiceKey = kind ? 'port_board,port_fast' : null;
  env.ui?.setFloorChoice?.(kind ? [
    { label: PORT_COPY.board, onSelect: () => leaveIsland(false) },
    { label: PORT_COPY.fastHome, onSelect: () => leaveIsland(true) },
  ] : null);
}

function nearItem(p) {
  const pq = portState().quests;
  let best = null, bd = PICK_R;
  for (const it of items) {
    if (it.taken || !it.mesh.visible) continue;
    const s = pq[it.id], q = QUESTS.find(x => x.id === it.id);
    if (s?.state !== 'active' || s.got >= q.need) continue;
    const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}

function nearNpc(p) {
  let best = null, bd = TALK_R;
  for (const q of QUESTS) { const m = npcs[q.id], d = Math.hypot(m.position.x - p.x, m.position.z - p.z); if (d < bd) { bd = d; best = q; } }
  return best;
}

function talkKind(q, s) {
  if (!questOpen(q)) return s.state === 'done' ? null : 'sleep';
  if (s.state === 'avail') return 'accept';
  if (s.state === 'active') return s.got >= q.need ? 'turnin' : 'remind';
  return null;
}

function islandContext() {
  if (talk) return { nd: 'port_next' };
  const p = env.player.position, ps = portState();
  const it = nearItem(p);
  if (it) return { nd: 'port_pick', it };
  const q = nearNpc(p);
  const kind = q && talkKind(q, ps.quests[q.id]);
  if (kind) return { nd: 'port_talk', id: q.id, kind };
  if (guideHides()) return null;
  if (ps.boughtDay !== env.todayStr() && Math.hypot(p.x - PORT.x - MARKET_POS.x, p.z - PORT.z - MARKET_POS.z) < TALK_R) return { nd: 'port_buy' };
  if (guide?.current()?.id === 'free') boardArmed = true;
  const g = boardGate(boardArmed, Math.hypot(p.x - PORT.x - PIER_END.x, p.z - PORT.z - PIER_END.z), PIER_END_R);
  boardArmed = g.armed;
  if (g.can) return { nd: 'port_board', prompt: PORT_COPY.home };
  return null;
}

function showLine() {
  const def = ISLAND_NPCS[talk.id];
  const badge = '#' + def.badge.toString(16).padStart(6, '0');
  showTalk({ face: '', color: `url(${npcPortrait(talk.id)}) center / 100% no-repeat, ${badge}44`, name: def.name, line: talk.lines[0], next: env.isTouch() ? '▶ 탭' : '▶ Space · 클릭' });
}

function talkTo(id, kind) {
  const q = QUESTS.find(x => x.id === id), s = portState().quests[id];
  const gs = env.gameState();
  let lines, onDone = null;
  if (kind === 'accept') {
    lines = splitLines(q.ask);
    onDone = () => {
      gs.port = acceptQuest(portState(), id); showItems(id);
      env.trackEvent('port_quest', { quest_id: id, act: 'accept' }); env.refreshQuestPanel(); env.requestSave();
    };
  } else if (kind === 'turnin') {
    const r = claimQuest(portState(), id); if (!r) return;
    gs.port = r.port; P.trip.quests++;
    items.filter(it => it.id === id).forEach(it => { it.mesh.visible = false; });
    env.popAt?.(npcs[id].position, Object.entries(r.reward).map(([k, n]) => `${PANTRY_ICO[k]}+${n}`).join(' '));
    env.trackEvent('port_quest', { quest_id: id, act: 'done' }); env.refreshQuestPanel(); env.requestSave();
    lines = splitLines(q.thanks);
  } else if (kind === 'sleep') lines = [...PORT_COPY.sleep];
  else lines = [PORT_COPY.nag, `${q.itemName} (${s.got}/${q.need})`];
  talk = { id, lines, onDone };
  onTalkTap(advanceTalk);
  showLine();
}

function advanceTalk() {
  if (!talk) return;
  talk.lines = talk.lines.slice(1);
  if (talk.lines.length) return showLine();
  const done = talk.onDone; talk = null; hideTalk(); done?.();
}

function closeTalk() {
  if (!talk) return;
  talk = null;
  if (talkShown()) hideTalk();
}

function pick(it) {
  const gs = env.gameState(), q = QUESTS.find(x => x.id === it.id);
  gs.port = pickItem(portState(), it.id);
  it.taken = true; it.mesh.visible = false;
  env.popAt?.(it.pos, `✋ ${gs.port.quests[it.id].got}/${q.need}`);
  env.refreshQuestPanel(); env.requestSave();
}

function buy() {
  if (!env.spendCoins(MARKET_PRICE)) { env.ui.toast?.(PORT_COPY.noCoins, 2000); return; }
  const gs = env.gameState();
  gs.port = { ...addToPantry(portState(), MARKET_GIVE), boughtDay: env.todayStr() };
  env.popAt?.(W(MARKET_POS.x, MARKET_POS.z), Object.entries(MARKET_GIVE).map(([k, n]) => `${PANTRY_ICO[k]}+${n}`).join(' '));
  env.ui.toast?.(PORT_COPY.market, 3200);
  env.requestSave();
}

function leaveIsland(fast) {
  if (!port.active || P.phase !== 'island') return;
  closeTalk(); setChips(null);
  boat.position.copy(W(ISLAND_DOCK.x, ISLAND_DOCK.z));
  Object.assign(P, { phase: 'sail', dir: -1, fast, wp: 1, speed: 0, heading: Math.PI / 2 });
  boat.rotation.y = P.heading;
  seatPlayer();
}

function arrive() {
  P.speed = 0; P.fast = false; P.wp = 1;
  if (P.dir > 0) return arriveIsland();
  const gs = env.gameState();
  const cur = gs.port;
  env.trackEvent('port_trip', { via: P.trip.via, caught: P.trip.caught, quests: P.trip.quests, sec: Math.round((performance.now() - P.trip.t0) / 1000) });
  if (!cur.fastUnlocked) { gs.port = { ...cur, visited: true, fastUnlocked: true }; env.ui.toast?.(PORT_COPY.arrive); }
  env.requestSave();
  flushGuideHome();
  env.exitSea();
}

function arriveIsland() {
  P.phase = 'island';
  boardArmed = false;
  boat.position.copy(W(ISLAND_DOCK.x, ISLAND_DOCK.z)); boat.rotation.y = -Math.PI / 2;
  env.player.position.copy(W(PIER_END.x, PIER_END.z, LAND_Y));
  env.player.rotation.y = Math.PI / 2;
  syncItems();
  env.refreshQuestPanel();
}

export function startPortGuide() {
  const gs = env.gameState();
  if (guide || !gs.port || gs.port.guideDone) return;
  view ??= createGuideView({ scene: env.scene, camera: env.camera, root: env.hudRoot });
  guideHome = false;
  guide = createGuide({ flow: 'port', steps: portGuideSteps(), now: () => performance.now(),
    onStep: e => env.trackEvent('guide_step', e),
    onDone: () => { const g = env.gameState(); g.port = { ...g.port, guideDone: true }; env.requestSave(); view.hide(); setPoint(null); guide = null; if (DBG) window.__portGuide = { step: null }; } });
}

export function maybeStartPortGuide(ok) { if (ok) startPortGuide(); }

function nearest(list, ok, pos, from) {
  let best = null, bd = Infinity;
  for (const o of list) { if (!ok(o)) continue; const p = pos(o), d = Math.hypot(p.x - from.x, p.z - from.z); if (d < bd) { bd = d; best = p; } }
  return best;
}
const liveSpot = sp => sp.left > 0 && sp.mesh.visible, spotPos = sp => sp.pos;
const fisherItem = it => it.id === 'fisher' && !it.taken && it.mesh.visible, itemPos = it => it.pos;

function pierVia(p) {
  const { ax, az, end } = PORT_PIER, ex = end.x - ax, ez = end.z - az, len = Math.hypot(ex, ez);
  const t = Math.max(0, Math.min(1, ((p.x - ax) * ex + (p.z - az) * ez) / (len * len)));
  if (Math.hypot(p.x - ax - ex * t, p.z - az - ez * t) < 1) return null;
  return { x: ax - (ex / len) * 0.6, z: az - (ez / len) * 0.6 };
}

function guideCtx() {
  const phase = guideHome ? 'done' : port.active ? P.phase : 'village';
  const fq = portState()?.quests?.fisher;
  const sea = port.active && P.phase === 'sail';
  return {
    phase, done: phase === 'done', dir: P.dir, moved: P.moved, device: env.isTouch() ? 'phone' : 'pc',
    nearPier: !port.active && !guideHome && nearPortPier(env.player.position),
    canCast: sea && !P.fast && !!nearSpot(3.4), fishing: !!P.fishing, caught: port.active ? P.trip?.caught ?? 0 : 0,
    quest: fq?.state, got: fq?.got ?? 0,
    pierEnd: GUIDE_AT.pierEnd,
    pierVia: port.active ? null : pierVia(env.player.position),
    boat: portPierBoat?.position,
    spot: port.active ? nearest(P.spots, liveSpot, spotPos, boat.position) : null,
    islandDock: GUIDE_AT.islandDock,
    fisher: npcs.fisher?.position,
    item: port.active ? nearest(items, fisherItem, itemPos, env.player.position) : null,
    pierEndIsland: GUIDE_AT.pierEndIsland,
    villageDock: GUIDE_AT.villageDock,
  };
}

function setPoint(k) {
  if (k === pointKey) return;
  pointKey = k; env.setActPoint?.(k);
}

function flushGuideHome() {
  if (!guide) return;
  guideHome = true;
  guide.tick(guideCtx());
}

const NO_SOLIDS = [];
export function updatePortGuide(visible) {
  if (!guide) return;
  const ctx = guideCtx();
  guide.tick(ctx);
  if (!guide) return;
  const step = guide.current(), island = port.active && P.phase === 'island';
  const me = port.active && P.phase === 'sail' ? boat.position : env.player.position;
  const sol = island ? GUIDE_AT.solids : NO_SOLIDS;
  const nd = env.$w.nearDoor, want = !!step?.expect?.includes(nd) && !(nd === 'port_fish' && P.fishing?.state !== 'bite');
  if (!visible) { view.hide(); setPoint(null); }
  else {
    view.show(step, guide.index(), guide.total, ctx, me, sol, island ? LAND_Y : 0);
    setPoint(want ? (talkShown() ? 'talk' : 'btn') : null);
  }
  if (DBG) window.__portGuide = guideInfo(step, ctx, nd);
}

function guideInfo(step, ctx, nd) {
  const tgt = step?.target(ctx), via = step?.via?.(ctx);
  return { step: step?.id ?? null, index: guide.index(), target: tgt ? { x: tgt.x, z: tgt.z } : null, via: via ? { x: via.x, z: via.z } : null, nearDoor: nd };
}
