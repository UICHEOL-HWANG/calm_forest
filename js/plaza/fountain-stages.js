export const FOUNTAIN_LAMPS = 4;
export const FOUNTAIN_LAST_STAGE = 4;

const STRUCTURE = ['lower', 'column', 'upper'];

function clampStage(stage) {
  if (stage == null) return FOUNTAIN_LAST_STAGE;
  const n = Math.floor(Number(stage));
  if (Number.isNaN(n)) return FOUNTAIN_LAST_STAGE;
  return Math.min(FOUNTAIN_LAST_STAGE, Math.max(1, n));
}

export function fountainStageParts(stage) {
  const s = clampStage(stage);
  const built = s === 1 ? 0 : s === 2 ? 2 : STRUCTURE.length;
  return {
    solid: s === 1 ? ['ring'] : STRUCTURE.slice(0, built),
    ghost: STRUCTURE.slice(built),
    finish: s === FOUNTAIN_LAST_STAGE,
    lampsLit: Math.min(FOUNTAIN_LAMPS, s),
  };
}
