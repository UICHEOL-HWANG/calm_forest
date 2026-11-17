const TOP = 0xd8b060, LEG = 0x9a6a40, BARK = 0x9c6b40, BARK_DARK = 0x7a5230, CUT = 0xc9a06a;
const RED = 0xc0503f, CREAM = 0xd8cdb0, LAMP = 0xc8742a, LAMP_GLOW = 0xd8c890, LAMP_CAP = 0x8a5a36;
const TOP_Y = 0.75, TOP_H = 0.08, RUN_H = 0.012, RUN_Y = TOP_Y + TOP_H / 2 + RUN_H / 2, PLATE_Y = TOP_Y + TOP_H / 2 + RUN_H;
const cyl = (kind, x, y, z, w, h, color, w2 = w) => ({ kind, shape: 'cyl', x, y, z, w, h, d: w, w2, color });
const box = (kind, x, y, z, w, h, d, color) => ({ kind, shape: 'box', x, y, z, w, h, d, color });
const log = (kind, x, y, z, len, dia, color) => ({ kind, shape: 'log', x, y, z, w: len, h: dia, d: dia, color });

const ROUND_SEAT_OUT = 1.18, ROUND_SLOT_R = 0.6, ROUND_ORDER = [0, 3, 1, 4, 2, 5];
const LONG_ROW = [{ n: 6, z: -0.3 }, { n: 5, z: 0.3 }], LONG_STEP = 0.6;
const STRIPES = 5;

function runner(alongX, len, wide) {
  const step = wide / STRIPES;
  return Array.from({ length: STRIPES }, (_, i) => {
    const off = (i - (STRIPES - 1) / 2) * step, color = i % 2 ? CREAM : RED;
    return alongX ? box('cloth', 0, RUN_Y, off, len, RUN_H, step, color) : box('cloth', off, RUN_Y, 0, step, RUN_H, len, color);
  });
}

function lamp(x, z) {
  const y = TOP_Y + TOP_H / 2 + RUN_H;
  return [
    box('lamp', x, y + 0.03, z, 0.11, 0.06, 0.11, LAMP),
    box('lamp', x, y + 0.1, z, 0.08, 0.08, 0.08, LAMP_GLOW),
    cyl('lamp', x, y + 0.165, z, 0.02, 0.05, LAMP_CAP, 0.14),
  ];
}

function stump(x, z) {
  return [
    cyl('seat', x, 0.2, z, 0.56, 0.4, BARK, 0.6),
    cyl('seat', x, 0.12, z, 0.6, 0.025, BARK_DARK),
    cyl('seat', x, 0.29, z, 0.6, 0.025, BARK_DARK),
    cyl('seat', x, 0.405, z, 0.5, 0.012, CUT),
  ];
}

function logBench(z) {
  return [
    log('seat', 0, 0.26, z, 3.6, 0.3, BARK),
    cyl('seatleg', -1.37, 0.12, z, 0.24, 0.24, BARK_DARK, 0.28),
    cyl('seatleg', 1.37, 0.12, z, 0.24, 0.24, BARK_DARK, 0.28),
  ];
}

function roundParts() {
  const seats = [[1, 0], [0, 1], [-1, 0], [0, -1]].flatMap(([ux, uz]) => stump(ux * ROUND_SEAT_OUT, uz * ROUND_SEAT_OUT));
  return [
    cyl('top', 0, TOP_Y, 0, 1.7, TOP_H, TOP),
    ...runner(false, 1.4, 0.3),
    cyl('leg', 0, 0.36, 0, 0.14, 0.64, LEG, 0.24),
    cyl('foot', 0, 0.03, 0, 0.7, 0.06, LEG),
    ...lamp(0, 0),
    ...seats,
  ];
}

function longParts() {
  const legs = [[-1.9, -0.55], [1.9, -0.55], [-1.9, 0.55], [1.9, 0.55]].map(([x, z]) => box('leg', x, 0.355, z, 0.12, 0.71, 0.12, LEG));
  return [
    box('top', 0, TOP_Y, 0, 4.1, TOP_H, 1.3, TOP),
    ...runner(true, 3.8, 0.3),
    ...legs,
    ...lamp(-1.75, 0),
    ...lamp(1.75, 0),
    ...[-1.08, 1.08].flatMap(logBench),
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

export const PICNIC_STYLE = Object.freeze({
  parts: (shape) => (shape === 'long' ? longParts() : roundParts()),
  slots: (shape) => (shape === 'long' ? longSlots() : roundSlots()),
});
