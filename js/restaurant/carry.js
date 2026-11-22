export const CARRY = { x: -1.05, z: -0.38, fwd: 0.28 };

export function poseCarry(arms, p = CARRY) {
  arms.R.pivot.rotation.set(p.x, 0, p.z);
  arms.L.pivot.rotation.set(p.x, 0, -p.z);
}

export function handsMid(arms, out) {
  const a = arms.R.hand.getWorldPosition(out.clone()), b = arms.L.hand.getWorldPosition(out.clone());
  return out.copy(a).add(b).multiplyScalar(0.5);
}
