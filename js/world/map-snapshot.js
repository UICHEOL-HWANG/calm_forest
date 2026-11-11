import * as THREE from 'three';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MAP_VIEW } from './village-map.js';

export const SHOT_DESKTOP = 1024;
export const SHOT_MOBILE = 640;
export const FIRST_SHOT_DELAY = 2000;
export const DIRTY_SETTLE = 3000;
export const SIGNATURE_EVERY = 1000;
export const COMPILE_TIMEOUT = 8000;
export const MAX_RETRIES = 3;
export const BOOK_TONE = Object.freeze({ saturate: 1.55, brightness: 1.16, contrast: 1.08 });

const CAM_HEIGHT = 120;
const SHADOW_AWAY = 5000;
const NOON_SUN = 1.3;
const NOON_HEMI = 0.95;
const NO_FOG = 1e6;

export const shotSize = mobile => (mobile ? SHOT_MOBILE : SHOT_DESKTOP);

export function mapCameraFrame(view = MAP_VIEW) {
  const cx = view.x0 + view.w / 2, cz = view.z0 + view.h / 2;
  return {
    position: [cx, CAM_HEIGHT, cz], target: [cx, 0, cz], up: [0, 0, -1],
    left: -view.w / 2, right: view.w / 2, top: view.h / 2, bottom: -view.h / 2,
    near: 1, far: CAM_HEIGHT * 2,
  };
}

