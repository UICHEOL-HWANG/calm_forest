import { buildBackdrop } from './backdrop.js';

const disposeMaterial = m => (Array.isArray(m) ? m : [m]).forEach(x => x?.dispose());

function disposeGroup(group) {
  group.traverse(o => {
    o.geometry?.dispose();
    if (o.material) disposeMaterial(o.material);
  });
}

const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createReveal({ THREE, scene, camera, setCameraRig, from, at, durationMs }) {
  let backdrop = null;
  const startPos = new THREE.Vector3(), startLook = new THREE.Vector3(), look = new THREE.Vector3();
  const peak = new THREE.Vector3(at.x, at.y, at.z);
  let elapsed = 0, running = false;
  const rig = cam => {
    const k = Math.min(1, elapsed / (durationMs / 1000));
    const up = k < 0.35 ? ease(k / 0.35) : k > 0.75 ? ease((1 - k) / 0.25) : 1;
    cam.position.copy(startPos);
    look.copy(startLook).lerp(peak, up);
    cam.lookAt(look);
  };
  const finish = () => {
    if (!running) return;
    running = false;
    scene.remove(backdrop);
    disposeGroup(backdrop);
    backdrop = null;
    setCameraRig(null);
  };
  return {
    group() {
      return backdrop;
    },
    start() {
      backdrop = buildBackdrop(THREE, { radius: 60, height: 34, frontGap: 0.38 });
      backdrop.position.set(at.x, 0, at.z);
      startPos.copy(camera.position);
      startLook.copy(from);
      scene.add(backdrop);
      elapsed = 0;
      running = true;
      setCameraRig(rig);
    },
    finish,
    update(dt) {
      if (!running) return false;
      elapsed += dt;
      if (elapsed < durationMs / 1000) return true;
      finish();
      return false;
    },
  };
}
