import * as THREE from 'three';

// 🔭 Tube pose. Yawed off the camera axis so the overhead play camera sees its side
//    silhouette instead of a foreshortened vertical bar; eyepiece/objective/eye spot are
//    derived so the look pose (spaces/observatory.js) lines up with the geometry.
const ELEVATION = 0.62, YAW = 0.9, PLATFORM = 0.18, PIVOT_Y = PLATFORM + 1.48;
const alongTube = z => [
  z * Math.cos(ELEVATION) * Math.sin(YAW),
  PIVOT_Y - z * Math.sin(ELEVATION),
  z * Math.cos(ELEVATION) * Math.cos(YAW),
];
const EYEPIECE = alongTube(0.85);
export const TELESCOPE = {
  eyepiece: EYEPIECE,
  objective: alongTube(-1.5),
  eye: { x: EYEPIECE[0] + Math.sin(YAW) * 0.35, z: EYEPIECE[2] + Math.cos(YAW) * 0.35, yaw: YAW + Math.PI },
};

export function buildObservatoryInterior(mergeGeos, R = 5.4) {
  const hall = new THREE.Group(), parts = new Map();
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const mats = {
    floor: mat(0x5a5482), wall: mat(0x27305a, { side: THREE.BackSide }),
    dome: mat(0x1f2850, { side: THREE.BackSide }), gold: mat(0xd9b45a, { metalness: 0.5, roughness: 0.4 }),
    telescope: mat(0xeeeae2, { metalness: 0.25, roughness: 0.5 }),
    wood: mat(0x4a3a5a), dark: mat(0x1d2a55),
    books: mat(0xffffff, { vertexColors: true }),
    stars: mat(0xf3d27a, { emissive: 0xf3d27a, emissiveIntensity: 0.8 }),
  };
  const add = (key, geo, color) => {
    if (color !== undefined) {
      const c = new THREE.Color(color), colors = [];
      for (let i = 0; i < geo.attributes.position.count; i++) colors.push(c.r, c.g, c.b);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    }
    if (!parts.has(key)) parts.set(key, []);
    parts.get(key).push(geo);
  };
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const H = 3.4, platform = PLATFORM;
  add('floor', new THREE.CircleGeometry(R, 48).rotateX(-Math.PI / 2));
  add('dark', new THREE.CylinderGeometry(1.4, 1.48, platform, 40).translate(0, platform / 2, 0));
  for (const [inner, outer] of [[1.5, 1.58], [2.6, 2.66]]) {
    add('gold', new THREE.RingGeometry(inner, outer, 48).rotateX(-Math.PI / 2).translate(0, 0.012, 0));
  }
  add('wall', new THREE.CylinderGeometry(R, R, H, 40, 1, true).translate(0, H / 2, 0));
  // Rear half only: the overhead gameplay camera looks in from positive z.
  const dome = new THREE.SphereGeometry(R, 40, 18, 0, Math.PI, 0, Math.PI / 2).rotateY(Math.PI);
  const pos = dome.attributes.position, indices = [];
  for (let i = 0; i < dome.index.count; i += 3) {
    const tri = [0, 1, 2].map(k => dome.index.getX(i + k));
    if (!tri.some(k => Math.abs(pos.getX(k)) < 0.9)) indices.push(...tri);
  }
  dome.setIndex(indices);
  add('dome', dome.translate(0, H, 0));
  add('gold', new THREE.TorusGeometry(R - 0.05, 0.07, 6, 48, Math.PI).rotateX(-Math.PI / 2).translate(0, H, 0));
  for (const a of [0.25, 0.8, 1.3, 1.85, 2.4, 2.9]) {
    add('gold', new THREE.TorusGeometry(R - 0.06, 0.04, 5, 24, Math.PI * 0.4).rotateY(a).translate(0, H, 0));
  }
  add('telescope', new THREE.CylinderGeometry(0.28, 0.4, 1.3, 16).translate(0, platform + 0.65, 0));
  const onTube = geo => geo.rotateX(ELEVATION).rotateY(YAW).translate(0, PIVOT_Y, 0);
  add('telescope', onTube(new THREE.CylinderGeometry(0.2, 0.15, 2.4, 20).rotateX(Math.PI / 2).translate(0, 0, -0.55)));
  add('telescope', onTube(new THREE.CylinderGeometry(0.24, 0.24, 0.4, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, -1.85)));
  add('dark', onTube(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 10).rotateX(Math.PI / 2).translate(0, 0, 0.78)));
  for (const z of [-1.62, -0.2, 0.45]) add('gold', onTube(new THREE.TorusGeometry(0.205, 0.03, 8, 22).translate(0, 0, z)));
  add('dark', onTube(new THREE.CircleGeometry(0.2, 20).rotateY(Math.PI).translate(0, 0, -2.05)));
  const bookColors = [0xc0504a, 0x4f7fb0, 0xe0b050, 0x5f9a5a, 0x8a5aa0, 0xd9d0c0];
  for (const a of [-2.2, 2.2]) {
    const place = geo => geo.rotateY(a + Math.PI).translate(Math.sin(a) * (R - 0.4), 0, Math.cos(a) * (R - 0.4));
    add('wood', place(box(1.6, 2.2, 0.08, 0, 1.1, -0.18)));
    for (const x of [-0.78, 0.78]) add('wood', place(box(0.08, 2.2, 0.45, x, 1.1, 0)));
    for (let row = 0; row < 4; row++) add('wood', place(box(1.6, 0.08, 0.45, 0, 0.18 + row * 0.66, 0)));
    for (let row = 0; row < 3; row++) for (let k = 0; k < 7; k++) {
      add('books', place(box(0.15, 0.42 + k % 3 * 0.06, 0.32, -0.6 + k * 0.19, 0.45 + row * 0.66 + k % 3 * 0.03, 0.08)), bookColors[(k + row * 2) % 6]);
    }
  }
  add('wood', box(1.5, 0.08, 0.7, 3.5, 0.78, 1.8));
  for (const dx of [-0.68, 0.68]) for (const dz of [-0.28, 0.28]) add('wood', box(0.07, 0.78, 0.07, 3.5 + dx, 0.39, 1.8 + dz));
  add('telescope', box(0.6, 0.03, 0.4, 3.3, 0.84, 1.8));
  add('gold', new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6).translate(4, 1.02, 1.8));
  add('wood', new THREE.ConeGeometry(0.16, 0.2, 12).translate(4, 1.22, 1.8));
  const chartAt = geo => geo.rotateY(Math.PI / 2).translate(-R + 0.1, 2, 0);
  add('wood', chartAt(box(1.1, 0.8, 0.05, 0, 0, 0)));
  add('dark', chartAt(new THREE.PlaneGeometry(0.95, 0.65).translate(0, 0, 0.03)));
  for (const [x, y] of [[-0.35, 0.1], [-0.2, 0.15], [-0.05, 0.12], [0.08, 0.05], [0.12, -0.12], [0.32, -0.1], [0.3, 0.06]]) {
    add('stars', chartAt(new THREE.CircleGeometry(0.025, 6).translate(x, y, 0.04)));
  }
  const sky = [];
  let seed = 5;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const a = Math.PI + rnd() * Math.PI, ph = 0.2 + rnd() * 1.2;
    const x = Math.cos(a) * Math.sin(ph) * (R - 0.08), z = Math.sin(a) * Math.sin(ph) * (R - 0.08);
    const y = H + Math.cos(ph) * (R - 0.08);
    if (Math.abs(x) > 1) add('stars', new THREE.OctahedronGeometry(0.04 + rnd() * 0.04).translate(x, y, z));
    sky.push((rnd() - 0.5) * 1.4, H + rnd() * 5, -R - 0.5);
  }
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2;
    add('stars', new THREE.OctahedronGeometry(0.04 + rnd() * 0.04).translate(Math.sin(a) * (R - 0.05), 0.6 + rnd() * 2.6, Math.cos(a) * (R - 0.05)));
  }
  for (const [key, geos] of parts) {
    const mesh = new THREE.Mesh(mergeGeos(geos), mats[key]);
    mesh.name = key; mesh.receiveShadow = true; hall.add(mesh);
    for (const geo of geos) geo.dispose();
  }
  const skyGeo = new THREE.BufferGeometry();
  skyGeo.setAttribute('position', new THREE.Float32BufferAttribute(sky, 3));
  hall.add(new THREE.Points(skyGeo, new THREE.PointsMaterial({ color: 0xdce6ff, size: 0.025 })));
  const lamp = new THREE.PointLight(0xffc27a, 0.9, 7);
  lamp.position.set(4, 1.1, 1.8); hall.add(lamp);
  return hall;
}