export function makeMapCamera(T, view = MAP_VIEW) {
  const f = mapCameraFrame(view);
  const cam = new T.OrthographicCamera(f.left, f.right, f.top, f.bottom, f.near, f.far);
  cam.up.set(...f.up);
  cam.position.set(...f.position);
  cam.lookAt(...f.target);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

export function flipRows(src, w, h) {
  const out = new Uint8ClampedArray(w * h * 4), row = w * 4;
  for (let y = 0; y < h; y++) out.set(src.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  return out;
}

const clamp255 = v => Math.min(255, Math.max(0, v));

export function saturate([r, g, b], s) {
  return [
    clamp255((0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b),
    clamp255((0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b),
    clamp255((0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b),
  ];
}

export const brightness = (rgb, k) => rgb.map(v => clamp255(v * k));

export const contrast = (rgb, k) => rgb.map(v => clamp255((v - 127.5) * k + 127.5));

export function bookTone(src, tone = BOOK_TONE) {
  const out = new Uint8ClampedArray(src.length), s = tone.saturate, k = tone.brightness, c = tone.contrast;
  const m = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
  const lift = 127.5 - 127.5 * c;
  const step = v => clamp255(clamp255(clamp255(v) * k) * c + lift);
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i], g = src[i + 1], b = src[i + 2];
    out[i] = step(m[0] * r + m[1] * g + m[2] * b);
    out[i + 1] = step(m[3] * r + m[4] * g + m[5] * b);
    out[i + 2] = step(m[6] * r + m[7] * g + m[8] * b);
    out[i + 3] = src[i + 3];
  }
  return out;
}

export function mapSignature({ season, houseStage, unlocks, outdoor }) {
  const u = [...(unlocks || [])].sort().join(',');
  const o = (outdoor || []).map(r => `${r.id}@${(+r.x).toFixed(1)},${(+r.z).toFixed(1)}/${r.rot ?? 0}`).sort().join(';');
  return `${season}|${houseStage}|${u}|${o}`;
}

const hasLight = o => { let found = false; o.traverse(c => { if (c.isLight) found = true; }); return found; };

function hideKeepingLights(o, out) {
  if (!o || !o.visible || o.isLight) return;
  if (!hasLight(o)) { out.add(o); return; }
  for (const c of o.children) hideKeepingLights(c, out);
}

const isGlow = o => {
  const m = o.material;
  if (!o.isMesh || !m || Array.isArray(m) || !m.transparent || m.depthWrite) return false;
  return m.blending === THREE.AdditiveBlending || o.geometry?.type === 'RingGeometry';
};

export function collectTransients(scene, extra = []) {
  const out = new Set();
  for (const o of extra) hideKeepingLights(o, out);
  scene.traverseVisible(o => { if (o.isSprite || o.isPoints || isGlow(o)) out.add(o); });
  return [...out];
}

let deps = null, outPass = null, shot = null, shotSig = null;
let readySince = 0, sigAt = 0, dirtyAt = 0, lastReady = false, phase = 'idle', wanted = false;
let compileAt = 0, compileToken = 0, fails = 0;
let stats = { ms: 0, count: 0, error: null };

export function initMapSnapshot(d) { deps = d; }
export function mapSnapshotInfo() { return { ...stats, has: shot === true, dirty: !!dirtyAt, phase }; }

function noonLights(L) {
  const saved = {
    sunPos: L.sun.position.clone(), sunTarget: L.sun.target.position.clone(), sun: L.sun.intensity,
    hemi: L.hemi.intensity, near: L.fog?.near, far: L.fog?.far,
  };
  const dir = saved.sunPos.clone().sub(saved.sunTarget);
  L.sun.intensity = NOON_SUN;
  L.hemi.intensity = NOON_HEMI;
  L.sun.target.position.set(SHADOW_AWAY, 0, 0);
  L.sun.position.copy(L.sun.target.position).add(dir);
  L.sun.target.updateMatrixWorld();
  if (L.fog) { L.fog.near = NO_FOG; L.fog.far = NO_FOG + 1; }
  return () => {
    L.sun.position.copy(saved.sunPos); L.sun.target.position.copy(saved.sunTarget); L.sun.target.updateMatrixWorld();
    L.sun.intensity = saved.sun; L.hemi.intensity = saved.hemi;
    if (L.fog) { L.fog.near = saved.near; L.fog.far = saved.far; }
  };
}

function renderShot() {
  const { renderer, scene } = deps, size = shotSize(deps.mobile);
  const cam = makeMapCamera(THREE, MAP_VIEW);
  const sceneRT = new THREE.WebGLRenderTarget(size, size, { type: THREE.HalfFloatType });
  const outRT = new THREE.WebGLRenderTarget(size, size);
  outPass = outPass || new OutputPass();
  const prev = renderer.getRenderTarget(), viewport = renderer.getViewport(new THREE.Vector4());
  const autoClear = renderer.autoClear, shadowAuto = renderer.shadowMap.autoUpdate, toneMapping = renderer.toneMapping;
  const buf = new Uint8Array(size * size * 4);
  let hidden = [], unlight = null;
  try {
    hidden = collectTransients(scene, deps.transients());
    unlight = noonLights({ sun: deps.sunLight, hemi: deps.hemiLight, fog: scene.fog });
    hidden.forEach(o => { o.visible = false; });
    renderer.autoClear = true;
    renderer.shadowMap.autoUpdate = true;
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(sceneRT);
    renderer.clear();
    renderer.render(scene, cam);
    renderer.toneMapping = THREE.NoToneMapping;
    outPass.render(renderer, outRT, sceneRT);
    renderer.readRenderTargetPixels(outRT, 0, 0, size, size, buf);
  } finally {
    hidden.forEach(o => { o.visible = true; });
    unlight?.();
    renderer.setRenderTarget(prev);
    renderer.setViewport(viewport);
    renderer.autoClear = autoClear;
    renderer.toneMapping = toneMapping;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.shadowMap.needsUpdate = true;
    sceneRT.dispose(); outRT.dispose();
  }
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  canvas.getContext('2d').putImageData(new ImageData(bookTone(flipRows(buf, size, size)), size, size), 0, 0);
  return canvas;
}

function takeShot(now) {
  const sig = deps.signature();
  dirtyAt = 0; shotSig = sig; sigAt = now;
  try {
    const t0 = performance.now();
    let canvas = null;
    deps.daylight(() => { canvas = renderShot(); });
    stats = { ms: Math.round(performance.now() - t0), count: stats.count + 1, error: null };
    shot = true; fails = 0;
    deps.onShot(canvas);
  } catch (e) {
    stats = { ...stats, error: String(e?.message || e) };
    if (shot !== true) shot = false;
    fails += 1;
    if (fails <= MAX_RETRIES) shotSig = null;
  }
}

function prepare(now) {
  phase = 'compiling'; compileAt = now;
  const token = ++compileToken;
  const { renderer, scene } = deps;
  const rt = new THREE.WebGLRenderTarget(1, 1);
  const prev = renderer.getRenderTarget(), viewport = renderer.getViewport(new THREE.Vector4());
  let job = null;
  try {
    renderer.setRenderTarget(rt);
    const cam = makeMapCamera(THREE, MAP_VIEW);
    job = renderer.extensions?.has('KHR_parallel_shader_compile') ? renderer.compileAsync(scene, cam) : renderer.compile(scene, cam);
  } catch (e) {
    stats = { ...stats, error: String(e?.message || e) };
  } finally {
    renderer.setRenderTarget(prev);
    renderer.setViewport(viewport);
  }
  Promise.resolve(job).catch(() => {}).finally(() => { rt.dispose(); if (token === compileToken) phase = 'ready'; });
}

const due = now => (shot === null ? now - readySince >= FIRST_SHOT_DELAY : wanted || (dirtyAt && now - dirtyAt >= DIRTY_SETTLE));

export function tickMapSnapshot(ready, now = performance.now()) {
  lastReady = !!ready;
  if (!deps || !ready) { readySince = 0; return; }
  if (!readySince) readySince = now;
  if (shot !== null && now - sigAt >= SIGNATURE_EVERY) {
    sigAt = now;
    const sig = deps.signature();
    if (sig === shotSig) dirtyAt = 0;
    else if (!dirtyAt) dirtyAt = now;
  }
  if (phase === 'compiling' && now - compileAt >= COMPILE_TIMEOUT) { compileToken += 1; phase = 'ready'; }
  if (!due(now)) return;
  if (phase === 'idle') prepare(now);
  else if (phase === 'ready') { phase = 'idle'; wanted = false; takeShot(now); }
}

export function requestMapSnapshot() {
  if (!deps || !lastReady || shot === null || deps.signature() === shotSig) return;
  wanted = true;
  if (phase === 'idle') prepare(performance.now());
}
