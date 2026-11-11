export const SIDE_MIN_W = 768;
export const SHORT_MAX_H = 560;

const NEAR = { pos: [0.2, 7.6, 12], look: [0, 0.7, 1.8] };
const FAR = { pos: [0.1, 13.7, 19.8], look: [0, 0.9, 2.0] };
const SHIFT_SIDE = [150, 0];
const SHIFT_SHEET = [0, 150];

export function auctionLayout(w, h) {
  if (w > h && h < SHORT_MAX_H) return 'side-short';
  return w >= SIDE_MIN_W ? 'side' : 'sheet';
}

export function auctionCamera(w, h) {
  const layout = auctionLayout(w, h);
  const base = layout === 'sheet' || h > w ? FAR : NEAR;
  return { layout, pos: base.pos, look: base.look, shift: layout === 'sheet' ? SHIFT_SHEET : SHIFT_SIDE };
}
