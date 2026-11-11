import * as THREE from 'three';
import { put, rbox, arch, flaredRoof, corners, facing, shade, TRIM, DOOR } from '../dream/house-kit.js';

const Cy = (rt, rb, h, n = 12) => new THREE.CylinderGeometry(rt, rb, h, n);

function archDoor(solid, x, z) {
  arch(solid, TRIM, 1.13, 1.44, 0.1, x, 0.3, z, 0.03);
  arch(solid, DOOR, 0.85, 1.3, 0.1, x, 0.3, z + 0.08, 0.02);
  put(solid, new THREE.SphereGeometry(0.05, 6, 5), 0xffe08a, x + 0.25, 0.95, z + 0.2);
}

function squareWindow(solid, glow, color, x, y, z, w, h) {
  rbox(solid, TRIM, w + 0.2, h + 0.2, 0.1, x, y, z, 0.05);
  put(glow, new THREE.BoxGeometry(w, h, 0.08), color, x, y, z + 0.04);
  rbox(solid, TRIM, 0.05, h, 0.1, x, y, z + 0.06, 0.02);
  rbox(solid, TRIM, w, 0.05, 0.1, x, y, z + 0.06, 0.02);
  rbox(solid, TRIM, w + 0.38, 0.1, 0.24, x, y - h / 2 - 0.15, z + 0.08, 0.04);
}

function ovalMirror(solid, glow, x, y, z) {
  const frame = put(solid, Cy(0.5, 0.5, 0.14, 22), TRIM, x, y, z);
  frame.rotation.x = Math.PI / 2;
  frame.scale.set(1, 1, 1.45);
  const face = put(glow, Cy(0.37, 0.37, 0.1, 22), 0x8fb4ff, x, y, z + 0.06);
  face.rotation.x = Math.PI / 2;
  face.scale.set(1, 1, 1.45);
  put(glow, new THREE.OctahedronGeometry(0.08, 0), 0xe8f2ff, x - 0.14, y + 0.3, z + 0.14).scale.set(1, 1.5, 0.4);
}

function stepStones(solid, color, points) {
  for (const [x, z] of points) put(solid, Cy(0.28, 0.3, 0.1, 7), color, x, 0.05, z);
}

function upperFloor(solid, glow, i, P) {
  const wall = P.walls[i], roof = P.roofs[i];
  const up = new THREE.Group(), upGlow = new THREE.Group();
  for (const g of [up, upGlow]) { g.position.y = 2.03; g.rotation.y = 0.55; }
  solid.add(up);
  glow.add(upGlow);
  rbox(up, shade(wall, 1.1), 1.9, 1.45, 1.9, 0, 0.73, 0, 0.1);
  corners(up, TRIM, 1.9, 1.45, 1.9, 0.73);
  rbox(up, TRIM, 2.2, 0.1, 2.2, 0, 1.48, 0, 0.04);
  const lower = flaredRoof(up, roof, 1.7, 1.5, 4, 0, 1.5, 0);
  lower.rotation.y = Math.PI / 4;
  const upper = flaredRoof(up, roof, 0.85, 0.9, 4, 0, 4.1, 0);
  upper.rotation.set(Math.PI, Math.PI / 4, 0);
  put(up, Cy(0.05, 0.05, 0.5, 5), TRIM, 0, 3.05, 0);
  put(upGlow, new THREE.OctahedronGeometry(0.2, 0), 0xffe08a, 0, 3.4, 0).scale.y = 1.5;
  [0, Math.PI / 2].forEach((ry, k) => {
    const face = facing(up, ry), faceGlow = facing(upGlow, ry);
    arch(face, TRIM, 0.7, 0.95, 0.06, 0, 0.28, 0.92, 0.02);
    arch(faceGlow, P.win[(i + k) % 3], 0.5, 0.8, 0.06, 0, 0.35, 0.96, 0.01);
  });
}

export function buildMirrorHouse(solid, glow, i, P) {
  const wall = P.walls[i], roof = P.roofs[i], stone = shade(P.stone, 1.1);
  rbox(solid, P.stone, 3.15, 0.32, 2.75, 0, 0.16, 0, 0.1);
  rbox(solid, wall, 2.9, 1.5, 2.5, 0, 1.07, 0, 0.1);
  corners(solid, TRIM, 2.9, 1.5, 2.5, 1.07);
  rbox(solid, shade(wall, 0.9), 2.96, 0.12, 2.56, 0, 0.5, 0, 0.05);
  rbox(solid, roof, 3.3, 0.22, 2.9, 0, 1.92, 0, 0.09);
  rbox(solid, TRIM, 3.2, 0.1, 2.8, 0, 1.78, 0, 0.04);
  archDoor(solid, -0.8, 1.26);
  rbox(solid, P.stone, 1.3, 0.16, 0.6, -0.8, 0.4, 1.62, 0.06);
  ovalMirror(solid, glow, 0.72, 1.12, 1.27);
  const side = facing(solid, Math.PI / 2), sideGlow = facing(glow, Math.PI / 2);
  squareWindow(side, sideGlow, P.win[i], 0, 1.2, 1.26, 0.5, 0.45);
  upperFloor(solid, glow, i, P);
  stepStones(solid, stone, [[0.9, 2.2], [1.4, 2.7], [1.0, 3.2]]);
}
