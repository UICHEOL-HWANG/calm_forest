export const swim = { on: false, moving: false, surface: false };

export function applySwimPose(arms, anchor, t, moving, surface = false) {
  if (surface) {
    const ph = t * (moving ? 9 : 6.5);
    anchor.rotation.set(.12 + .05 * Math.sin(ph * .5), 0, .08 * Math.sin(t * 2.4));
    arms.R.pivot.rotation.set(-.5 - Math.sin(ph) * .7, 0, .9 + Math.sin(ph) * .5);
    arms.L.pivot.rotation.set(-.5 - Math.sin(ph + Math.PI) * .7, 0, -.9 - Math.sin(ph + Math.PI) * .5);
    return;
  }
  const ph = t * (moving ? 7 : 3);
  anchor.rotation.set(1.0 + .05 * Math.sin(ph * 2), 0, 0);
  arms.R.pivot.rotation.set(-1.5 - Math.sin(ph) * .9, 0, .12);
  arms.L.pivot.rotation.set(-1.5 - Math.sin(ph + Math.PI) * .9, 0, -.12);
}
