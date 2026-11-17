const WOOD = 0xb07a48, LEG = 0x8f6238, CLOTH = 0xb85c4c, SEAT = 0xa8743f;
const TOP_Y = 0.72, TOP_H = 0.08, CLOTH_H = 0.02, PLATE_Y = TOP_Y + TOP_H / 2 + CLOTH_H;
const cyl = (kind, x, y, z, w, h, color, w2 = w) => ({ kind, shape: 'cyl', x, y, z, w, h, d: w, w2, color });
const box = (kind, x, y, z, w, h, d, color) => ({ kind, shape: 'box', x, y, z, w, h, d, color });

const ROUND_SEAT_OUT = 1.22, ROUND_SLOT_R = 0.6, ROUND_ORDER = [0, 3, 1, 4, 2, 5];
const LONG_ROW = [{ n: 6, z: -0.3 }, { n: 5, z: 0.3 }], LONG_STEP = 0.6;

function roundParts() {
  const seats = [[1, 0], [0, 1], [-1, 0], [0, -1]].flatMap(([ux, uz]) => {
    const x = ux * ROUND_SEAT_OUT, z = uz * ROUND_SEAT_OUT;
    return [cyl('seat', x, 0.4, z, 0.5, 0.08, SEAT), cyl('seatleg', x, 0.18, z, 0.2, 0.36, LEG, 0.3)];
  });
  return [
    cyl('top', 0, TOP_Y, 0, 1.9, TOP_H, WOOD),
    cyl('cloth', 0, TOP_Y + TOP_H / 2 + CLOTH_H / 2, 0, 1.66, CLOTH_H, CLOTH),
    cyl('leg', 0, 0.36, 0, 0.18, 0.64, LEG, 0.26),
    cyl('foot', 0, 0.03, 0, 0.8, 0.06, LEG),
    ...seats,
  ];
}

function longParts() {
  const legs = [[-1.85, -0.55], [1.85, -0.55], [-1.85, 0.55], [1.85, 0.55]].map(([x, z]) => box('leg', x, 0.34, z, 0.12, 0.68, 0.12, LEG));
  const benches = [-1.08, 1.08].flatMap(z => [
    box('seat', 0, 0.4, z, 3.8, 0.08, 0.4, SEAT),
    box('seatleg', -1.7, 0.18, z, 0.1, 0.36, 0.32, LEG),
    box('seatleg', 1.7, 0.18, z, 0.1, 0.36, 0.32, LEG),
  ]);
  return [
    box('top', 0, TOP_Y, 0, 4.0, TOP_H, 1.3, WOOD),
    box('cloth', 0, TOP_Y + TOP_H / 2 + CLOTH_H / 2, 0, 3.7, CLOTH_H, 1.1, CLOTH),
    ...legs,
    ...benches,
  ];
}

function roundSlots() {
  return ROUND_ORDER.map(i => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    return { x: Math.cos(a) * ROUND_SLOT_R, y: PLATE_Y, z: Math.sin(a) * ROUND_SLOT_R };
  });
}

function longSlots() {
  return LONG_ROW.flatMap(({ n, z }) => Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * LONG_STEP, y: PLATE_Y, z })));
}

export const PLAIN_STYLE = Object.freeze({
  parts: (shape) => (shape === 'long' ? longParts() : roundParts()),
  slots: (shape) => (shape === 'long' ? longSlots() : roundSlots()),
});
