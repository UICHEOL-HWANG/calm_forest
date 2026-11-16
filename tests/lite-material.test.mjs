import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { liteMaterialOn, makeLiteStandard } from '../js/lite-material.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

test('liteMaterialOn: 폰은 켜고 데스크톱은 끈다', () => {
  assert.equal(liteMaterialOn({ ua: IPHONE }), true);
  assert.equal(liteMaterialOn({ ua: ANDROID }), true);
  assert.equal(liteMaterialOn({ ua: MAC, touchPoints: 0, screenMin: 1440 }), false);
});

test('liteMaterialOn: 데스크톱 UA 로 위장한 아이패드(터치·작은 화면)와 ?touchsim=1 도 켠다', () => {
  assert.equal(liteMaterialOn({ ua: MAC, touchPoints: 5, screenMin: 768 }), true);
  assert.equal(liteMaterialOn({ ua: MAC, touchPoints: 5, screenMin: 1024 }), false);
  assert.equal(liteMaterialOn({ ua: MAC, search: '?touchsim=1' }), true);
  assert.equal(liteMaterialOn(), false);
});

test('makeLiteStandard: Lambert 셰이더로 그리고 거칠기·금속성 값은 보관한다', () => {
  const Lite = makeLiteStandard(THREE.MeshLambertMaterial);
  const m = new Lite({ color: 0x336699, roughness: 0.95, metalness: 0, flatShading: true, vertexColors: true });
  assert.ok(m.isMeshLambertMaterial);
  assert.equal(m.type, 'MeshLambertMaterial');
  assert.equal(m.roughness, 0.95);
  assert.equal(m.metalness, 0);
  assert.equal(m.flatShading, true);
  assert.equal(m.vertexColors, true);
  assert.equal(m.color.getHex(), 0x336699);
  const d = new Lite();
  assert.equal(d.roughness, 1);
  assert.equal(d.metalness, 0);
});

test('makeLiteStandard: Standard 전용 옵션을 넘겨도 경고가 없다', () => {
  const Lite = makeLiteStandard(THREE.MeshLambertMaterial);
  const warn = console.warn;
  const seen = [];
  console.warn = (...a) => seen.push(a.join(' '));
  try {
    new Lite({ color: 0xffffff, emissive: 0xffcc66, emissiveIntensity: 0.4, roughness: 0.5, metalness: 0.1, roughnessMap: null, metalnessMap: null, envMapIntensity: 1, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  } finally { console.warn = warn; }
  assert.deepEqual(seen, []);
});

test('makeLiteStandard: clone 이 같은 클래스·값을 유지한다(묶음 키가 roughness 를 읽는다)', () => {
  const Lite = makeLiteStandard(THREE.MeshLambertMaterial);
  const m = new Lite({ color: 0x123456, roughness: 0.1, metalness: 0.2, flatShading: true });
  m.emissiveIntensity = 0.7;
  const c = m.clone();
  assert.ok(c instanceof Lite);
  assert.equal(c.roughness, 0.1);
  assert.equal(c.metalness, 0.2);
  assert.equal(c.flatShading, true);
  assert.equal(c.emissiveIntensity, 0.7);
  assert.equal(c.color.getHex(), 0x123456);
});

test('three-lite: 진짜 three 를 three-core 로 받아 MeshStandardMaterial 만 갈아 끼운다', () => {
  const src = readFileSync(new URL('../js/three-lite.js', import.meta.url), 'utf8');
  assert.match(src, /export \* from 'three-core'/);
  assert.match(src, /export const MeshStandardMaterial\b/);
});

test('index.html importmap: three 는 three-lite, three-core 는 고정 버전 CDN', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /"three": "\.\/js\/three-lite\.js"/);
  assert.match(html, /"three-core": "https:\/\/unpkg\.com\/three@0\.160\.0\/build\/three\.module\.js"/);
});

test('프롤로그 채도 낮추기는 가벼운 재질에도 걸린다', () => {
  const src = readFileSync(new URL('../js/spaces/prologue-set.js', import.meta.url), 'utf8');
  assert.match(src, /isMeshLambertMaterial/);
});

async function loadShim(env) {
  const { build } = await import('esbuild');
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { pathToFileURL, fileURLToPath } = await import('node:url');
  const dir = mkdtempSync(path.join(tmpdir(), 'cf-lite-'));
  const vendor = fileURLToPath(new URL('../vendor/three/three.module.js', import.meta.url));
  const out = path.join(dir, 'shim.mjs');
  await build({
    entryPoints: [fileURLToPath(new URL('../js/three-lite.js', import.meta.url))], bundle: true, format: 'esm', outfile: out, logLevel: 'error',
    plugins: [{ name: 'core', setup: (b) => b.onResolve({ filter: /^three-core$/ }, () => ({ path: vendor })) }],
  });
  const saved = { location: globalThis.location, screen: globalThis.screen };
  Object.assign(globalThis, env);
  try { return await import(pathToFileURL(out).href); } finally { Object.assign(globalThis, saved); rmSync(dir, { recursive: true, force: true }); }
}

test('three-lite 묶음: 모바일이면 MeshStandardMaterial 이 Lambert, 아니면 진짜 Standard', async () => {
  const phone = await loadShim({ location: { search: '?touchsim=1' }, screen: { width: 390, height: 844 } });
  assert.ok(new phone.MeshStandardMaterial({ roughness: 0.9 }).isMeshLambertMaterial);
  assert.ok(new phone.MeshLambertMaterial().isMeshLambertMaterial);
  const desk = await loadShim({ location: { search: '' }, screen: { width: 1920, height: 1080 } });
  assert.ok(new desk.MeshStandardMaterial().isMeshStandardMaterial);
  assert.equal(typeof desk.Scene, 'function');
});
