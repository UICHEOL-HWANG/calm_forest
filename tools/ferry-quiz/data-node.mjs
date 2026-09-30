// 🦆 Node(테스트·검수)용 퀴즈 데이터 — 브라우저에선 game.js quizData() 가 같은 모양을 만든다.
//    catalog.js·places.js 는 three 를 끌고 와 import 불가 → 원문 파싱.
import { readFileSync } from 'node:fs';
import { NPCS } from '../../js/data/npcs.js';
import { FRUITS } from '../../js/orchard.js';
import { FARM_BUILDINGS } from '../../js/farm-building.js';
import { recipesFromSource } from '../free-pot/recipes-src.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockUntil = (t, start, end) => { const i = t.indexOf(start); return t.slice(i, t.indexOf(end, i)); };

export function nodeQuizData() {
  const EN = read('../../js/i18n-en.js'), CAT = read('../../js/data/catalog.js'), PL = read('../../js/data/places.js');
  // 값은 작은따옴표 또는 큰따옴표("A Neighbour's Share" 처럼 ' 가 든 것) — 둘 다 읽는다
  const en = (ko) => { const m = EN.match(new RegExp(`'${esc(ko)}':\\s*(?:'((?:[^'\\\\]|\\\\.)+)'|"((?:[^"\\\\]|\\\\.)+)")`)); return m ? (m[1] ?? m[2]).replace(/\\'/g, "'") : ko; };
  const recipes = recipesFromSource(CAT).map(r => ({ ...r, ico: CAT.match(new RegExp(`id: '${r.id}'[^\\n]*ico: '([^']+)'`))[1],
    buff: CAT.match(new RegExp(`id: '${r.id}'[^\\n]*buff: '(\\w+)'`))[1] }));
  // ⚠️ 표 블록 안에서만 찾는다 — 파일 전체에 돌리면 COOK_MG 같은 다른 표가 섞이고(2026-09-29 실측) 두 칸 들여쓰기 키를 놓친다
  const buffs = {};
  for (const m of blockUntil(CAT, 'export const BUFF_META', '\n};').matchAll(/(\w+):\s+\{ ico: '([^']+)', name: '([^']+)'/g)) buffs[m[1]] = { ico: m[2], name: m[3] };
  const riverPicks = [...blockUntil(PL, 'export const RIVER_PICKS', '\n];').matchAll(/\{ id: '(\w+)',\s*name: '([^']+)',\s*ico: '([^']+)'.*$/gm)]
    .map(m => ({ id: m[1], name: m[2], ico: m[3], night: /night: true/.test(m[0]) }));
  const boatRunsPerDay = Number(PL.match(/BOAT_RUNS_PER_DAY = (\d+)/)[1]);
  return { fruits: FRUITS, npcs: NPCS.map(n => ({ id: n.id, name: n.name, emoji: n.emoji, quests: n.quests.map(q => q.title) })), recipes,
    buffs, riverPicks, farmBuildings: FARM_BUILDINGS.filter(b => b.farm), boatRunsPerDay, en };
}
