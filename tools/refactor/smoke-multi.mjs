#!/usr/bin/env node
// =============================================================
//  🧪 스모크 비교(여러 기준) — 기준 N회 내내 고정이던 값이 후보에서도 그대로인가
//  ------------------------------------------------------------
//  사용: node tools/refactor/smoke-multi.mjs <기준 라벨 접두어> <후보 라벨> [후보 라벨…]
//        예) smoke-multi.mjs sp-base- sp-glade-1 sp-glade-2
//  · 드로우콜·텍스처·타임스탬프는 프레임 타이밍 잡음이 있다(1단계에서 확인) — 기준에서 흔들린 값은 비교하지 않는다
//  · 에러 문구는 따로 본다 — 후보에만 있는 에러가 하나라도 있으면 실패
// =============================================================
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.scratch', 'refactor-smoke');
const [prefix, ...cands] = process.argv.slice(2);
if (!prefix || !cands.length) { console.error('사용: smoke-multi.mjs <기준 접두어> <후보…>'); process.exit(1); }
const load = (l) => JSON.parse(readFileSync(path.join(DIR, `${l}.json`), 'utf8'));
const baseLabels = readdirSync(DIR).filter(f => f.startsWith(prefix) && f.endsWith('.json')).map(f => f.slice(0, -5)).sort();
if (baseLabels.length < 2) { console.error(`기준이 ${baseLabels.length}개 — 2개 이상 필요`); process.exit(1); }
const flat = (o, p = '', m = new Map()) => { if (o && typeof o === 'object' && !Array.isArray(o)) { for (const k of Object.keys(o)) flat(o[k], p ? `${p}.${k}` : k, m); } else m.set(p, JSON.stringify(o)); return m; };
// 판정 대상: 공간별 메시 종류 집계(kinds) · 메시 수 · 세이브 상태. 성능 카운터는 로딩 타이밍에 흔들려 참고로만 찍는다.
const PERF = ['calls', 'tris', 'geoms', 'tex'];
const strip = (v) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'errors' && !PERF.includes(k)));
const pick = (r) => ({ stops: Object.fromEntries(Object.entries(r.stops).map(([k, v]) => [k, strip(v)])), night: strip(r.night), state: r.state });
const errs = (r) => [...r.boot.errors, ...Object.values(r.stops).flatMap(s => s.errors), ...(r.night.errors || [])];

// 알려진 잡음 — 원본 코드만 돌려도 흔들린다는 근거가 있는 것만 여기 적는다(근거 없이 늘리지 말 것)
//   · 밤 반딧불이(MeshBasic 구) 수: 시간 따라 생겨난다. 원본 밤 메시 1605~1619(1단계 seed-base, 2026-09-25 sp-b3)
//   · 자동 닉네임: 고정 시드 Math.random 수열에서 몇 번째 값을 받느냐가 로딩 타이밍에 달렸다.
//     원본(21453dd)만 4회 돌려도 '별 헤는 곰 #3823' ×2 / '새벽의 곰 #9684' ×2 로 갈렸다(old-21453dd/k-base-*)
const NOISE = [/^night\.(meshes|visible)$/, /^night\.kinds\.SphereGeometry\|MeshBasicMaterial\|1$/, /^state\.nickname$/];
const bases = baseLabels.map(load), B = bases.map(b => flat(pick(b)));
const fixed = [...B[0].keys()].filter(k => !NOISE.some(re => re.test(k)) && B.every(m => m.get(k) === B[0].get(k)));
const knownErr = new Set(bases.flatMap(errs));
let bad = 0;
for (const c of cands) {
  const r = load(c), C = flat(pick(r));
  const diff = fixed.filter(k => C.get(k) !== B[0].get(k));
  // 흔들리는 값이라도 원본 어느 측정에서도 안 나온 값이면 표시(판정엔 안 넣는다 — 사람이 본다)
  const unseen = [...C.keys()].filter(k => !fixed.includes(k) && !k.startsWith('state.') && !B.some(m => m.get(k) === C.get(k)));
  const extra = [...C.keys()].filter(k => !B[0].has(k));
  const newErr = errs(r).filter(e => !knownErr.has(e));
  const spaces = Object.keys(r.stops).length;
  const ok = !diff.length && !extra.length && !newErr.length && spaces === Object.keys(bases[0].stops).length;
  if (!ok) bad++;
  console.log(`${ok ? '✅' : '❌'} ${c}: 고정값 ${fixed.length}개 중 다름 ${diff.length} · 새 키 ${extra.length} · 새 에러 ${newErr.length} · 공간 ${spaces}`);
  diff.slice(0, 8).forEach(k => console.log(`     ${k}: ${B[0].get(k)} → ${C.get(k)}`));
  if (unseen.length) console.log(`     (흔들리는 값 중 원본에서 못 본 값 ${unseen.length}: ${unseen.slice(0, 6).map(k => `${k}=${C.get(k)} [원본 ${[...new Set(B.map(m => m.get(k)))].join('/')}]`).join(' · ')})`);
  newErr.slice(0, 5).forEach(e => console.log(`     에러: ${e.slice(0, 200)}`));
}
console.log(`(기준 ${baseLabels.length}회: ${baseLabels.join(', ')})`);
process.exit(bad ? 1 : 0);
