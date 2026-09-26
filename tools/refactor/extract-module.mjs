#!/usr/bin/env node
// =============================================================
//  🧪 game.js 의 한 구역(// === 머리말 사이)을 js/spaces/<이름>.js 로 옮긴다 — 순환 import + $w 세터
//  ------------------------------------------------------------
//  사용: node tools/refactor/extract-module.mjs <이름> "<시작 머리말 문구>" "<끝 머리말 문구>" [--dry]
//        머리말 문구 = `// ===` 바로 다음 줄에 있는 제목의 일부(그 줄이 딱 하나여야 한다)
//  설계: docs/superpowers/specs/2026-09-25-gamejs-split-phase2-design.md · 증명: verify-extract.mjs
//
//  무엇을 옮기나(규칙은 여기서만 판정)
//   · 구역 안의 최상위 **선언**(function·const·let). 실행문·export 선언은 남긴다
//   · const/let 의 로딩 시점 초기화가 game.js 값을 읽으면 남긴다(순환 import 의 TDZ)
//   · let 은 대입하는 문장이 전부 옮기는 쪽에 있을 때만 함께 간다
//  옮긴 코드의 변화는 딱 둘: 선언 앞 `export ` · game.js 에 남은 let 에 대한 **쓰기**를 `$w.x` 로
// =============================================================
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze } from './lib/analyze.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GAME = path.join(ROOT, 'js', 'game.js');
const SPACES = path.join(ROOT, 'js', 'spaces');
const [name, startMark, endMark] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const dry = process.argv.includes('--dry');
if (!name || !startMark || !endMark) { console.error('사용: extract-module.mjs <이름> "<시작 머리말>" "<끝 머리말>" [--dry]'); process.exit(1); }

const code = readFileSync(GAME, 'utf8');
const lines = code.split('\n');
const A = analyze(code);

// ── 구역 경계 ──
const findHeader = (mark) => {
  const hits = lines.map((t, i) => [t, i]).filter(([t, i]) => t.includes(mark) && i > 0 && /^\/\/ =+$/.test(lines[i - 1]));
  if (hits.length !== 1) throw new Error(`머리말 "${mark}" 가 ${hits.length}곳 — 하나여야 한다`);
  return hits[0][1];   // 0-based 제목 줄
};
const lo = findHeader(startMark) + 1, hi = findHeader(endMark) + 1;   // 1-based 줄 [lo, hi)

const top = new Map(A.stmts.map(s => [s.node, s]));
const isDecl = (s) => !s.isImport && s.names.length && ['function', 'const', 'let'].includes(s.kind);
const localNames = new Set(A.stmts.filter(s => !s.isImport).flatMap(s => s.names));
const topOf = (p) => { let q = p; while (q.parentPath && q.parentPath !== A.prog) q = q.parentPath; return top.get(q.node); };

// 로딩 시점(함수 몸체 밖)에 읽는 최상위 이름
function loadRefs(s) {
  const out = new Set();
  if (s.kind === 'function') return out;
  s.path.traverse({
    Function(p) { p.skip(); },
    ReferencedIdentifier(p) {
      const n = p.node.name, b = p.scope.getBinding(n);
      if (b && b.scope === A.scope && localNames.has(n)) out.add(n);
    },
  });
  return out;
}
// 쓰기 대상 식별자 노드(치환 자리) — 단순 대입·증감만. 구조분해 대입·for-in/of 대입이면 null(옮기지 않는다)
const siteCache = new Map();
function writeSites(s) {
  if (siteCache.has(s)) return siteCache.get(s);
  const sites = []; let bad = false;
  s.path.traverse({
    AssignmentExpression(p) {
      const l = p.node.left;
      if (l.type === 'Identifier') { const b = p.scope.getBinding(l.name); if (b && b.scope === A.scope) sites.push(l); }
      else if (l.type === 'ObjectPattern' || l.type === 'ArrayPattern') {
        p.get('left').traverse({ Identifier(ip) { const b = ip.scope.getBinding(ip.node.name); if (b && b.scope === A.scope) bad = true; } });
      }
    },
    UpdateExpression(p) {
      const a = p.node.argument;
      if (a.type === 'Identifier') { const b = p.scope.getBinding(a.name); if (b && b.scope === A.scope) sites.push(a); }
    },
    ForXStatement(p) {
      const l = p.node.left;
      if (l.type === 'Identifier') { const b = p.scope.getBinding(l.name); if (b && b.scope === A.scope) bad = true; }
    },
  });
  const r = bad ? null : sites;
  siteCache.set(s, r);
  return r;
}

