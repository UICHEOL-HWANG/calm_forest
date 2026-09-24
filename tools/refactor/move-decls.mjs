#!/usr/bin/env node
// =============================================================
//  🧪 game.js 의 순수 선언을 js/data/*.js 로 "원문 그대로" 옮긴다
//  ------------------------------------------------------------
//  사용: node tools/refactor/move-decls.mjs [--dry]
//  · 옮길지 말지는 lib/analyze.mjs 의 movableSet 이 정한다(여기서 판단하지 않는다)
//  · 어느 파일로 갈지는 아래 PLACE 표(원래 행 범위 → 파일)가 정한다
//  · 선언 원문은 한 글자도 바꾸지 않는다 — 앞에 `export ` 만 붙인다
//  · 선언 바로 위 주석 줄은 함께 옮긴다(빈 줄·구역 제목 줄 "──"/"═" 에서 멈춘다)
//  · 결과는 verify-move.mjs 로 증명한다
// =============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, movableSet } from './lib/analyze.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GAME = path.join(ROOT, 'js', 'game.js');
const DATA = path.join(ROOT, 'js', 'data');
const RANGE = [18, 2036];                       // 앞 구간(데이터 표) — 설계 문서 2절
const EXCLUDE = new Set(['clock', 'keys']);     // 런타임 객체는 데이터가 아니다

// 대상 파일 — 이름 지정이 먼저, 그다음 원래 행 범위(먼저 맞는 줄이 이긴다)
const PLACE = [
  { name: 'ZONE_PAGE', file: 'tools' }, { name: 'ZONE_TOOL', file: 'tools' },
  { name: 'INT', file: 'places' }, { name: 'ROOF_Y', file: 'places' }, { name: 'LAKE_R', file: 'places' },
  { name: 'HOUSE_POS', file: 'places' }, { name: 'OUTDOOR_REACH', file: 'catalog' },
  { name: 'DAY_SPEED', file: 'world' }, { name: 'PAL', file: 'world' },
  { lo: 18, hi: 160, file: 'tools' },         // 작물 종류·도구 표·도구 페이지·벌목/물 타이머
  { lo: 161, hi: 212, file: 'world' },        // 날씨 예보·경보 문구
  { lo: 213, hi: 315, file: 'catalog' },      // 가구·낚시·요리·버프
  { lo: 316, hi: 630, file: 'places' },       // 시설·관문·공간 좌표와 공간별 내용물
  { lo: 631, hi: 800, file: 'catalog' },      // 시세·상점·업그레이드·야외 장식·가공 시설
  { lo: 801, hi: 1300, file: 'npcs' },        // 선물·퀘스트 안내·주민·데일리/반복 의뢰
  { lo: 1301, hi: 1700, file: 'dex' },        // 도감·배지·이야기·닉네임·출석
  { lo: 1701, hi: 1880, file: 'character' },  // 팔·도구 자세·충돌 반경
  { lo: 1881, hi: 2036, file: 'places' },     // 집 외관 팔레트
];
const HEAD = {
  tools: '작물 종류·도구 표·도구 페이지·농사 타이머',
  world: '날씨 문구·하루 속도·팔레트',
  catalog: '가구·요리·버프·시세·상점·업그레이드·야외 장식·가공 시설',
  places: '시설·관문·공간 좌표와 공간별 내용물(손님·곤충·채집물·강·안개·바다) · 집 외관 팔레트',
  npcs: '주민·선물·퀘스트 안내·데일리/반복 의뢰',
  dex: '도감·배지·메인 이야기·닉네임·출석 보상',
  character: '팔·도구 쥐는 자세 상수·충돌 반경',
};

const dry = process.argv.includes('--dry');
const code = readFileSync(GAME, 'utf8');
const A = analyze(code);
const movable = movableSet(A, RANGE, EXCLUDE);
const lines = code.split('\n');

const placeOf = (s) => {
  for (const p of PLACE) {
    if (p.name && s.names.includes(p.name)) return p.file;
    if (p.lo && s.line >= p.lo && s.line <= p.hi) return p.file;
  }
  throw new Error(`자리 없음: ${s.names.join(',')}@${s.line}`);
};

