import { landmarkMountain, cloudBand, landmarkFootRadius } from './backdrop.js';

export const LANDMARK = Object.freeze({ radius: 7, height: 6.5, spur: 1.2, groundColor: 0xd3e2b0, frontGap: 0.38, cloudScale: 2.2 });

const SOLID_COUNT = 48;
const SOLID_R = 0.4;
const SOLID_STOP = 0.9;

export function buildLandmark(THREE) {
  const { radius, height, frontGap, cloudScale } = LANDMARK;
  const group = new THREE.Group();
  group.add(landmarkMountain(THREE, LANDMARK), cloudBand(THREE, radius, height, frontGap, cloudScale));
  return group;
}

export function landmarkFoot(a) {
  return landmarkFootRadius(a, LANDMARK.radius, LANDMARK.spur);
}

export function landmarkSolids(playerR) {
  return Array.from({ length: SOLID_COUNT }, (_, i) => {
    const a = (i / SOLID_COUNT) * Math.PI * 2;
    const d = landmarkFoot(a) * SOLID_STOP - playerR - SOLID_R;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d, r: SOLID_R };
  });
}

export function onMountainside(x, z, centre, footprint) {
  return Math.hypot(x - centre.x, z - centre.z) < footprint;
}
