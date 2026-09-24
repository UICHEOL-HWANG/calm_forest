#!/usr/bin/env node
// =============================================================
//  🧪 "순수 이동" 증명 — 기준 커밋의 game.js 와 지금 트리를 AST 로 비교한다
//  ------------------------------------------------------------
//  사용: node tools/refactor/verify-move.mjs [기준커밋=main]
//  하나라도 어긋나면 exit 1. 검사 항목은 설계 문서 3-1 의 (a)~(f) + 바깥 API.
//   (a) game.js 에서 사라진 선언은 js/data/*.js 중 정확히 한 곳에, `export ` 를 뺀 원문이 바이트 단위로 같다
//   (b) js/data/*.js 에는 import 와 export 선언 외에 아무 코드도 없다
//   (c) game.js 는 선언 삭제·import 추가 외에 코드가 바뀌지 않았다(주석·공백 제외 AST 비교)
//   (d) 옮긴 선언은 전부 이동 조건(lib/analyze.mjs movableSet)을 만족한다
//   (e) data → game.js import 금지, data 파일 사이 순환 금지
//   (f) 모든 파일에서 "새로 생긴 전역 참조" 없음 — import 누락이면 여기서 잡힌다
//   (g) game.js 의 export 목록이 그대로다(index.html·controls.js·sims 가 쓰는 창구)
//   (h) data 파일의 import 는 game.js 가 쓰던 것과 같은 모듈의 같은 이름을 가리킨다
// =============================================================
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { analyze, movableSet, unboundNames, parse } from './lib/analyze.mjs';

const require = createRequire(import.meta.url);
const generate = require('@babel/generator').default;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE_REF = process.argv[2] || 'main';
const RANGE = [18, 2036];
const EXCLUDE = new Set(['clock', 'keys']);

const fails = [];
const fail = (tag, msg) => fails.push(`(${tag}) ${msg}`);

