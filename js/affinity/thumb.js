import * as THREE from 'three';
import { buildAffinityOutdoor } from './art.js';

const cache = new Map();
let renderer = null;

export function affinityThumb(id, size = 240) {
  const key = `${id}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const g = buildAffinityOutdoor(id, null);
  if (!g) return null;
  try {
    renderer ??= new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setSize(size, size, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbfe8c9, 0.95));
  const sun = new THREE.DirectionalLight(0xffe9c4, 1.1); sun.position.set(4, 8, 6); scene.add(sun);
  g.rotation.y = 0.35; scene.add(g);
  const box = new THREE.Box3().setFromObject(g);
  const h = box.max.y, w = box.max.x - box.min.x;
  const d = Math.max(h, w * 0.8) * 2.0;
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  cam.position.set(d * 0.55, d * 0.55 + h * 0.42, d); cam.lookAt(0, h * 0.42, 0);
  renderer.render(scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  scene.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  cache.set(key, url);
  return url;
}
