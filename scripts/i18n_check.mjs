// =============================================================
//  calm forest · i18n 커버리지 점검 (node scripts/i18n_check.mjs)
//  ------------------------------------------------------------
//  소스에서 유저 노출 후보 한국어 문자열을 휴리스틱으로 뽑아
//  js/i18n-en.js 사전(정확 일치 + {n} 패턴)으로 커버되는지 검사한다.
//  ▶ 정적 분석 한계로 오탐(주석 파편·비노출 문자열)이 섞일 수 있음 —
//    "빠짐 후보" 리포트이지 실패 게이트가 아니다.
// =============================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { EN } = await import(join(ROOT, 'js/i18n-en.js'));

const HAS_KO = /[가-힣]/;

// 사전 → 정확 일치 셋 + 패턴 정규식(i18n.js 와 동일: trim 변형 등록 + dotAll)
const exact = new Set();
const patterns = [];
for (const k of Object.keys(EN)) {
  exact.add(k); exact.add(k.trim());
  if (k.includes('{')) {
    for (const kk of new Set([k, k.trim()])) {
      patterns.push(new RegExp('^' + kk.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{(\d+)\}/g, '(.+?)') + '$', 's'));
    }
  }
}

function covered(s, depth = 0) {
  if (!/[가-힣]/.test(s)) return true;
  if (exact.has(s)) return true;
  if (patterns.some(re => re.test(s))) return true;
  if (depth > 2) return false;
  if (s.includes('\n')) return s.split('\n').every(l => !l.trim() || covered(l.trim(), depth + 1));
  const parts = s.split(/(?<=[.!?…])\s+/);
  if (parts.length > 1) return parts.every(p => covered(p, depth + 1));
  return false;
}

// ── JS 소스에서 문자열 리터럴 추출(주석 제거 후) ────────────────
function stripJsComments(src) {
  // 문자열 안의 // 를 주석으로 오인하지 않도록 간단한 상태기계
  let out = '', i = 0, mode = null; // mode: null | '"' | "'" | '`' | 'line' | 'block'
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (mode === null) {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue; }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue; }
      if (c === '"' || c === "'" || c === '`') mode = c;
      out += c; i++; continue;
    }
    if (mode === 'line') { if (c === '\n') { mode = null; out += c; } i++; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = null; i += 2; continue; } i++; continue; }
    // 문자열 내부
    out += c;
    if (c === '\\') { out += n ?? ''; i += 2; continue; }
    if (c === mode) mode = null;
    i++;
  }
  return out;
}

function jsStrings(src) {
  const out = [];
  const re = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(src))) {
    let s = m[1] ?? m[2] ?? m[3] ?? '';
    if (!HAS_KO.test(s)) continue;
    s = s.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\`/g, '`');
    if (m[3] !== undefined) {          // 템플릿 리터럴 → ${...} 를 {n} 으로
      let idx = 0;
      s = s.replace(/\$\{[^}]*\}/g, () => `{${idx++}}`);
    }
    // 여러 줄 템플릿은 줄 단위 텍스트로 갈라 검사(도움말 본문 등)
    for (const line of s.split('\n')) {
      const core = line.trim();
      if (core && HAS_KO.test(core)) out.push(core);
    }
  }
  return out;
}

// ── HTML 마크업에서 텍스트 노드/속성 추출 ───────────────────────
function htmlStrings(src) {
  const body = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const markup = body.replace(/<script[\s\S]*?<\/script>/g, '');   // 스크립트는 jsStrings 로 별도 처리
  const out = [];
  for (const m of markup.matchAll(/>([^<]+)</g)) {
    const core = m[1].trim();
    if (core && HAS_KO.test(core)) out.push(core);
  }
  for (const m of markup.matchAll(/(?:placeholder|title|aria-label|alt)="([^"]+)"/g)) {
    const core = m[1].trim();
    if (core && HAS_KO.test(core)) out.push(core);
  }
  const script = body.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1] || '';
  out.push(...jsStrings(stripJsComments(script)));
  return out;
}

// ── 대상 파일 ───────────────────────────────────────────────────
const targets = [
  ['index.html', htmlStrings],
  ['js/game.js', s => jsStrings(stripJsComments(s))],
  ['js/night-visit.js', s => jsStrings(stripJsComments(s))],
  ['js/cafe-guests.js', s => jsStrings(stripJsComments(s))],
  ['js/supabase-client.js', s => jsStrings(stripJsComments(s))],
  ['js/controls.js', s => jsStrings(stripJsComments(s))],
];

let totalMiss = 0, totalHit = 0;
for (const [file, extract] of targets) {
  const src = readFileSync(join(ROOT, file), 'utf8');
  const found = [...new Set(extract(src))];
  const miss = found.filter(s => !covered(s));
  totalHit += found.length - miss.length; totalMiss += miss.length;
  console.log(`\n── ${file}: ${found.length - miss.length}/${found.length} 커버`);
  for (const s of miss) console.log('  ✗', JSON.stringify(s));
}
console.log(`\n합계: ${totalHit}/${totalHit + totalMiss} 커버, 빠짐 후보 ${totalMiss}건 (사전 ${Object.keys(EN).length}엔트리)`);
