#!/usr/bin/env node
// =============================================================
//  🧪 분리 2단계 증명 — 기준 커밋 대비 "옮기기 + 기계적 치환" 외에 바뀐 게 없음을 AST 로 보인다
//  ------------------------------------------------------------
//  사용: node tools/refactor/verify-extract.mjs <기준커밋>
//  설계 3절 (a)~(h). 하나라도 어긋나면 exit 1.
//   (a) 선언 이름 집합이 같고 선언마다 정규화 코드가 같다
//       정규화 = 주석·공백 제거 · export 래퍼 제거 · js/spaces 안의 `$w.x` 쓰기 → `x`
//   (b) game.js 에 남은 문장(선언·실행문)의 순서와 내용이 같다(추가 import·export·$w 제외)
//   (c) js/spaces/*.js 는 import 와 export 선언만 가진다
//   (d) js/spaces/*.js 의 로딩 시점 코드(함수 밖)가 game.js 에서 가져온 이름을 읽지 않는다(순환 TDZ)
//   (e) 모든 import 가 실제 export 를 가리키고, 외부 모듈 import 는 base 와 같은 파일의 같은 이름
//   (f) $w 는 get x(){return x} set x(v){x=v} 쌍만 갖고, x 는 game.js 의 let. 모듈은 import 한 바인딩에 직접 대입하지 않는다
//   (g) base game.js 의 export 이름은 전부 그대로 export
//   (h) 바인딩 없는 전역 참조가 새로 생기지 않는다
// =============================================================
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { analyze, unboundNames, parse, traverse } from './lib/analyze.mjs';

const require = createRequire(import.meta.url);
const generate = require('@babel/generator').default;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = process.argv[2];
if (!BASE) { console.error('사용: verify-extract.mjs <기준커밋>'); process.exit(1); }
const fails = [];
const fail = (tag, msg) => fails.push(`(${tag}) ${msg}`);
const gen = (node) => generate(node, { comments: false, compact: true }).code;

