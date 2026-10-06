// 🧪 실제 도감 id — three 가 없는 Node 에서 읽는다. museum.test.mjs 의 표본 DEX 는 칸 수가 낡아(fish 3) 배치 검증에 못 쓴다.
import { readFileSync } from 'node:fs';
import { VISITORS } from '../../js/habitat.js';
import { gameSource } from './game-source.mjs';

const DEXSRC = readFileSync(new URL('../../js/data/dex.js', import.meta.url), 'utf8');
const SRC = gameSource();
const ids = (src, start, end, re) => {
  const i = src.indexOf(start);
  if (i < 0) throw new Error(`${start} 를 찾지 못했다 — 도우미가 낡았다`);
  return [...src.slice(i, src.indexOf(end, i)).matchAll(re)].map(m => m[1]);
};
const staticIds = (cat) => ids(DEXSRC, `\n  ${cat}: [`, '\n  ],', /\{ id: '([a-z_]+)'/g);

export function realDexIds() {
  const out = {};
  for (const c of ['fish', 'crop', 'ore', 'forage', 'bug', 'track', 'dig', 'river', 'spirit', 'weather']) out[c] = staticIds(c);
  out.npc = [...ids(SRC, 'const NPCS = [', '\n];', /^    id: '([^']+)'/gm), ...ids(SRC, 'CAFE_GUESTS = [', '\n];', /\{ id: '([^']+)'/g)];
  out.cook = ids(SRC, 'const RECIPES = [', '\n];', /\{ id: '([^']+)'/g);
  out.visitor = VISITORS.map(v => v.id);
  return out;
}
