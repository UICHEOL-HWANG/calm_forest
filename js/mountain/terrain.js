import { COURSE, centerX } from './course.js';
import { ACORNS, CLIMB_PATH, nearestOnPath } from './climb.js';
import { mountainMesh } from './backdrop.js';

export const SUMMIT_Y = 30;
const SLOPE_DROP = 30;

export function slopePoint(z, x) {
  const k = z / COURSE.length;
  return { x, y: SUMMIT_Y - SLOPE_DROP * k, z: -4 + k * 70 };
}

export function pathY(i) {
  return (i / (CLIMB_PATH.length - 1)) * SUMMIT_Y;
}

export function acornY(i) {
  const n = nearestOnPath(ACORNS[i]);
  return pathY(n.seg) + 0.5;
}

function strip(THREE, pts, width, color) {
  const pos = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
    const nx = (-dz / len) * width / 2, nz = (dx / len) * width / 2;
    const q = [[a.x - nx, a.y, a.z - nz], [a.x + nx, a.y, a.z + nz], [b.x + nx, b.y, b.z + nz], [b.x - nx, b.y, b.z - nz]];
    pos.push(...q[0], ...q[2], ...q[1], ...q[0], ...q[3], ...q[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide }));
}

function instanced(THREE, geo, color, items) {
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }), items.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  items.forEach(([x, y, z, sc], i) => { m.compose(v.set(x, y, z), q, s.setScalar(sc)); mesh.setMatrixAt(i, m); });
  return mesh;
}

export function buildMountainSpace(THREE) {
  const group = new THREE.Group();
  const body = mountainMesh(THREE, 70, SUMMIT_Y + 4);
  body.material.fog = true;
  body.position.set(0, -2, -10);
  const climbPts = CLIMB_PATH.map((p, i) => ({ x: p.x, y: pathY(i) + 0.05, z: p.z }));
  const slopePts = Array.from({ length: 67 }, (_, i) => {
    const z = i * (COURSE.length / 66);
    const p = slopePoint(z, centerX(z));
    return { ...p, y: p.y + 0.05 };
  });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(9, 20), new THREE.MeshLambertMaterial({ color: 0xe9eef3 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(4, 0.02, 28);
  const flags = instanced(THREE, new THREE.ConeGeometry(0.35, 1.6, 4), 0xe8743c,
    COURSE.flags.flatMap(f => [-1, 1].map(side => { const p = slopePoint(f.z, f.x + side * f.half); return [p.x, p.y + 0.8, p.z, 1]; })));
  const snowballs = instanced(THREE, new THREE.IcosahedronGeometry(1, 0), 0xf6f8fb,
    COURSE.obstacles.filter(o => o.kind === 'snowball').map(o => { const p = slopePoint(o.z, o.x); return [p.x, p.y + 0.6, p.z, o.r * 0.8]; }));
  const rocks = instanced(THREE, new THREE.DodecahedronGeometry(1, 0), 0x6b625a,
    COURSE.obstacles.filter(o => o.kind === 'rock').map(o => { const p = slopePoint(o.z, o.x); return [p.x, p.y + 0.5, p.z, o.r * 0.8]; }));
  const acorns = instanced(THREE, new THREE.IcosahedronGeometry(0.35, 0), 0x9a6a2f,
    ACORNS.map((a, i) => [a.x, acornY(i), a.z, 1]));
  group.add(body, plaza, strip(THREE, climbPts, 3, 0xcfc6b4), strip(THREE, slopePts, COURSE.width, 0xf6f8fb), flags, snowballs, rocks, acorns);
  group.userData = { acorns };
  return group;
}