const baseCode = execFileSync('git', ['show', `${BASE}:js/game.js`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const B = analyze(baseCode);
const N = analyze(readFileSync(path.join(ROOT, 'js/game.js'), 'utf8'));
const spDir = path.join(ROOT, 'js/spaces');
const spFiles = existsSync(spDir) ? readdirSync(spDir).filter(f => f.endsWith('.js')).sort() : [];
const SP = new Map(spFiles.map(f => [f, analyze(readFileSync(path.join(spDir, f), 'utf8'))]));
const declOf = (s) => s.node.declaration || s.node;
const isW = (s) => s.names.length === 1 && s.names[0] === '$w';
// 파일 끝 export 목록(extract-module 이 만든다) — 문장 순서 비교에서 뺀다. 내보내는 이름은 전부 game.js 선언이어야 한다
const isExList = (s) => s.node.type === 'ExportNamedDeclaration' && !s.node.declaration && !s.node.source;

// ── (f 준비) $w 속성 ──
const wStmt = N.byName.get('$w');
const wProps = new Set();
if (wStmt) {
  const init = declOf(wStmt).declarations?.[0]?.init;
  if (!init || init.type !== 'ObjectExpression') fail('f', '$w 가 객체 리터럴이 아니다');
  else {
    const seen = {};
    for (const p of init.properties) {
      const k = p.key?.name;
      if (p.type !== 'ObjectMethod' || !['get', 'set'].includes(p.kind)) { fail('f', `$w 에 접근자가 아닌 속성 ${k}`); continue; }
      const body = gen(p.body);
      const want = p.kind === 'get' ? `{return ${k};}` : `{${k}=${p.params[0]?.name};}`;
      if (body !== want) fail('f', `$w.${p.kind} ${k} 가 ${k} 를 그대로 읽고 쓰지 않는다: ${body}`);
      (seen[k] ||= new Set()).add(p.kind);
    }
    for (const [k, kinds] of Object.entries(seen)) {
      if (kinds.size !== 2) fail('f', `$w.${k} 에 get/set 짝이 없다`);
      const d = N.byName.get(k);
      if (!d || d.kind !== 'let') fail('f', `$w.${k} 의 대상이 game.js 의 let 이 아니다`);
      wProps.add(k);
    }
  }
}

// ── (a) 선언별 정규화 코드 ──
function normSpace(A, s) {
  const ast = parse(A.code.slice(s.start, s.end));   // 정규화 전용 사본 — $w.x 쓰기 → x
  traverse(ast, {
    MemberExpression(p) {
      const n = p.node;
      if (n.object.type === 'Identifier' && n.object.name === '$w' && !n.computed) {
        const par = p.parentPath;
        const isWrite = (par.isAssignmentExpression() && par.node.left === n) || par.isUpdateExpression();
        if (!isWrite) fail('f', `${s.names}: $w.${n.property.name} 를 쓰기 아닌 곳에서 쓴다(읽기는 import 로)`);
        if (!wProps.has(n.property.name)) fail('f', `${s.names}: $w.${n.property.name} 가 $w 에 없다`);
        p.replaceWith({ type: 'Identifier', name: n.property.name });
      }
    },
  });
  const st = ast.program.body[0];
  return gen(st.declaration || st);
}
const baseDecl = new Map();
for (const s of B.stmts) if (!s.isImport && s.names.length) baseDecl.set(s.names.join(','), gen(declOf(s)));
const newDecl = new Map(), where = new Map();
const put = (key, codeStr, file) => {
  if (newDecl.has(key)) fail('a', `${key} 가 두 곳(${where.get(key)}, ${file})`);
  newDecl.set(key, codeStr); where.set(key, file);
};
for (const s of N.stmts) if (!s.isImport && s.names.length && !isW(s)) put(s.names.join(','), gen(declOf(s)), 'game.js');
for (const [f, A] of SP) for (const s of A.stmts) if (!s.isImport && s.names.length) put(s.names.join(','), normSpace(A, s), `spaces/${f}`);
for (const [k, c] of baseDecl) {
  if (!newDecl.has(k)) { fail('a', `${k} 가 사라졌다`); continue; }
  if (newDecl.get(k) !== c) fail('a', `${k} (${where.get(k)}) 코드가 다르다`);
}
for (const k of newDecl.keys()) if (!baseDecl.has(k)) fail('a', `${k} (${where.get(k)}) 는 base 에 없던 선언`);

// ── (b) game.js 남은 문장의 순서·내용 ──
const movedKeys = new Set([...newDecl.keys()].filter(k => where.get(k) !== 'game.js'));
const seqBase = B.stmts.filter(s => !s.isImport && !movedKeys.has(s.names.join(','))).map(s => gen(declOf(s)));
const seqNew = N.stmts.filter(s => !s.isImport && !isW(s) && !isExList(s)).map(s => gen(declOf(s)));
for (const s of N.stmts.filter(isExList)) for (const sp of s.node.specifiers) {
  if (sp.local.name !== sp.exported.name) fail('b', `export 목록이 ${sp.local.name} 를 다른 이름(${sp.exported.name})으로 내보낸다`);
  if (!N.byName.get(sp.local.name)) fail('b', `export 목록의 ${sp.local.name} 가 game.js 선언이 아니다`);
}
if (B.stmts.some(isExList)) fail('b', 'base 에 export 목록이 있다 — 비교 규칙을 다시 볼 것');
if (seqBase.length !== seqNew.length) fail('b', `game.js 문장 수 ${seqBase.length} → ${seqNew.length}`);
for (let i = 0; i < Math.min(seqBase.length, seqNew.length); i++) if (seqBase[i] !== seqNew[i]) { fail('b', `game.js ${i}번째 문장이 다르다: ${seqNew[i].slice(0, 90)}…`); break; }
for (const [local, im] of B.imports) {
  const n = N.imports.get(local);
  if (!n || n.source !== im.source || n.imported !== im.imported) fail('b', `game.js 의 import ${local} 가 바뀌었다`);
}

// ── (c)(d)(f) 모듈 구조 ──
const exportsOf = (A) => new Set(A.stmts.filter(s => s.exported).flatMap(s => s.names.length ? s.names
  : (s.node.specifiers || []).map(sp => sp.exported.name)));
for (const [f, A] of SP) {
  const fromGame = new Set();
  for (const s of A.stmts) {
    if (s.isImport) { if (s.node.source.value === '../game.js') s.node.specifiers.forEach(sp => fromGame.add(sp.local.name)); continue; }
    if (!(s.node.type === 'ExportNamedDeclaration' && s.node.declaration)) fail('c', `spaces/${f}:${s.line} 에 import/export 선언이 아닌 코드`);
  }
  for (const s of A.stmts) {
    if (s.isImport) continue;
    s.path.traverse({
      Function(p) { p.skip(); },
      ReferencedIdentifier(p) { const b = p.scope.getBinding(p.node.name); if (b && b.kind === 'module' && fromGame.has(p.node.name)) fail('d', `spaces/${f}:${s.line} 이 로딩 시점에 game.js 의 ${p.node.name} 를 읽는다`); },
    });
    s.path.traverse({
      AssignmentExpression(p) { const l = p.node.left; if (l.type === 'Identifier' && p.scope.getBinding(l.name)?.kind === 'module') fail('f', `spaces/${f}: import 한 ${l.name} 에 직접 대입`); },
      UpdateExpression(p) { const a = p.node.argument; if (a.type === 'Identifier' && p.scope.getBinding(a.name)?.kind === 'module') fail('f', `spaces/${f}: import 한 ${a.name} 를 직접 증감`); },
    });
  }
}

// ── (e) import 대상 ──
const files = new Map([['js/game.js', N], ...[...SP].map(([f, A]) => [`js/spaces/${f}`, A])]);
const exportCache = new Map();
const exportsAt = (rel) => {
  if (!exportCache.has(rel)) {
    const p = path.join(ROOT, rel);
    exportCache.set(rel, existsSync(p) ? exportsOf(files.get(rel) || analyze(readFileSync(p, 'utf8'))) : null);
  }
  return exportCache.get(rel);
};
for (const [rel, A] of files) {
  for (const s of A.stmts) if (s.isImport) {
    const src = s.node.source.value;
    const target = src.startsWith('.') ? path.normalize(path.join(path.dirname(rel), src)) : src;
    const internal = target === 'js/game.js' || target.startsWith('js/spaces/');
    for (const sp of s.node.specifiers) {
      const imported = sp.type === 'ImportSpecifier' ? sp.imported.name : sp.type === 'ImportNamespaceSpecifier' ? '*' : 'default';
      if (internal) {
        const ex = exportsAt(target);
        if (!ex) fail('e', `${rel}: ${src} 가 없다`);
        else if (!ex.has(imported)) fail('e', `${rel}: ${target} 가 ${imported} 를 export 하지 않는다`);
      } else if (rel !== 'js/game.js') {
        const orig = B.imports.get(sp.local.name);
        const origT = orig && (orig.source.startsWith('.') ? path.normalize(path.join('js', orig.source)) : orig.source);
        if (!orig || origT !== target || orig.imported !== imported) fail('e', `${rel}: ${sp.local.name} 가 base 와 다른 대상(${src})`);
      }
    }
  }
}

// ── (g) 바깥 API ──
const newEx = exportsOf(N);
for (const n of exportsOf(B)) if (!newEx.has(n)) fail('g', `game.js 가 ${n} 를 더는 export 하지 않는다`);

// ── (h) 새 전역 참조 ──
const baseGlobals = unboundNames(B.ast);
for (const [rel, A] of files) for (const n of unboundNames(A.ast)) if (!baseGlobals.has(n)) fail('h', `${rel} 에 바인딩 없는 이름 ${n}`);

const lc = (c) => c.split('\n').length;
console.log(`기준 ${BASE}: game.js ${lc(baseCode)} → ${lc(N.code)}줄 · spaces ${spFiles.length}개(${[...SP.values()].reduce((a, A) => a + lc(A.code), 0)}줄) · 옮긴 선언 ${movedKeys.size} · $w ${wProps.size}`);
if (fails.length) { console.log(`❌ ${fails.length}건`); fails.slice(0, 40).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('✅ 옮기기 + 기계적 치환만 — 증명 통과 (a~h)');