// ── 옮길 문장 고르기(고정점) ──
const S = new Set(A.stmts.filter(s => isDecl(s) && !s.exported && s.line >= lo && s.line < hi));
const skipped = new Map();
const drop = (s, why) => { if (S.delete(s)) skipped.set(s.names.join(','), why); };
// 이미 옮긴 모듈이 game.js 에서 가져다 쓰는 이름은 남긴다 — 옮기면 그 import 가 끊긴다(예: 공용 woodMat)
const usedBySpaces = new Map();
if (existsSync(SPACES)) for (const f of readdirSync(SPACES).filter(f => f.endsWith('.js') && f !== `${name}.js`)) {
  for (const [local, im] of analyze(readFileSync(path.join(SPACES, f), 'utf8')).imports) if (im.source === '../game.js') usedBySpaces.set(im.imported, f);
}
for (const s of [...S]) { const n = s.names.find(n => usedBySpaces.has(n)); if (n) drop(s, `spaces/${usedBySpaces.get(n)} 가 game.js 에서 가져다 씀`); }
for (let changed = true; changed;) {
  changed = false;
  const inS = new Set([...S].flatMap(s => s.names));
  for (const s of [...S]) {
    if (writeSites(s) === null) { drop(s, '구조분해 대입'); changed = true; continue; }
    if (s.kind === 'let') {
      let outside = false;
      for (const n of s.names) {
        const b = A.scope.getBinding(n);
        if (b.constantViolations.some(c => !S.has(topOf(c)))) outside = true;
      }
      if (outside) { drop(s, 'game.js 에서도 대입'); changed = true; continue; }
    }
    for (const r of loadRefs(s)) {
      const def = A.byName.get(r);
      if (!inS.has(r)) { drop(s, `로딩 시점에 ${r} 를 읽음`); changed = true; break; }
      if (def && def.line > s.line && def.kind !== 'function') { drop(s, `로딩 시점에 뒤의 ${r} 를 읽음`); changed = true; break; }
    }
  }
}
if (!S.size) { console.log('옮길 것이 없다'); process.exit(0); }
const moved = new Set([...S].flatMap(s => s.names));

// ── 옮기는 코드가 쓰는 바깥 이름 ──
const needFromGame = new Set(), needImport = new Map(), dollarW = new Set();
for (const s of S) {
  for (const r of s.refs) {
    if (moved.has(r)) continue;
    if (A.imports.has(r)) needImport.set(r, A.imports.get(r));
    else if (localNames.has(r)) needFromGame.add(r);
  }
  for (const site of writeSites(s)) if (!moved.has(site.name)) dollarW.add(site.name);
}
for (const n of dollarW) needFromGame.add(n);   // 읽기는 live binding 으로 — 쓰기만 $w
const gameUses = new Set();
for (const s of A.stmts) if (!S.has(s)) for (const r of s.refs) if (moved.has(r)) gameUses.add(r);

// ── 모듈 텍스트 ──
const isComment = (t) => /^\s*\/\//.test(t);
const isHeader = (t) => /──|═|={4,}/.test(t);
const occupied = new Map();
for (const s of A.stmts) for (let l = s.line; l <= s.endLine; l++) occupied.set(l, (occupied.get(l) || 0) + 1);
const plan = [...S].sort((a, b) => a.line - b.line).map(s => {
  for (let l = s.line; l <= s.endLine; l++) if (occupied.get(l) !== 1) throw new Error(`${s.names} 줄을 다른 문장과 나눠 쓴다`);
  let topL = s.line;
  while (topL - 1 >= lo && isComment(lines[topL - 2]) && !isHeader(lines[topL - 2]) && !occupied.get(topL - 1)) topL--;
  return { s, top: topL };
});
const rel = (src) => src.startsWith('./') ? '../' + src.slice(2) : src;
const bySource = new Map();
for (const [local, im] of needImport) {
  const src = rel(im.source);
  if (!bySource.has(src)) bySource.set(src, []);
  bySource.get(src).push(im.imported === '*' ? `* as ${local}` : im.imported === 'default' ? `default as ${local}` : im.imported === local ? local : `${im.imported} as ${local}`);
}
const wrap = (names) => { const out = []; let cur = []; for (const n of names) { cur.push(n); if (cur.join(', ').length > 100) { out.push(cur); cur = []; } } if (cur.length) out.push(cur); return out.map(c => '  ' + c.join(', ') + ',').join('\n'); };
const importLines = [];
if (needFromGame.size) {
  const g = [...needFromGame].sort(); if (dollarW.size) g.unshift('$w');
  importLines.push(`import {\n${wrap(g)}\n} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))`);
}
for (const [src, specs] of [...bySource].sort()) {
  const ns = specs.find(x => x.startsWith('* as '));
  importLines.push(ns ? `import ${ns} from '${src}';` : `import { ${specs.sort().join(', ')} } from '${src}';`);
}
const body = plan.map(({ s, top: topL }) => {
  let txt = code.slice(s.start, s.end);
  const sites = writeSites(s).filter(id => dollarW.has(id.name)).sort((a, b) => b.start - a.start);
  for (const id of sites) txt = txt.slice(0, id.start - s.start) + '$w.' + txt.slice(id.start - s.start);   // 뒤에서부터 — 앞 오프셋이 안 밀린다
  const lead = lines.slice(topL - 1, s.line - 1).join('\n');
  const col = s.node.loc.start.column;
  return (lead ? lead + '\n' : '') + lines[s.line - 1].slice(0, col) + 'export ' + txt;
});
const title = lines[lo - 1].replace(/^\/\/\s*/, '');
const modText = `// =============================================================
//  ${title}
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, ${new Date().toISOString().slice(0, 10)}).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 \`$w.x = …\` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
${importLines.join('\n')}

${body.join('\n\n')}
`;

