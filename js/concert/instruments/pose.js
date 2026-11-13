export function makeRig(T, { anchor, arms, def }) {
  const R = def.bodyR, bs = def.bodyScale, bodyY = R * bs[1] + 0.02;
  const side = (arm) => {
    const keep = arm.pivot.quaternion.clone();
    arm.pivot.quaternion.identity();
    anchor.updateMatrixWorld(true);
    const hand = anchor.worldToLocal(arm.hand.getWorldPosition(new T.Vector3()));
    arm.pivot.quaternion.copy(keep);
    const off = hand.sub(arm.pivot.position);
    return { pivot: arm.pivot, reach: off.length(), rest: off.clone().normalize() };
  };
  return { T, root: anchor, R, bodyY, bs, wings: (def.extras || []).includes('wings'), arms: { 1: side(arms.R), [-1]: side(arms.L) } };
}

export function aimDir(rig, side, dir) {
  const arm = rig.arms[side];
  const d = dir.clone().normalize();
  arm.pivot.quaternion.setFromUnitVectors(arm.rest, d);
  return arm.pivot.position.clone().addScaledVector(d, arm.reach);
}

export const aimAt = (rig, side, target) => aimDir(rig, side, target.clone().sub(rig.arms[side].pivot.position));

export function relax(rig) {
  rig.arms[1].pivot.quaternion.identity();
  rig.arms[-1].pivot.quaternion.identity();
}

export function frontZ(rig, x, y) {
  const { R, bs, bodyY } = rig;
  const tx = x / (R * bs[0]), ty = (y - bodyY) / (R * bs[1]), t = 1 - tx * tx - ty * ty;
  const torso = t > 0 ? Math.sqrt(t) * R * bs[2] : 0;
  const bx = x / (R * 0.62), by = (y - (bodyY - R * 0.16)) / (R * 0.682), b = 1 - bx * bx - by * by;
  const belly = b > 0 ? R * 0.55 + Math.sqrt(b) * R * 0.372 : 0;
  return Math.max(torso, belly);
}

export function orient(T, obj, yDir, zHint) {
  const y = yDir.clone().normalize();
  const x = new T.Vector3().crossVectors(y, zHint).normalize();
  const z = new T.Vector3().crossVectors(x, y).normalize();
  obj.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
  return { x, y, z };
}

export function shoulderTop(rig, side, k = 0.55) {
  const { T, R, bs, bodyY } = rig;
  return new T.Vector3(side * R * bs[0] * k, bodyY + R * bs[1] * Math.sqrt(1 - k * k) * 0.98, R * 0.12);
}
