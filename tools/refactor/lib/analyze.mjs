// 🧪 tools/refactor 공용 — game.js 최상위 선언을 Babel AST 로 분석한다.
//    "다른 파일로 옮겨도 동작이 같은가"를 판정하는 규칙이 여기 한 곳에만 있다(이동기·검증기가 같이 쓴다).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// 실행 시점에 따라 값이 달라지는 전역 — import 로 옮기면 평가 시점이 앞당겨지므로 이걸 쓰는 선언은 옮기지 않는다
export const TIME_GLOBALS = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'location', 'navigator',
  'Date', 'performance', 'fetch', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'console', 'Math']);
// Math 는 Math.random 때문에 넣었다 — 순수 Math.PI/Math.min 은 아래 PURE_MATH 로 푼다
const PURE_MATH = new Set(['PI', 'min', 'max', 'abs', 'floor', 'ceil', 'round', 'sqrt', 'sin', 'cos', 'tan', 'atan2', 'hypot', 'sign', 'pow', 'exp', 'log', 'trunc', 'SQRT2', 'SQRT1_2', 'asin', 'acos', 'atan']);
const MUTATORS = new Set(['push', 'pop', 'splice', 'shift', 'unshift', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copy']);

export function parse(code) { return parser.parse(code, { sourceType: 'module', ranges: true }); }

/** 최상위 문장과 선언 목록. stmts[i] = { node, start, end, line, endLine, names[], kind, exported, isImport, refs, assigns, ... } */
export function analyze(code) {
  const ast = parse(code);
  let prog;
  traverse(ast, { Program(p) { prog = p; p.stop(); } });
  const scope = prog.scope;
  const stmts = [];
  const byName = new Map();
  const imports = new Map();   // local name -> { source, imported }
  for (const st of prog.get('body')) {
    const rec = { path: st, node: st.node, start: st.node.start, end: st.node.end, line: st.node.loc.start.line, endLine: st.node.loc.end.line, names: [], kind: null, exported: false, isImport: false };
    if (st.isImportDeclaration()) {
      rec.isImport = true;
      for (const s of st.node.specifiers) imports.set(s.local.name, { source: st.node.source.value, imported: s.type === 'ImportSpecifier' ? s.imported.name : (s.type === 'ImportNamespaceSpecifier' ? '*' : 'default') });
    } else {
      const d = st.isExportNamedDeclaration() ? st.get('declaration') : st;
      rec.exported = st.isExportNamedDeclaration() || st.isExportDefaultDeclaration();
      if (d && d.node) {
        if (d.isFunctionDeclaration() || d.isClassDeclaration()) { rec.kind = d.isClassDeclaration() ? 'class' : 'function'; rec.names = [d.node.id.name]; }
        else if (d.isVariableDeclaration()) { rec.kind = d.node.kind; rec.names = Object.keys(d.getBindingIdentifiers()); }
      }
    }
    stmts.push(rec);
    for (const n of rec.names) byName.set(n, rec);
  }
  const top = new Map(stmts.map(s => [s.path.node, s]));
  const stmtOf = (p) => { let q = p; while (q.parentPath && q.parentPath !== prog) q = q.parentPath; return top.get(q.node); };
  for (const s of stmts) { s.refs = new Set(); s.assigns = new Set(); s.mutated = false; s.reassigned = false; s.globals = new Set(); }
  for (const [name, b] of Object.entries(scope.bindings)) {
    const own = byName.get(name) || null;
    for (const r of b.referencePaths) {
      const s = stmtOf(r); if (s && s !== own) s.refs.add(name);
      // 멤버 대입·변경 메서드 → 선언한 쪽이 "값이 바뀌는 객체"
      let q = r;
      while (q.parentPath.isMemberExpression() && q.parentPath.node.object === q.node) q = q.parentPath;
      if (q !== r && own) {
        const g = q.parentPath;
        if ((g.isAssignmentExpression() && g.node.left === q.node) || g.isUpdateExpression() || (g.isUnaryExpression() && g.node.operator === 'delete')) own.mutated = true;
        if (g.isCallExpression() && g.node.callee === q.node && !q.node.computed && MUTATORS.has(q.node.property.name)) own.mutated = true;
      }
      const par = r.parentPath;
      if (own && par.isCallExpression() && par.node.arguments[0] === r.node && par.get('callee').matchesPattern('Object.assign')) own.mutated = true;
    }
    for (const c of b.constantViolations) {
      const s = stmtOf(c);
      if (s) { s.assigns.add(name); if (s !== own) s.refs.add(name); }
      if (own) own.reassigned = true;
    }
  }
  // 실행 시점 전역 사용
  for (const s of stmts) {
    if (s.isImport) continue;
    s.path.traverse({
      ReferencedIdentifier(ip) {
        const n = ip.node.name;
        if (ip.scope.getBinding(n) || !TIME_GLOBALS.has(n)) return;
        if (n === 'Math') { const m = ip.parentPath; if (m.isMemberExpression() && !m.node.computed && PURE_MATH.has(m.node.property.name)) return; }
        s.globals.add(n);
      },
    });
  }
  return { ast, prog, scope, stmts, byName, imports, code };
}

/** 옮겨도 동작이 같은 선언 이름 집합(고정점). range = [lo, hi] 행 범위. exclude = 설계상 제외할 이름 */
export function movableSet(A, [lo, hi], exclude = new Set()) {
  const cand = new Set();
  for (const s of A.stmts) {
    if (s.isImport || !s.names.length || s.line < lo || s.line > hi) continue;
    if (s.exported) continue;                                   // 바깥 API(예: sims 가 import 하는 ANIMALS)는 그대로 둔다
    if (!(s.kind === 'const' || s.kind === 'function')) continue; // let/var/class 제외
    if (s.reassigned || s.mutated || s.assigns.size || s.globals.size) continue;
    if (s.names.some(n => exclude.has(n))) continue;
    s.names.forEach(n => cand.add(n));
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of [...cand]) {
      if (!cand.has(n)) continue;
      const s = A.byName.get(n);
      const bad = [...s.refs].some(r => !A.imports.has(r) && !cand.has(r)) || s.names.some(x => !cand.has(x));
      if (bad) { s.names.forEach(x => cand.delete(x)); changed = true; }
    }
  }
  return cand;
}

/** 바인딩 없는 식별자(전역) 집합 — 새 파일에서도 같은 전역만 쓰는지 볼 때 쓴다 */
export function unboundNames(ast) {
  const out = new Set();
  traverse(ast, {
    ReferencedIdentifier(p) { if (!p.scope.getBinding(p.node.name)) out.add(p.node.name); },
    AssignmentExpression(p) { const l = p.node.left; if (l.type === 'Identifier' && !p.scope.getBinding(l.name)) out.add(l.name); },
  });
  return out;
}

export { traverse };
