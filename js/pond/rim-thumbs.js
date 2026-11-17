import * as THREE from 'three';
import { mergeGeos, paintGeo } from '../game.js';
import { makeThumbs } from '../weekly/thumbs.js';
import { buildPond } from './build.js';
import { RIM_IDS } from './rim.js';

const SIZE = 160;
const TILT = 0.45;
const TILT_AXIS = new THREE.Vector3(0.75, 0, -0.55).normalize();

const thumbs = makeThumbs(THREE, (_, rim) => {
  const { group } = buildPond({ mergeGeos, paintGeo, rim });
  group.quaternion.setFromAxisAngle(TILT_AXIS, TILT);
  return group;
}, SIZE);
const pics = new Map();
let busy = false;

export function rimPic(id) {
  return pics.get(id) || '';
}

export function rimPicsFailed() {
  return [...pics.values()].includes(null);
}

export function drawRimPics(onDraw) {
  const id = RIM_IDS.find(x => !pics.has(x));
  if (!id || busy || rimPicsFailed()) return;
  busy = true;
  requestAnimationFrame(() => {
    busy = false;
    pics.set(id, thumbs([id])[id]);
    onDraw();
  });
}
