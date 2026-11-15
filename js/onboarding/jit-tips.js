export const TIP_ARM = 'spot_jit';

const TIPS = Object.freeze([
  Object.freeze({ name: 'bag', keys: ['spot_t_bag', 'spot_pc_bag'], due: (s) => s.coachStep === 'sell' || !!s.merchantMet }),
  Object.freeze({ name: 'dex', keys: ['spot_t_dex', 'spot_pc_dex'], due: (s) => s.dexCount > (s.dexBase ?? 0) }),
]);

const open = (seen) => TIPS.filter((tip) => !tip.keys.some(seen));

export const tipsLeft = (seen) => !!seen(TIP_ARM) && open(seen).length > 0;

export function dueTip(state, seen) {
  if (!seen(TIP_ARM) || state.busy) return null;
  return open(seen).find((tip) => tip.due(state))?.name ?? null;
}
