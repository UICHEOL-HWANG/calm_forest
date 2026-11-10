import { HALL } from './data.js';
import { paintKit, bake } from './paint-merge.js';

const C = {
  wood: 0xc99a63, woodLine: 0xb6874f, tile: 0xe9e4da, tileAlt: 0xd8cfbf,
  cream: 0xf3e6cc, green: 0x2f5e47, top: 0x2f6b4f, counter: 0xefe6d2,
  stove: 0x3b3b3e, pan: 0x2c2c30, steel: 0x9aa0a8, crate: 0x9b6b3f, board: 0xd9a868,
  table: 0x9c6b42, tableLeg: 0x6e4a2c, stool: 0x2f5e47, leaf: 0x5f8f4e, pot: 0xe8dcc4, mat: 0x2f5e47,
  chalk: 0x2b2f2c, chalkFrame: 0x8a6a48, plate: 0xffffff, bin: 0x6d7a6a, fish: 0x5b8fb0, rice: 0xf4efe4,
};

function room(K, g) {
  const { put, box, ball, tag } = K;
  const hx = HALL.half.x, hz = HALL.half.z, split = 0.8;
  put(g, box(hx * 2 + 0.8, 0.4, hz * 2 + 0.8), tag(0xd8c7a0), [0, -0.2, 0]);
  put(g, box(hx + split, 0.02, hz * 2), tag(C.wood), [(-hx + split) / 2, 0.01, 0]);
  for (let x = -hx + 0.9; x < split; x += 0.9) put(g, box(0.03, 0.01, hz * 2), tag(C.woodLine), [x, 0.025, 0]);
  put(g, box(hx - split, 0.02, hz * 2), tag(C.tile), [(hx + split) / 2, 0.01, 0]);
  for (let x = split + 0.2; x < hx; x += 0.8) for (let z = -hz + 0.2; z < hz; z += 0.8) {
    if (((x + z) * 1.25 | 0) % 2 === 0) put(g, box(0.78, 0.012, 0.78), tag(C.tileAlt), [x + 0.4, 0.02, z + 0.4]);
  }
  const wall = (w, d, x, z, h) => {
    put(g, box(w, Math.min(h, 0.7), d), tag(C.green), [x, Math.min(h, 0.7) / 2, z]);
    if (h > 0.7) put(g, box(w, h - 0.7, d), tag(C.cream), [x, 0.7 + (h - 0.7) / 2, z]);
  };
  wall(hx * 2 + 0.35, 0.35, 0, -hz, 1.3);
  wall(0.35, hz * 2 + 0.35, -hx, 0, 1.3);
  wall(0.35, hz * 2 + 0.35, hx, 0, 1.3);
  const doorL = HALL.door.x - 0.8, doorR = HALL.door.x + 0.8;
  wall(doorL + hx, 0.35, (-hx + doorL) / 2, hz, 0.5);
  wall(hx - doorR, 0.35, (doorR + hx) / 2, hz, 0.5);
  wall(0.3, 2.4, split, -2.9, 1.3);
  wall(0.3, 1.4, split, 1.0, 1.3);
  put(g, box(0.5, 0.85, 1.6), tag(C.counter), [split, 0.43, -0.9]);
  put(g, box(0.56, 0.06, 1.66), tag(C.top), [split, 0.88, -0.9]);
  put(g, box(1.3, 0.02, 0.8), tag(C.mat), [HALL.door.x + 0.3, 0.03, HALL.door.z + 0.1]);
  for (const [x, z] of [[-6.6, -3.6], [-0.4, -3.6]]) {
    put(g, K.cyl(0.26, 0.2, 0.42, 10), tag(C.pot), [x, 0.21, z]);
    put(g, ball(0.38, 0), tag(C.leaf), [x, 0.68, z]);
  }
  const b = HALL.board;
  put(g, box(0.9, 1.1, 0.06), tag(C.chalk), [b.x, 0.95, b.z], [-0.12, 0, 0]);
  put(g, box(1.0, 1.2, 0.04), tag(C.chalkFrame), [b.x, 0.95, b.z - 0.03], [-0.12, 0, 0]);
  for (const s of [-1, 1]) put(g, box(0.06, 0.9, 0.06), tag(C.chalkFrame), [b.x + s * 0.42, 0.42, b.z - 0.12], [0.2, 0, 0]);
  [1.25, 1.05, 0.85].forEach((y, i) => put(g, box(0.6 - i * 0.12, 0.04, 0.01), tag(C.rice), [b.x, y, b.z + 0.04 - (y - 0.95) * 0.12], [-0.12, 0, 0]));
}

function counter(K, g) {
  K.put(g, K.box(1.1, 0.85, 1.0), K.tag(C.counter), [0, 0.43, 0]);
  K.put(g, K.box(1.14, 0.06, 1.04), K.tag(C.top), [0, 0.88, 0]);
}

