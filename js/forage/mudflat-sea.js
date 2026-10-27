const W = 120, D = 60;
const smooth = (a, b, v) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
const lap = (x, t) => .35 * Math.sin(x * .32 + t * 1.3) + .2 * Math.sin(x * .81 - t * .9 + 1.1);

function wavePlane(THREE, segX, segZ) {
  const geo = new THREE.PlaneGeometry(W, D, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -D / 2);
  const pos = geo.attributes.position, n = pos.count;
  const cols = new Float32Array(n * 3), shallow = new THREE.Color(0x7fd0d4), deep = new THREE.Color(0x2c78ab), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    c.lerpColors(shallow, deep, smooth(0, 14, -pos.getZ(i)));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .18, metalness: .2, transparent: true, opacity: .9 }));
  mesh.receiveShadow = true;
  return { mesh, base: pos.array.slice(), baseCols: cols.slice() };
}

function foamStrip(THREE, segX, width, opacity) {
  const geo = new THREE.PlaneGeometry(W, width, segX, 1);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity, depthWrite: false }));
  return { mesh, base: geo.attributes.position.array.slice(), opacity };
}

function bendStrip(s, t, dz, phase, amp) {
  const arr = s.mesh.geometry.attributes.position.array, b = s.base;
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 2] = b[i + 2] + dz + amp * lap(b[i] + phase, t);
    arr[i + 1] = .02;
  }
  s.mesh.geometry.attributes.position.needsUpdate = true;
}

export function buildSea(THREE, { mobile = false } = {}) {
  const g = new THREE.Group();
  const water = wavePlane(THREE, mobile ? 48 : 72, mobile ? 16 : 24);
  g.add(water.mesh);
  const edge = foamStrip(THREE, mobile ? 48 : 80, .5, .8);
  g.add(edge.mesh);
  const breakers = [0, 1, 2].map(() => foamStrip(THREE, mobile ? 40 : 64, .28, .7));
  breakers.forEach(b => g.add(b.mesh));
  return { group: g, water, edge, breakers };
}

function waveY(x, z, t, d) {
  const amp = .03 + .14 * smooth(1, 18, d);
  return .1 + .1 * smooth(2, 16, d) + amp * (
    Math.sin(x * .45 + t * 1.3) * .5 +
    Math.sin(z * .6 - t * 1.7 + 1.3) * .5 +
    Math.sin((x + z) * .28 + t * .8) * .45);
}

export function updateSea(sea, t, front) {
  sea.group.position.z = front;
  const w = sea.water, arr = w.mesh.geometry.attributes.position.array, b = w.base;
  const cols = w.mesh.geometry.attributes.color.array, bc = w.baseCols;
  for (let i = 0; i < arr.length; i += 3) {
    const x = b[i], z = b[i + 2], d = -z;
    arr[i + 2] = z + (1 - smooth(0, 1.5, d)) * lap(x, t);
    const y = waveY(x, z, t, d);
    arr[i + 1] = y;
    const k = Math.max(0, y - .1 - .1 * smooth(2, 16, d)) * 3;
    cols[i] = bc[i] + (1 - bc[i]) * k; cols[i + 1] = bc[i + 1] + (1 - bc[i + 1]) * k; cols[i + 2] = bc[i + 2] + (1 - bc[i + 2]) * k;
  }
  w.mesh.geometry.attributes.position.needsUpdate = true;
  w.mesh.geometry.attributes.color.needsUpdate = true;
  w.mesh.geometry.computeVertexNormals();
  bendStrip(sea.edge, t, .1, 0, 1);
  sea.edge.mesh.position.y = .1;
  sea.edge.mesh.material.opacity = .65 + .2 * Math.sin(t * 2.4);
  const PERIOD = 3.6;
  sea.breakers.forEach((br, i) => {
    const k = (t / PERIOD + i / 3) % 1;
    const dz = -12 * (1 - k) * (1 - k) - .2;
    bendStrip(br, t, dz, i * 9, .6 + k * .4);
    br.mesh.position.y = .1 + .1 * smooth(2, 16, -dz) + .06;
    br.mesh.material.opacity = br.opacity * Math.sin(Math.PI * Math.min(1, k * 1.15));
    br.mesh.scale.z = .6 + k * 1.4;
  });
}
