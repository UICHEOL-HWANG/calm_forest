const SIZE = 96;
const RATIO = 2;
const DIR = [0.55, 0.45, 0.75];

function frame(THREE, mesh) {
  const sphere = new THREE.Box3().setFromObject(mesh).getBoundingSphere(new THREE.Sphere());
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const dist = (sphere.radius / Math.sin((cam.fov / 2) * (Math.PI / 180))) * 1.05;
  cam.position.copy(sphere.center).add(new THREE.Vector3(...DIR).normalize().multiplyScalar(dist));
  cam.lookAt(sphere.center);
  return cam;
}

function sceneOf(THREE, mesh) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e8, 0x8a7a68, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(2, 4, 3);
  scene.add(sun, mesh);
  return scene;
}

function dispose(mesh) {
  mesh.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    o.material.dispose();
  });
}

export function makeThumbs(THREE, build) {
  const cache = new Map();
  return (ids) => {
    const todo = ids.filter((id) => !cache.has(id));
    if (todo.length) {
      let r = null;
      try {
        r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        r.setPixelRatio(RATIO);
        r.setSize(SIZE, SIZE);
        r.outputColorSpace = THREE.SRGBColorSpace;
        for (const id of todo) {
          const mesh = build(THREE, id);
          if (!mesh) continue;
          r.render(sceneOf(THREE, mesh), frame(THREE, mesh));
          cache.set(id, r.domElement.toDataURL('image/png'));
          dispose(mesh);
        }
      } catch (e) {
        console.warn('[weekly] thumbs failed', e);
      } finally {
        r?.dispose?.();
        r?.forceContextLoss?.();
      }
      for (const id of todo) if (!cache.has(id)) cache.set(id, null);
    }
    return Object.fromEntries(ids.map((id) => [id, cache.get(id) || null]));
  };
}