const baseCode = execFileSync('git', ['show', `${BASE_REF}:js/game.js`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const newCode = readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
const B = analyze(baseCode), N = analyze(newCode);
const dataDir = path.join(ROOT, 'js/data');
const dataFiles = existsSync(dataDir) ? readdirSync(dataDir).filter(f => f.endsWith('.js')).sort() : [];
const D = new Map(dataFiles.map(f => [f, analyze(readFileSync(path.join(dataDir, f), 'utf8'))]));

// ── (a) 사라진 선언 → data 에 원문 그대로 ──
const baseNames = new Set(B.byName.keys()), newNames = new Set(N.byName.keys());
const removed = [...baseNames].filter(n => !newNames.has(n));
const removedStmts = new Set(removed.map(n => B.byName.get(n)));
const where = new Map();  // name -> data file
for (const [f, A] of D) for (const s of A.stmts) for (const n of s.names) {
  if (where.has(n)) fail('a', `${n} 가 data 에 두 번(${where.get(n)}, ${f})`);
  where.set(n, f);
}
for (const s of removedStmts) {
  for (const n of s.names) if (!where.has(n)) fail('a', `${n} 가 game.js 에서 사라졌는데 js/data 어디에도 없다`);
  const f = where.get(s.names[0]); if (!f) continue;
  const A = D.get(f);
  const t = A.byName.get(s.names[0]);
  if (!t.exported) fail('a', `${f}:${s.names[0]} 가 export 되지 않았다`);
  const decl = t.node.declaration || t.node;
  const got = A.code.slice(decl.start, decl.end);
  const want = baseCode.slice(s.node.start, s.node.end);
  if (got !== want) fail('a', `${f}:${s.names[0]} 원문이 다르다`);
  if (s.names.join() !== t.names.join()) fail('a', `${f}:${s.names[0]} 선언에 묶인 이름이 다르다(${s.names} vs ${t.names})`);
}
// data 에 있는데 기준 game.js 에 없던 이름(새로 만든 코드)
for (const n of where.keys()) if (!removed.includes(n)) fail('a', `${where.get(n)}:${n} 는 game.js 에서 옮겨 온 이름이 아니다`);

// ── (b) data 에는 import 와 export 선언만 ──
for (const [f, A] of D) for (const s of A.stmts) {
  if (s.isImport) continue;
  if (!(s.node.type === 'ExportNamedDeclaration' && s.node.declaration)) fail('b', `${f}:${s.line} 에 import/export 선언이 아닌 코드가 있다`);
}

// ── (c) game.js 코드 동일성 — 기준에서 옮긴 문장을 빼고, 새 쪽에서 data import 를 빼고, 주석 없이 출력해 비교 ──
const strip = (A, drop) => {
  const ast = parse(A.code);
  ast.program.body = ast.program.body.filter((node, i) => !drop(A.stmts[i]));
  return generate(ast, { comments: false, compact: true }).code;
};
const isDataImport = (s) => s.isImport && s.node.source.value.startsWith('./data/');
const baseRest = strip(B, s => removedStmts.has(s));
const newRest = strip(N, s => isDataImport(s));
if (baseRest !== newRest) {
  let i = 0; while (i < baseRest.length && baseRest[i] === newRest[i]) i++;
  fail('c', `game.js 코드가 옮기기 외에 바뀌었다 — 첫 차이 근처:\n    기준: …${baseRest.slice(Math.max(0, i - 60), i + 60)}…\n    지금: …${newRest.slice(Math.max(0, i - 60), i + 60)}…`);
}

// ── (d) 옮긴 선언은 이동 조건을 만족 ──
const ok = movableSet(B, RANGE, EXCLUDE);
for (const n of removed) if (!ok.has(n)) fail('d', `${n} 는 이동 조건을 만족하지 않는다`);

// ── (e) 순환 금지 ──
const edges = new Map();
for (const [f, A] of D) {
  edges.set(f, []);
  for (const s of A.stmts) if (s.isImport) {
    const src = s.node.source.value;
    if (/game\.js$/.test(src)) fail('e', `${f} 가 game.js 를 import 한다`);
    if (src.startsWith('./')) edges.get(f).push(src.slice(2));
  }
}
const seen = new Map();
const dfs = (f, stack) => {
  if (seen.get(f) === 1) { fail('e', `data 순환: ${[...stack, f].join(' → ')}`); return; }
  if (seen.get(f) === 2) return;
  seen.set(f, 1); for (const g of edges.get(f) || []) dfs(g, [...stack, f]); seen.set(f, 2);
};
for (const f of D.keys()) dfs(f, []);

// ── (f) 새로 생긴 전역 참조 없음 ──
const baseGlobals = unboundNames(B.ast);
for (const n of unboundNames(N.ast)) if (!baseGlobals.has(n)) fail('f', `game.js 에 바인딩 없는 이름 ${n} (import 누락?)`);
for (const [f, A] of D) for (const n of unboundNames(A.ast)) if (!baseGlobals.has(n)) fail('f', `${f} 에 바인딩 없는 이름 ${n} (import 누락?)`);
// game.js 가 import 한 data 이름은 그 파일이 실제로 export 한다
for (const s of N.stmts.filter(isDataImport)) {
  const f = s.node.source.value.replace('./data/', '');
  for (const sp of s.node.specifiers) if (!D.get(f)?.byName.get(sp.imported.name)?.exported) fail('f', `game.js 가 ${f} 에서 ${sp.imported.name} 를 import 하는데 없다`);
}

// ── (g) game.js export 목록 ──
const exportsOf = (A) => A.stmts.filter(s => s.exported).flatMap(s => s.names).sort().join(',');
if (exportsOf(B) !== exportsOf(N)) fail('g', `game.js export 목록이 바뀌었다\n    기준: ${exportsOf(B)}\n    지금: ${exportsOf(N)}`);

// ── (h) data import 가 원래와 같은 대상을 가리킨다 ──
const abs = (fromDir, src) => src.startsWith('.') ? path.normalize(path.join(fromDir, src)) : src;
for (const [f, A] of D) for (const s of A.stmts) if (s.isImport) {
  const src = s.node.source.value;
  if (src.startsWith('./') && dataFiles.includes(src.slice(2))) {
    for (const sp of s.node.specifiers) if (!D.get(src.slice(2)).byName.get(sp.imported.name)) fail('h', `${f}: ${src} 에 ${sp.imported.name} 없음`);
    continue;
  }
  for (const sp of s.node.specifiers) {
    const orig = B.imports.get(sp.local.name);
    const kind = sp.type === 'ImportSpecifier' ? sp.imported.name : sp.type === 'ImportNamespaceSpecifier' ? '*' : 'default';
    if (!orig) { fail('h', `${f}: ${sp.local.name} 는 game.js 가 import 하던 이름이 아니다`); continue; }
    if (abs('js/data', src) !== abs('js', orig.source) || orig.imported !== kind) fail('h', `${f}: ${sp.local.name} 가 다른 모듈을 가리킨다(${src} vs ${orig.source})`);
  }
}

const lines = (c) => c.split('\n').length;
console.log(`기준 ${BASE_REF}: game.js ${lines(baseCode)}줄 → 지금 ${lines(newCode)}줄 · 옮긴 이름 ${removed.length} · data 파일 ${dataFiles.length}`);
if (fails.length) { console.log(`❌ 순수 이동 아님 — ${fails.length}건`); fails.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('✅ 순수 이동 증명 통과 (a~h)');
