// =============================================================
//  calm forest · 🐗🦝 습격당한 밭 — 흔적 조형(밭 위 흔적 · 대결 무대 공용)
//  ------------------------------------------------------------
//  ▶ 한 조형을 두 곳이 쓴다: 밤사이 밭에 남는 🐾흔적(game.js traceMesh)과 대결 무대 발밑.
//    둘이 다르게 생기면 "그 밭에서 붙는다"는 인과가 끊긴다.
//  ▶ 무엇이 털렸는지 읽혀야 한다 — 파헤친 구덩이(작물을 뽑아 간 자리) · 부러진 줄기 ·
//    흩어진 잎 · 튀어나간 흙덩이 · 동물이 달아난 쪽으로 이어진 발자국.
//  ▶ 전부 바닥에 깔린다(높이 ≤ 0.2). 캐릭터가 지나가도 몸을 뚫고 솟는 게 없다 —
//    예전 흔적(흙무더기 구 두 개)은 캐릭터 발밑을 뚫고 올라와 "통과되는" 것처럼 보였다.
//  ▶ 좌표로 시드를 잡아 같은 밭은 늘 같은 모양이다(새로고침·대결 진입 때 모양이 바뀌지 않게).
//  입력: THREE, { animal: 'boar'|'raccoon', seed, away: [dx, dz] 달아난 방향(단위 벡터), plotY }
//  ⚠️ 밭 흙 윗면은 y≈0.2 다(game.js syncFarmSoil). 밭 칸(반폭 1) 안의 조각은 plotY 만큼 올리고
//     밭 밖(발자국·멀리 튄 흙)은 땅 높이에 둔다 — 전부 0 에 깔았더니 흙에 묻혀 안 보였다(실측 2026-09-24).
// =============================================================

const DIRT_DARK = 0x3a2616;   // 파인 구덩이 속
const DIRT = 0x6b4a2b;        // 튀어나간 흙
const STALK = 0x7b9a4e;       // 부러진 줄기
const LEAF = [0x8cc26a, 0xa9c35e, 0x6fa651];   // 흩어진 잎 — 한 색이면 평면 무늬로 읽힌다
const PAW = 0x4a3520;

function rng(seed) {   // 결정적 LCG — 같은 시드면 같은 배치
  let s = (Math.abs(Math.floor(seed * 9301 + 49297)) % 233280) || 1;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export function makeRaidScar(THREE, { animal = 'boar', seed = 1, away = [0, 1], plotY = 0.2 } = {}) {
  const g = new THREE.Group();
  const r = rng(seed);
  const lift = (x, z) => (Math.abs(x) < 0.98 && Math.abs(z) < 0.98 ? plotY : 0);   // 밭 칸 안이면 흙 위로
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: true });
  const mDark = mat(DIRT_DARK), mDirt = mat(DIRT), mStalk = mat(STALK), mPaw = mat(PAW);
  const mLeaf = LEAF.map(mat);

  // 🕳️ 파헤친 구덩이 3개 — 어두운 속 + 둘레에 흙 둔덕(작물을 통째로 뽑아 간 자리)
  const holes = [[-0.42, -0.3], [0.38, -0.18], [-0.05, 0.38]];
  for (const [hx, hz] of holes) {
    const rr = 0.2 + r() * 0.08;
    const pit = new THREE.Mesh(new THREE.CircleGeometry(rr, 9).rotateX(-Math.PI / 2), mDark);
    pit.position.set(hx, 0.018 + lift(hx, hz), hz);
    g.add(pit);
    const n = 6;
    for (let i = 0; i < n; i++) {   // 둘레 흙덩이 — 고리 하나로 두면 도넛(장식)으로 읽힌다
      const a = (i / n) * Math.PI * 2 + r() * 0.6;
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06 + r() * 0.04, 0), mDirt);
      const cx = hx + Math.cos(a) * (rr + 0.04), cz = hz + Math.sin(a) * (rr + 0.04);
      c.position.set(cx, 0.035 + lift(cx, cz), cz);
      c.scale.y = 0.6; g.add(c);
    }
  }

  // 🌿 부러진 줄기 — 쓰러진 것 둘 + 꺾여 선 것 하나
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.34, 5), mStalk);
    const fallen = i < 2;
    const sx = -0.6 + r() * 1.2, sz = -0.55 + r() * 1.1;
    s.position.set(sx, (fallen ? 0.03 : 0.12) + lift(sx, sz), sz);
    s.rotation.set(fallen ? Math.PI / 2 : 0.5, r() * Math.PI * 2, fallen ? 0 : 0.35);
    g.add(s);
  }

  // 🍃 흩어진 잎 — 납작한 마름모, 여러 색
  for (let i = 0; i < 9; i++) {
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.075, 4).rotateX(-Math.PI / 2), mLeaf[i % mLeaf.length]);
    leaf.scale.set(1, 1, 1.8);
    const lx = -0.85 + r() * 1.7, lz = -0.85 + r() * 1.7;
    leaf.position.set(lx, 0.022 + i * 0.001 + lift(lx, lz), lz);
    leaf.rotation.y = r() * Math.PI * 2;
    g.add(leaf);
  }

  // 🟤 튀어나간 흙덩이 — 달아난 쪽으로 쏠린다(파헤치며 뒤로 걷어찬 흙)
  const [ax, az] = away;
  for (let i = 0; i < 7; i++) {
    const d = 0.6 + r() * 0.7, sp = (r() - 0.5) * 1.4;
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045 + r() * 0.04, 0), mDirt);
    const kx = ax * d - az * sp, kz = az * d + ax * sp;
    c.position.set(kx, 0.03 + lift(kx, kz), kz);
    c.scale.y = 0.7; g.add(c);
  }

  // 🐾 발자국 — 밭에서 달아난 쪽으로 한 줄. 멧돼지는 크고 성큼(갈라진 발굽), 너구리는 작고 총총
  const big = animal === 'boar';
  const step = big ? 0.5 : 0.36, pr = big ? 0.075 : 0.05;
  for (let i = 0; i < 5; i++) {
    const d = 1.05 + i * step, side = (i % 2 ? 1 : -1) * (big ? 0.13 : 0.1);
    const px = ax * d - az * side, pz = az * d + ax * side;
    const toes = big ? 2 : 3;   // 발굽은 두 쪽, 너구리는 발가락 셋
    for (let k = 0; k < toes; k++) {
      const off = (k - (toes - 1) / 2) * pr * 1.25;
      const t = new THREE.Mesh(new THREE.CircleGeometry(pr * (big ? 0.62 : 0.5), 7).rotateX(-Math.PI / 2), mPaw);
      const tx = px - az * off, tz = pz + ax * off;
      t.position.set(tx, 0.02 + lift(tx, tz), tz);   // 대각선으로 달아나면 첫 발자국이 밭 칸 안이다
      t.scale.set(1, 1, big ? 1.5 : 1); g.add(t);
    }
  }

  g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  return g;
}