// ── game.js 고치기 ──
const dropLines = new Set();
for (const { s, top: topL } of plan) for (let l = topL; l <= s.endLine; l++) dropLines.add(l);
// 옮긴 코드가 game.js 에서 가져가는 이름 — 선언에 export 를 붙이지 않고(원문 보존) 파일 끝 export 목록 한 줄로
//   ⚠️ 선언 앞에 붙이면 game.js 를 텍스트로 검사하는 테스트(`^let indoor = false`)가 깨진다
const EX_NOTE = '// 🔁 js/spaces/* 가 가져다 쓰는 이름 — 선언 원문은 그대로 두고 여기서만 내보낸다(tools/refactor/extract-module.mjs)';
const existingEx = A.stmts.find(s => s.node.type === 'ExportNamedDeclaration' && !s.node.declaration && lines[s.line - 2] === EX_NOTE);
const exNames = new Set(existingEx ? existingEx.node.specifiers.map(sp => sp.local.name) : []);
for (const n of needFromGame) { const s = A.byName.get(n); if (s && !s.exported) exNames.add(n); }
for (const n of moved) exNames.delete(n);   // 옮겨 간 이름은 더 이상 game.js 에 없다
const exDecl = exNames.size ? `${EX_NOTE}\nexport {\n${wrap([...exNames].sort())}\n};` : null;
const exSpan = existingEx ? [existingEx.line - 1, existingEx.endLine] : null;
// $w 접근자 — 이미 있으면 속성을 합쳐 다시 쓴다
const existingW = A.byName.get('$w');
const wNames = new Set(dollarW);
if (existingW) (existingW.node.declaration || existingW.node).declarations[0].init.properties.forEach(p => { if (p.kind === 'get') wNames.add(p.key.name); });
const W_NOTE = '// 🔁 js/spaces/* 가 game.js 의 let 에 쓸 때 거치는 접근자(읽기는 import 한 live binding) — tools/refactor/extract-module.mjs 가 만든다';
const wDecl = wNames.size ? `${W_NOTE}\nexport const $w = {\n${[...wNames].sort().map(n => `  get ${n}() { return ${n}; }, set ${n}(v) { ${n} = v; },`).join('\n')}\n};` : null;
const wSpan = existingW ? [existingW.line - (lines[existingW.line - 2] === W_NOTE ? 1 : 0), existingW.endLine] : null;
const lastImport = Math.max(...A.stmts.filter(s => s.isImport).map(s => s.endLine));
const useLine = gameUses.size ? `import {\n${wrap([...gameUses].sort())}\n} from './spaces/${name}.js';   // 📦 ${title}` : null;
const out = [];
lines.forEach((t, i) => {
  const ln = i + 1;
  if (wSpan && ln >= wSpan[0] && ln <= wSpan[1]) { if (ln === wSpan[1]) out.push(wDecl); return; }
  if (exSpan && ln >= exSpan[0] && ln <= exSpan[1]) return;   // 끝에 다시 쓴다
  if (dropLines.has(ln)) return;
  out.push(t);
  if (ln === lastImport) {
    if (useLine) out.push(useLine);
    if (!existingW && wDecl) out.push(wDecl);
  }
});
while (out.length && out[out.length - 1] === '') out.pop();
if (exDecl) out.push('', exDecl);
const gameOut = out.join('\n').replace(/\n{4,}/g, '\n\n\n') + '\n';

console.log(`📦 ${name}: ${title}`);
console.log(`   옮김 ${S.size}문장(${moved.size}이름) · game.js ${lines.length} → ${gameOut.split('\n').length}줄 · 모듈 ${modText.split('\n').length}줄`);
console.log(`   game.js 에서 가져감 ${needFromGame.size} · $w 쓰기 ${[...dollarW].join(',') || '없음'} · game.js 가 되가져감 ${gameUses.size}`);
if (skipped.size) console.log('   남김:', [...skipped].map(([k, v]) => `${k}(${v})`).join(' · '));
if (!dry) {
  mkdirSync(SPACES, { recursive: true });
  const target = path.join(SPACES, `${name}.js`);
  if (existsSync(target)) throw new Error(`${target} 가 이미 있다`);
  writeFileSync(target, modText);
  writeFileSync(GAME, gameOut);
}
