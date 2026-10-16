import { landmarkMountain, cloudBand } from './backdrop.js';

export const LANDMARK = Object.freeze({ radius: 7, height: 6.5, spur: 1.2, groundColor: 0xd3e2b0, frontGap: 0.38, cloudScale: 1.6 });

export function buildLandmark(THREE) {
  const { radius, height, frontGap, cloudScale } = LANDMARK;
  const group = new THREE.Group();
  group.add(landmarkMountain(THREE, LANDMARK), cloudBand(THREE, radius, height, frontGap, cloudScale));
  return group;
}
