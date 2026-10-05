// 🌿 7단계 정원 부품(저폴리) — 모던·한옥 두 모델이 같이 쓴다. 재질은 makeGarden 호출당 한 벌만 만들어 공유한다(병합 → 재질 수 = 드로우콜).
//   makeGarden(THREE, H, add) → { tree, pine, bush, bed, pond, stones, lantern, bench, fence, plant, cyl, ico, put, m }
//   좌표는 집 그룹 로컬(정면 +z, 바닥 y=0). 전부 flatShading clay 라 게임 톤과 같다. 시안 뷰어(sims/house-concepts)도 이 파일을 쓴다.
export function makeGarden(THREE, H, add) {
  const m = {
    leaf: H.clay(0x6fa04f), leaf2: H.clay(0x8bb85a), leafDark: H.clay(0x4f8040), blossom: H.clay(0xf3b6c8),
    trunk: H.clay(0x8a6240), soil: H.clay(0x6b4a30), rock: H.clay(0xb8b4a8), rockDark: H.clay(0x8f8c82),
    water: H.glass(0x5fd3e8), waterBed: H.clay(0x8fd9e6), wood: H.clay(0xc19a66), woodDark: H.clay(0x8a6240),
    stone: H.clay(0xd9d5c8), lanternGlow: H.clay(0xffe3a6, { emissive: 0xffbf6a, emissiveIntensity: 1.1 }),
    flowers: [0xf08fb0, 0xffd45e, 0xffffff, 0xb79af0, 0xff9a5e].map((c) => H.clay(c)),
    bamboo: H.clay(0x9ac26a), pot: H.clay(0x8a6a50),
  };
  m.water.opacity = 0.78; m.water.roughness = 0.1;
  const put = (mesh, x, y, z, shadow = true) => { mesh.position.set(x, y, z); mesh.castShadow = shadow; mesh.receiveShadow = true; add(mesh); return mesh; };
  const cyl = (rt, rb, h, mat, x, y, z, seg = 8) => put(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat), x, y, z);
  const ico = (r, mat, x, y, z, d = 0) => put(new THREE.Mesh(new THREE.IcosahedronGeometry(r, d), mat), x, y, z);

  const tree = (x, z, s = 1, mat = m.leaf) => {
    cyl(0.09 * s, 0.13 * s, 0.9 * s, m.trunk, x, 0.45 * s, z, 6);
    ico(0.55 * s, mat, x, 1.15 * s, z); ico(0.4 * s, mat === m.blossom ? m.blossom : m.leaf2, x + 0.22 * s, 1.55 * s, z - 0.08 * s);
  };
  const pine = (x, z, s = 1) => {          // 분재풍 소나무 — 휜 줄기 + 층층 잎
    cyl(0.07 * s, 0.11 * s, 0.9 * s, m.trunk, x, 0.45 * s, z, 6).rotation.z = 0.12;
    for (const [dx, dy, r] of [[-0.25, 0.95, 0.34], [0.2, 1.2, 0.3], [0, 1.5, 0.26]]) {
      const c = ico(r * s, m.leafDark, x + dx * s, dy * s, z, 0); c.scale.y = 0.55;
    }
  };
  const bush = (x, z, r = 0.3, mat = m.leaf2) => { const b = ico(r, mat, x, r * 0.8, z); b.scale.y = 0.75; };
  const plant = (x, z, s = 1) => { cyl(0.14 * s, 0.11 * s, 0.26 * s, m.pot, x, 0.13 * s, z, 6); ico(0.22 * s, m.leaf2, x, 0.42 * s, z); };
  const bed = (x, z, w, d, n = 7) => {      // 나무 테두리 화단 + 꽃
    put(H.box(w, 0.16, d, m.woodDark, x, 0.08, z), x, 0.08, z, false);
    put(H.box(w - 0.1, 0.06, d - 0.1, m.soil, x, 0.17, z), x, 0.17, z, false);
    for (let i = 0; i < n; i++) {
      const fx = x + (((i * 0.6180339) % 1) - 0.5) * (w - 0.3), fz = z + (((i * 0.7548776 + 0.3) % 1) - 0.5) * (d - 0.3);
      cyl(0.015, 0.015, 0.2, m.leafDark, fx, 0.3, fz, 4); ico(0.075, m.flowers[i % m.flowers.length], fx, 0.43, fz);
    }
  };
  const pond = (x, z, rx = 0.9, rz = 0.65) => {   // 타원 연못 + 테두리 바위 + 수련
    const base = cyl(1, 1, 0.08, m.waterBed, x, 0.04, z, 14); base.scale.set(rx, 1, rz);
    const w = cyl(1, 1, 0.05, m.water, x, 0.075, z, 14); w.scale.set(rx * 0.94, 1, rz * 0.94); w.castShadow = false;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = 0.7 + ((i * 37) % 5) * 0.06;
      const rk = ico(r * 0.2, i % 2 ? m.rock : m.rockDark, x + Math.cos(a) * rx * 1.02, 0.1, z + Math.sin(a) * rz * 1.02, 0); rk.scale.y = 0.65;
    }
    for (const [dx, dz] of [[0.2, 0.1], [-0.3, -0.12]]) cyl(0.12, 0.12, 0.02, m.leaf2, x + dx * rx, 0.11, z + dz * rz, 8);
  };
  const stones = (pts) => pts.forEach(([x, z, r = 0.2]) => { const s = cyl(r, r * 1.05, 0.05, m.stone, x, 0.025, z, 7); s.castShadow = false; });
  const lantern = (x, z) => {               // 석등
    cyl(0.14, 0.17, 0.12, m.stone, x, 0.06, z, 6); cyl(0.05, 0.06, 0.38, m.stone, x, 0.31, z, 6);
    put(H.box(0.2, 0.18, 0.2, m.lanternGlow, x, 0.58, z), x, 0.58, z, false);
    const cap = put(new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.16, 4), m.stone), x, 0.75, z); cap.rotation.y = Math.PI / 4;
  };
  const bench = (x, z, ry = 0) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    g.add(H.box(0.9, 0.07, 0.3, m.wood, 0, 0.3, 0));
    for (const dx of [-0.36, 0.36]) g.add(H.box(0.06, 0.3, 0.26, m.woodDark, dx, 0.15, 0));
    g.add(H.box(0.9, 0.22, 0.04, m.wood, 0, 0.5, -0.13)); add(g);
  };
  const fence = (x0, z0, x1, z1, n, h = 0.5, mat = m.wood) => {   // 말뚝 울타리
    for (let i = 0; i <= n; i++) { const t = i / n, px = x0 + (x1 - x0) * t, pz = z0 + (z1 - z0) * t; put(H.box(0.07, h, 0.07, mat, px, h / 2, pz), px, h / 2, pz, false); }
    const len = Math.hypot(x1 - x0, z1 - z0), rail = H.box(len, 0.05, 0.05, mat, 0, 0, 0);
    rail.position.set((x0 + x1) / 2, h * 0.75, (z0 + z1) / 2); rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0); rail.castShadow = false; add(rail);
  };
  return { m, tree, pine, bush, bed, pond, stones, lantern, bench, fence, plant, cyl, ico, put };
}