function station(K, g, s) {
  const { put, box, cyl, ball, tag } = K;
  if (s.kind === 'trash') {
    put(g, cyl(0.33, 0.28, 0.75, 10), tag(C.bin), [0, 0.38, 0]);
    put(g, cyl(0.35, 0.35, 0.06, 10), tag(0x56614f), [0, 0.78, 0]);
    return;
  }
  counter(K, g);
  if (s.kind === 'crate') {
    put(g, box(0.8, 0.35, 0.65), tag(C.crate), [0, 1.08, 0]);
    for (let i = 0; i < 3; i++) {
      if (s.give === 'fish') put(g, ball(0.12, 0), tag(C.fish), [-0.22 + i * 0.22, 1.28, 0], [0, 0, 0], [1.6, 0.7, 0.8]);
      else put(g, ball(0.13, 0), tag(C.rice), [-0.22 + i * 0.22, 1.28, 0]);
    }
  } else if (s.kind === 'board') {
    put(g, box(0.75, 0.06, 0.55), tag(C.board), [0, 0.94, 0]);
    put(g, box(0.4, 0.03, 0.07), tag(0xc9ccd2), [0.25, 0.98, 0.18], [0, 0.5, 0]);
  } else if (s.kind === 'pan') {
    put(g, box(1.0, 0.04, 0.9), tag(C.stove), [0, 0.92, 0]);
    put(g, cyl(0.33, 0.28, 0.08, 12), tag(C.pan), [0, 0.99, 0]);
    put(g, box(0.45, 0.04, 0.07), tag(C.tableLeg), [-0.5, 0.99, 0]);
  } else if (s.kind === 'pot') {
    put(g, box(1.0, 0.04, 0.9), tag(C.stove), [0, 0.92, 0]);
    put(g, cyl(0.34, 0.3, 0.4, 12), tag(C.steel), [0, 1.15, 0]);
  } else if (s.kind === 'plates') {
    for (let i = 0; i < 5; i++) put(g, cyl(0.26, 0.22, 0.05, 10), tag(C.plate), [0, 0.94 + i * 0.06, 0]);
  }
}

function table(K, g) {
  const { put, cyl, tag } = K;
  put(g, cyl(0.72, 0.72, 0.1, 14), tag(C.table), [0, 0.7, 0]);
  put(g, cyl(0.1, 0.16, 0.66, 8), tag(C.tableLeg), [0, 0.34, 0]);
  put(g, cyl(0.27, 0.27, 0.4, 10), tag(C.stool), [0, 0.2, -1.0]);
}

export function buildHall(THREE) {
  const K = paintKit(THREE);
  const group = new THREE.Group();
  group.add(...bake(THREE, s => room(K, s)));
  const stations = {};
  for (const s of HALL.stations) {
    const g = new THREE.Group();
    g.position.set(s.x, 0, s.z);
    if (s.kind !== 'pass') g.add(...bake(THREE, sc => station(K, sc, s)));
    group.add(g);
    stations[s.id] = g;
  }
  const tables = HALL.tables.map(([x, z]) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(...bake(THREE, sc => table(K, sc)));
    group.add(g);
    return g;
  });
  return { group, stations, tables };
}

export function showForStar(hall, star, tablesForStar) {
  for (const s of HALL.stations) hall.stations[s.id].visible = !s.need || star >= s.need;
  hall.tables.forEach((t, i) => { t.visible = i < tablesForStar; });
}

const ITEM_Y = { pass: 0.92, pot: 1.38, pan: 1.04 };
export const itemHeight = kind => ITEM_Y[kind] ?? 0.98;

function food(K, sc, item) {
  const { put, ball, cyl, box, tag } = K;
  if (item.plated) put(sc, cyl(0.3, 0.25, 0.05, 12), tag(C.plate), [0, 0, 0]);
  const y = item.plated ? 0.06 : 0;
  switch (item.kind) {
    case 'fish': put(sc, ball(0.16, 0), tag(C.fish), [0, y + 0.06, 0], [0, 0, 0], [1.6, 0.7, 0.8]); break;
    case 'rice': put(sc, ball(0.17, 0), tag(C.rice), [0, y + 0.07, 0]); break;
    case 'fishChop': for (let i = 0; i < 3; i++) put(sc, box(0.12, 0.08, 0.16), tag(0xf0b0a0), [-0.14 + i * 0.14, y + 0.05, 0]); break;
    case 'riceball':
      put(sc, ball(0.15, 0), tag(C.rice), [0, y + 0.1, 0], [0, 0, 0], [1, 1.1, 0.8]);
      put(sc, box(0.2, 0.1, 0.02), tag(0x24402f), [0, y + 0.05, 0.11]);
      break;
    case 'grilled': put(sc, ball(0.16, 0), tag(0xc98a4a), [0, y + 0.06, 0], [0, 0, 0], [1.6, 0.65, 0.8]); break;
    case 'soup':
      put(sc, cyl(0.2, 0.15, 0.14, 12), tag(0xf4efe4), [0, y + 0.07, 0]);
      put(sc, cyl(0.17, 0.17, 0.02, 12), tag(0xe8a85a), [0, y + 0.14, 0]);
      break;
    default: put(sc, ball(0.15, 0), tag(0x3a3330), [0, y + 0.06, 0], [0, 0, 0], [1.4, 0.6, 0.8]);
  }
}

export function itemMesh(THREE, item) {
  const K = paintKit(THREE);
  const g = new THREE.Group();
  g.add(...bake(THREE, sc => food(K, sc, item)));
  return g;
}
