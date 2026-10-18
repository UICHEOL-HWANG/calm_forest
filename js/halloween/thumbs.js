import * as THREE from 'three';
import { CANDY_DECOR_IDS, buildCandyDecor } from './decor-art.js';

let cache = null;

export function renderRewardThumbs() {
  if (cache) return cache;
  cache = {};
  let r = null;
  try {
    r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(2); r.setSize(96, 96); r.outputColorSpace = THREE.SRGBColorSpace;
    for (const id of CANDY_DECOR_IDS) {
      const sc = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xfff4e8, 0x6a5a7a, 1.4));
      const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(2, 4, 3); sc.add(d);
      const m = buildCandyDecor(id); sc.add(m);
      const box = new THREE.Box3().setFromObject(m), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3()).length();
      const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 50); cam.position.set(c.x + s * 0.9, c.y + s * 0.7, c.z + s * 1.6); cam.lookAt(c);
      r.render(sc, cam);
      cache[id] = r.domElement.toDataURL('image/png');
      m.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
    }
  } catch (e) {
    console.warn('[halloween] thumbs failed', e);
  } finally {
    r?.dispose(); r?.forceContextLoss?.();
  }
  return cache;
}
