import * as THREE from 'three';
import { $w, atFarm, gameState, player, scene, ui } from '../game.js';
import { onTrack, trackEvent } from '../analytics.js';
import { t } from '../i18n.js';
import { ACQ_EVENTS } from '../exp-e1.js';
import { makeCtx } from './halloween-art.js';
import { buildGhostKid, buildJack } from './halloween-event-art.js';
import { enterHalloween, halloweenOpen, hwState } from './halloween.js';
import { exitFarm, visitorTarget } from './visitors.js';
import { inVillage2 } from './doors.js';
import { arrivalEligible, arrivalSpots, arrivalTimeline, nearestSpot } from '../halloween/arrival-logic.js';

const TOUCH_KEY = 'cf_first_touch';
const FORCE = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('hwarrival');

let state = null, acquired = false, checked = false, readySince = null, nearLogged = false;

onTrack((name) => { if (ACQ_EVENTS.includes(name)) acquired = true; });

function readTouch() {
  try { return JSON.parse(localStorage.getItem(TOUCH_KEY) || 'null'); } catch { return null; }
}

function hasAcquired() {
  if (acquired || FORCE) return true;
  if (gameState.e1?.harvested) return true;
  return Object.values(gameState.dex || {}).some(c => c && Object.keys(c).length > 0);
}

function sparkTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(225,215,255,.8)'); r.addColorStop(1, 'rgba(200,190,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function build(anchor, onFarm) {
  const ctx = makeCtx(THREE), group = new THREE.Group();
  const spots = arrivalSpots(anchor);
  const jacks = spots.map((s, i) => {
    const j = buildJack(THREE, ctx, { lit: true, size: i === 2 ? 0.8 : 1 });
    j.position.set(s.x, 0, s.z); j.rotation.y = s.x < anchor.x ? 0.45 : -0.45; j.visible = false;
    group.add(j);
    const face = j.children[1].material;
    return { j, face, base: face.emissiveIntensity };
  });
  const ghost = buildGhostKid(THREE, ctx); ghost.scale.setScalar(1.3); group.add(ghost);
  const n = 36, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const trail = new THREE.Points(geo, new THREE.PointsMaterial({ map: sparkTexture(), size: 0.22, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  trail.frustumCulled = false; group.add(trail);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.7, 40), new THREE.MeshBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; ring.visible = false; group.add(ring);
  const seeds = Array.from({ length: n }, (_, i) => [((i * 0.6180339) % 1), ((i * 0.381966) % 1) - 0.5, ((i * 0.7548776) % 1) - 0.5]);
  scene.add(group);
  return { group, anchor, onFarm, spots, jacks, ghost, trail, ring, seeds, t0: null, near: -1 };
}

function dispose() {
  if (!state) return;
  scene.remove(state.group);
  state.group.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose?.(); x.dispose?.(); }); });
  state = null;
}

function canStart() {
  const b = document.body.classList;
  return b.contains('playing') && !b.contains('intro-open') && !$w.sleeping && !ui.anyModalOpen?.() && (atFarm || inVillage2());
}

function ghostAt(time) {
  const g = arrivalTimeline(time).ghost;
  return { x: state.anchor.x + g.x, y: g.y, z: state.anchor.z + g.z };
}

export function updateHalloweenArrival(dt, time) {
  if (state && (!halloweenOpen() || hwState().visits > 0)) { dispose(); return; }
  if (!state) {
    if (checked) return;
    if (!canStart()) { readySince = null; return; }
    if (readySince === null) readySince = time;
    if (time - readySince < 1.2) return;
    checked = true;
    if (!arrivalEligible({ touch: readTouch(), open: halloweenOpen(), visits: hwState().visits, force: FORCE })) return;
    state = build({ x: player.position.x, z: player.position.z }, atFarm);
    trackEvent('hw_arrival', { step: 'shown', place: atFarm ? 'farm' : 'village' });
  }
  state.group.visible = state.onFarm === atFarm;
  if (!state.group.visible) return;
  if (state.t0 === null) state.t0 = time;
  const el = time - state.t0, tl = arrivalTimeline(el);
  state.ghost.visible = tl.ghostOn;
  if (tl.ghostOn) {
    const g = ghostAt(el); state.ghost.position.set(g.x, g.y, g.z); state.ghost.rotation.y = -Math.PI / 2 + 0.3 * Math.sin(el * 3);
  }
  state.trail.visible = tl.ghostOn;
  if (tl.ghostOn) {
    const pos = state.trail.geometry.attributes.position;
    state.seeds.forEach(([lag, dy, dz], i) => { const g = ghostAt(Math.max(0, el - lag * 0.7)); pos.setXYZ(i, g.x + dy * 0.2, g.y + 0.3 + dy * 0.3, g.z + dz * 0.3); });
    pos.needsUpdate = true;
  }
  state.jacks.forEach((o, i) => {
    o.j.visible = tl.dropped[i];
    if (!tl.dropped[i]) return;
    const f = tl.fall[i], b = tl.bounce[i];
    o.j.position.y = f < 1 ? 1.3 * (1 - f * f) : 0.18 * Math.sin(b * Math.PI) * (1 - b);
    const sq = f >= 1 && b < 1 ? 1 - 0.2 * Math.sin(b * Math.PI) : 1;
    o.j.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    const flick = tl.lit[i] >= 1 ? 1 + 0.12 * Math.sin(time * 7.3 + i) + 0.06 * Math.sin(time * 13.1) : tl.lit[i];
    o.face.emissiveIntensity = o.base * flick;
  });
  state.ring.visible = state.near >= 0;
  if (state.near >= 0) {
    const s = state.spots[state.near];
    state.ring.position.set(s.x, 0.06, s.z);
    state.ring.material.opacity = 0.75 + 0.2 * Math.sin(time * 4);
  }
}

export function arrivalPrompt(p) {
  if (!state || state.onFarm !== atFarm || !state.jacks.every(o => o.j.visible)) return null;
  if (!hasAcquired() || visitorTarget()) { state.near = -1; return null; }
  const i = nearestSpot(state.spots, p);
  if (i >= 0 && !nearLogged) { nearLogged = true; trackEvent('hw_arrival', { step: 'near', place: atFarm ? 'farm' : 'village' }); }
  state.near = i;
  return i >= 0 ? { nd: 'hwpumpkin', prompt: t('🎃 달빛 유령 정원으로 가기') } : null;
}

export function pumpkinAction() {
  if (!state) return;
  trackEvent('hw_arrival', { step: 'tap', place: atFarm ? 'farm' : 'village' });
  if (atFarm) exitFarm();
  enterHalloween('pumpkin');
}
