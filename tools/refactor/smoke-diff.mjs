#!/usr/bin/env node
// =============================================================
//  🧪 스모크 지문 비교 — 기준 두 번 + 후보 한 번
//  ------------------------------------------------------------
//  사용: node tools/refactor/smoke-diff.mjs <기준1> <기준2> <후보>   (라벨 = .scratch/refactor-smoke/<라벨>.json)
//  · 기준 두 번에서 이미 서로 다른 값은 "잡음"(랜덤 배치·시각)으로 보고 뺀다
//  · 기준 두 번에서 같았던 값이 후보에서 다르면 실패
//  · 에러 문구는 잡음과 무관하게 비교한다 — 후보에만 있는 에러가 하나라도 있으면 실패
// =============================================================
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.scratch', 'refactor-smoke');
const [a, b, c] = process.argv.slice(2).map(l => JSON.parse(readFileSync(path.join(DIR, `${l}.json`), 'utf8')));
if (!c) { console.error('사용: smoke-diff.mjs <기준1> <기준2> <후보>'); process.exit(1); }

const flat = (o, pre = '', out = new Map()) => {
  if (o && typeof o === 'object' && !Array.isArray(o)) { for (const k of Object.keys(o)) flat(o[k], pre ? `${pre}.${k}` : k, out); }
  else out.set(pre, JSON.stringify(o));
  return out;
};
const pick = (r) => ({ stops: Object.fromEntries(Object.entries(r.stops).map(([k, v]) => [k, { ...v, errors: undefined }])), night: { ...r.night, errors: undefined }, state: r.state });
const A = flat(pick(a)), B = flat(pick(b)), C = flat(pick(c));
const errs = (r) => [...r.boot.errors, ...Object.values(r.stops).flatMap(s => s.errors), ...(r.night.errors || [])];

const fails = [];
let noise = 0, stable = 0;
for (const k of new Set([...A.keys(), ...B.keys(), ...C.keys()])) {
  if (A.get(k) !== B.get(k)) { noise++; continue; }
  stable++;
  if (A.get(k) !== C.get(k)) fails.push(`${k}: 기준 ${A.get(k)} → 후보 ${C.get(k)}`);
}
const known = new Set([...errs(a), ...errs(b)]);
for (const e of errs(c)) if (!known.has(e)) fails.push(`새 에러: ${e.slice(0, 200)}`);
if (Object.keys(c.stops).length !== Object.keys(a.stops).length) fails.push(`공간 수 ${Object.keys(a.stops).length} → ${Object.keys(c.stops).length}`);

console.log(`비교 값 ${stable}개(잡음으로 뺀 값 ${noise}개) · 후보 에러 ${errs(c).length}건(기준 ${errs(a).length}건)`);
for (const [k, v] of Object.entries(c.stops)) console.log(`  ${k.padEnd(8)} calls ${a.stops[k]?.calls}/${b.stops[k]?.calls} → ${v.calls}   meshes ${a.stops[k]?.meshes}/${b.stops[k]?.meshes} → ${v.meshes}`);
if (fails.length) { console.log(`❌ 다름 ${fails.length}건`); fails.slice(0, 40).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('✅ 기준과 같다');
