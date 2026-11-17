const within = (o, x, z, r) => Math.hypot(o.x - x, o.z - z) < r;

function clearTrees({ scene, trees, obstacles, swayables, removeSolid }, x, z, r) {
  let n = 0;
  for (let i = trees.length - 1; i >= 0; i--) {
    const t = trees[i];
    if (!within(t.position, x, z, r)) continue;
    scene.remove(t);
    trees.splice(i, 1);
    const oi = obstacles.findIndex(o => Math.abs(o.x - t.position.x) < 0.01 && Math.abs(o.z - t.position.z) < 0.01);
    if (oi >= 0) obstacles.splice(oi, 1);
    if (t.userData?.collider) removeSolid(t.userData.collider);
    const si = swayables.indexOf(t.userData?.canopy);
    if (si >= 0) swayables.splice(si, 1);
    n++;
  }
  return n;
}

function clearFlowers({ scene, swayables }, x, z, r) {
  let n = 0;
  for (let i = swayables.length - 1; i >= 0; i--) {
    const s = swayables[i];
    if (s.parent !== scene || !within(s.position, x, z, r)) continue;
    scene.remove(s);
    swayables.splice(i, 1);
    n++;
  }
  return n;
}

function clearGrass({ grassClumps }, x, z, r) {
  let n = 0;
  for (const clump of grassClumps) {
    const keep = clump.items.filter(it => !within(it, x, z, r));
    if (keep.length === clump.items.length) continue;
    n += clump.items.length - keep.length;
    clump.items.splice(0, clump.items.length, ...keep);
    clump.mesh.count = keep.length;
  }
  return n;
}

export function clearYard(deps, x, z, r) {
  return { trees: clearTrees(deps, x, z, r), flowers: clearFlowers(deps, x, z, r), grass: clearGrass(deps, x, z, r) };
}