// 옮길 문장 — 문장이 차지한 줄에 다른 문장이 없어야 줄 단위로 자를 수 있다
const occupied = new Map();
for (const s of A.stmts) for (let l = s.line; l <= s.endLine; l++) occupied.set(l, (occupied.get(l) || 0) + 1);
const moving = A.stmts.filter(s => s.names.length && s.names.every(n => movable.has(n)));
const skipped = [];
const plan = [];
const isComment = (t) => /^\s*\/\//.test(t);
const isHeader = (t) => /──|═|={4,}/.test(t);
for (const s of moving) {
  let ok = true;
  for (let l = s.line; l <= s.endLine; l++) if (occupied.get(l) !== 1) ok = false;
  if (!ok) { skipped.push(s.names.join(',')); continue; }
  let top = s.line;                               // 1-based
  while (top - 1 >= 1 && isComment(lines[top - 2]) && !isHeader(lines[top - 2]) && !occupied.get(top - 1)) top--;
  plan.push({ s, file: placeOf(s), top, bottom: s.endLine });
}
// 건너뛴 문장에 기대는 문장도 못 옮긴다 — 고정점으로 한 번 더 걸러낸다
let movedNames = new Set(plan.flatMap(p => p.s.names));
for (let changed = true; changed;) {
  changed = false;
  for (let i = plan.length - 1; i >= 0; i--) {
    if ([...plan[i].s.refs].some(r => !A.imports.has(r) && !movedNames.has(r))) {
      skipped.push(plan[i].s.names.join(',') + '(의존)'); plan.splice(i, 1); changed = true;
      movedNames = new Set(plan.flatMap(p => p.s.names));
    }
  }
}
const fileOf = new Map(plan.flatMap(p => p.s.names.map(n => [n, p.file])));

// 데이터 파일 만들기
const files = new Map();
for (const p of plan) { if (!files.has(p.file)) files.set(p.file, []); files.get(p.file).push(p); }
const relFromData = (src) => src.startsWith('./') ? '../' + src.slice(2) : src;
const out = new Map();
for (const [file, items] of files) {
  const need = new Map();   // source -> Set(spec text)
  const add = (src, spec) => { if (!need.has(src)) need.set(src, new Set()); need.get(src).add(spec); };
  for (const { s } of items) for (const r of s.refs) {
    if (A.imports.has(r)) {
      const im = A.imports.get(r);
      add(relFromData(im.source), im.imported === '*' ? `* as ${r}` : im.imported === 'default' ? `default as ${r}` : (im.imported === r ? r : `${im.imported} as ${r}`));
    } else if (fileOf.get(r) !== file) add(`./${fileOf.get(r)}.js`, r);
  }
  const imp = [...need].map(([src, specs]) => {
    const list = [...specs];
    const ns = list.find(x => x.startsWith('* as '));
    return ns ? `import ${ns} from '${src}';` : `import { ${list.join(', ')} } from '${src}';`;
  });
  const body = items.map(({ s, top, bottom }) => {
    const chunk = lines.slice(top - 1, bottom);
    const i = s.line - top;                      // 선언 첫 줄 — 여기에만 export 를 붙인다
    const col = s.node.loc.start.column;
    chunk[i] = chunk[i].slice(0, col) + 'export ' + chunk[i].slice(col);
    return chunk.join('\n');
  });
  const text = `// =============================================================\n//  📦 ${HEAD[file]}\n//  ------------------------------------------------------------\n//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).\n//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.\n//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md\n// =============================================================\n${imp.join('\n')}${imp.length ? '\n\n' : ''}${body.join('\n\n')}\n`;
  out.set(file, text);
}

// game.js: 옮긴 줄 삭제 + import 추가(마지막 import 문 뒤) — 남는 코드가 쓰는 이름만
const drop = new Set();
for (const p of plan) for (let l = p.top; l <= p.bottom; l++) drop.add(l);
const stillUsed = new Set();
for (const s of A.stmts) if (!s.names.length || !s.names.every(n => movedNames.has(n))) for (const r of s.refs) if (movedNames.has(r)) stillUsed.add(r);
const lastImport = Math.max(...A.stmts.filter(s => s.isImport).map(s => s.endLine));
const order = ['tools', 'world', 'catalog', 'places', 'npcs', 'dex', 'character'];
const importLines = order.filter(f => files.has(f)).map(f => {
  const names = files.get(f).flatMap(p => p.s.names).filter(n => stillUsed.has(n));
  if (!names.length) return null;
  const chunks = []; let cur = [];
  for (const n of names) { cur.push(n); if (cur.join(', ').length > 110) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  return `import {\n${chunks.map(c => '  ' + c.join(', ') + ',').join('\n')}\n} from './data/${f}.js';`;
}).filter(Boolean);
const newLines = [];
lines.forEach((t, i) => {
  const ln = i + 1;
  if (!drop.has(ln)) newLines.push(t);
  if (ln === lastImport) newLines.push('// 📦 데이터 표 — 원문 그대로 옮겼다(분리 1단계, 2026-09-24). 값만 있고 상태는 없다', ...importLines);
});
// 옮기고 난 자리에 빈 줄이 3개 이상 이어지면 2개로(코드가 아니라 검증 대상 아님)
const gameOut = newLines.join('\n').replace(/\n{4,}/g, '\n\n\n');

console.log(`옮김 ${plan.length}문장 · ${movedNames.size}이름 · game.js ${lines.length} → ${gameOut.split('\n').length}줄`);
for (const [f, t] of out) console.log(`  js/data/${f}.js  ${t.split('\n').length}줄`);
if (skipped.length) console.log('  건너뜀:', skipped.join(' '));
if (!dry) {
  mkdirSync(DATA, { recursive: true });
  for (const [f, t] of out) writeFileSync(path.join(DATA, `${f}.js`), t);
  writeFileSync(GAME, gameOut);
}
