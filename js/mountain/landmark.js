import { landmarkMountain, cloudBand, landmarkFootRadius } from './backdrop.js';

export const LANDMARK = Object.freeze({ radius: 7, height: 6.5, spur: 1.2, groundColor: 0xd3e2b0, frontGap: 0.38, cloudScale: 2.2 });

const STOP_K = 0.9;

export function buildLandmark(THREE) {
  const { radius, height, frontGap, cloudScale } = LANDMARK;
  const group = new THREE.Group();
  group.add(landmarkMountain(THREE, LANDMARK), cloudBand(THREE, radius, height, frontGap, cloudScale, true));
  return group;
}

export function landmarkFoot(a) {
  return landmarkFootRadius(a, LANDMARK.radius, LANDMARK.spur);
}

export function landmarkStopR(a) {
  return landmarkFoot(a) * STOP_K;
}

export function landmarkStop(x, z) {
  const d = Math.hypot(x, z);
  const a = d > 1e-9 ? Math.atan2(z, x) : Math.PI / 2;
  const stop = landmarkStopR(a);
  if (d >= stop) return { x, z };
  return { x: Math.cos(a) * stop, z: Math.sin(a) * stop };
}

export function onMountainside(x, z, centre, footprint) {
  return Math.hypot(x - centre.x, z - centre.z) < footprint;
}
