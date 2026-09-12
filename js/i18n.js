// =============================================================
//  calm forest · i18n (한국어 원문 키 → 영어 사전)
//  ------------------------------------------------------------
//  ▶ 원문(한국어)이 곧 사전 키 — 번역이 없으면 한국어가 그대로 노출되어
//    기능이 깨지지 않는다(안전 폴백).
//  ▶ 언어 결정 우선순위:
//    ① ?lang=  URL 파라미터(테스트·공유용)
//    ② localStorage cf_lang(유저가 🌐 토글로 고른 값)
//    ③ 🎮 itch 번들이면 en (해외 이용자가 대부분 — 한국어는 토글로)
//    ④ 브라우저 언어가 한국어면 ko
//    ⑤ 비한국어 브라우저: EXPERIMENT==='i18n' 이면 A/B 배정에 따름
//       (A=control: ko 기본 + 토글 노출 / B=treatment: en 자동 적용)
//       실험 off 면 en 자동(전면 롤아웃 동작)
//  ▶ 적용 방식:
//    · 정적 HTML — 부팅 시 translateDom(document.body) 1회
//    · 동적 UI  — 영어 모드일 때만 MutationObserver(watchDom)가
//      새로 나타나는 텍스트 노드를 사전으로 치환(ko 모드 오버헤드 0)
//    · 캔버스(표지판·간판) — game.js 가 t() 를 직접 호출
//  ▶ 사전 키에 {0},{1} 이 있으면 패턴 엔트리 — 정규식으로 컴파일되어
//    숫자·이름이 끼어든 문장도 매칭하고, 캡처된 조각은 재귀 번역된다.
// =============================================================

import { CONFIG } from './config.js';
import { IS_ITCH } from './platform.js';   // 🎮 itch 번들은 영어 기본(2026-09-09)
import { EN } from './i18n-en.js';

// ── 분석용 영구 client_id — supabase-client.js 도 이걸 import ─
//   ※ 인증이 아니라 순수 집계용 식별자. 권한 판단에 쓰면 안 됨.
export function clientId() {
  try {
    let id = localStorage.getItem('cf_client_id');
    if (!id) { id = 'c-' + (crypto.randomUUID?.() || (Math.random().toString(36).slice(2) + Date.now().toString(36))); localStorage.setItem('cf_client_id', id); }
    return id;
  } catch (e) { return 'c-' + Math.random().toString(36).slice(2); } // localStorage 차단 시 세션 한정
}

// ── A/B 변형 배정 — client_id 해시로 안정적 50:50(기기 단위) ──
//   실험 off면 무조건 'control'. 켜지면 해시 하위비트로 A/B.
export function assignVariant() {
  if (!CONFIG.EXPERIMENT || CONFIG.EXPERIMENT === 'off') return 'control';
  if (CONFIG.EXPERIMENT === 'beta') return 'control';  // 베타 배정은 명단(supabase-client) 전담 — 해시 배정 안 함
  let h = 0; const s = clientId();
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return (h & 1) ? 'B' : 'A';
}

// ── 언어 결정(모듈 로드 시 1회 — 토글은 reload 로 반영) ─────────
function detectLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ko') return q;
    const saved = localStorage.getItem('cf_lang');
    if (saved === 'en' || saved === 'ko') return saved;
  } catch (e) { /* localStorage 차단 → 아래 자동 감지로 */ }
  if (IS_ITCH) return 'en';                   // 🎮 itch: 브라우저 언어와 무관하게 영어 시작
  const isKo = (navigator.language || 'ko').toLowerCase().startsWith('ko');
  if (isKo) return 'ko';                       // 한국 유저는 실험 밖 — 전원 한국어
  if (CONFIG.EXPERIMENT === 'i18n') return assignVariant() === 'B' ? 'en' : 'ko';
  return 'en';
}

export const LANG = detectLang();
export function getLang() { return LANG; }

// 유저가 🌐 토글로 언어 변경 — 저장 후 reload(캔버스 간판·캐시 문자열까지 새로 그림)
export function setLang(l) {
  try { localStorage.setItem('cf_lang', l); } catch (e) {}
  location.reload();
}

// ── 사전 정규화 + 패턴 컴파일 ──────────────────────────────────
//   · 키·값의 양끝 공백/개행을 정리한 변형도 함께 등록(텍스트 노드는 trim 후 조회되므로)
//   · {0},{1} 포함 키는 정규식으로 컴파일 — dotAll(s)이라 캡처가 개행도 삼킨다
//   · {0#} 은 숫자만 잡는 자리 — '{0}장'(챕터)이 '책장' 같은 낱말을 먹던 충돌을 막는다
const EXACT = new Map();
const PATTERNS = [];
for (const ko in EN) {
  const en = EN[ko];
  if (!EXACT.has(ko)) EXACT.set(ko, en);
  const koT = ko.trim();
  if (koT !== ko && !EXACT.has(koT)) EXACT.set(koT, en.trim());
  if (ko.includes('{')) {
    for (const [k, v] of koT !== ko ? [[ko, en], [koT, en.trim()]] : [[ko, en]]) {
      const src = k.replace(/[.*+?^$()|[\]\\]/g, '\\$&')   // 정규식 이스케이프({}는 남김)
        .replace(/\{(\d+)#\}/g, '(\\d[\\d.,]*)')              // {0#} = 숫자 전용 자리(42.3 · 1,200 포함)
        .replace(/\{(\d+)\}/g, '(.+?)');
      PATTERNS.push({ re: new RegExp('^' + src + '$', 's'), en: v });
    }
  }
}

const HAS_KO = /[가-힣]/;

// ── 핵심 번역 함수 — 정확 일치 → 패턴 → 줄 단위 → 문장 단위 → 원문 폴백 ──
//   줄/문장 폴백: textContent 로 통째 들어오는 조합 문장(스토리 본문, 데일리 보너스 등)을
//   자연 단위로 쪼개 재귀 번역한다. 조각이 사전에 없으면 그 조각만 한국어로 남는다(무해).
export function t(s) {
  if (LANG !== 'en' || typeof s !== 'string' || !HAS_KO.test(s)) return s;
  const hit = EXACT.get(s);
  if (hit !== undefined) return hit;
  for (const p of PATTERNS) {
    const m = p.re.exec(s);
    if (m) return p.en.replace(/\{(\d+)\}/g, (_, i) => t(m[+i + 1] ?? ''));
  }
  // 이모지 접두사 — '🛏️ 침대' 처럼 아이콘이 앞에 붙으면 '침대' 키에 도달하지 못한다.
  //   조합 프롬프트 '{0} · {1}' 의 좌변이 거의 이 꼴이라, 가구 옮기기 프롬프트 전부가
  //   영어 모드에서 "🛏️ 침대 · Move" 처럼 반만 번역되고 있었다.
  //   아이콘을 떼고 번역해 다시 붙인다 — 떼어낸 쪽이 사전에 없으면 그대로 흘려보낸다(무해).
  //   ⚠️ +? (lazy) 여야 한다 — greedy 면 '🎨 ✅ 완료!' 에서 이모지 둘을 한꺼번에 떼어
  //   정확히 존재하는 '✅ 완료!' 키를 건너뛴다. 하나만 떼면 재귀가 나머지를 이어서 본다.
  //   s 플래그라 여러 줄 문자열도 여기서 먼저 잡힌다 — 첫 줄 이모지를 뗀 뒤 줄 단위 폴백으로 간다(의도).
  //   공백을 요구하지 않는다 — '🥇 ⚡60초' 처럼 아이콘과 숫자가 붙어 있는 칩이 있다.
  //   글자·숫자가 처음 나오는 지점까지만 떼고, 나머지 아이콘은 재귀가 이어서 본다.
  //   ① 공백까지 떼기 — '🎨 ✅ 완료!' 처럼 두 번째 아이콘부터가 통째로 키인 경우를 살린다
  //   ② 글자·숫자 직전까지 떼기 — '⚡60초' 처럼 아이콘과 값이 붙어 있는 경우
  for (const re of [/^([^\p{L}\p{N}]+?\s)(.+)$/su, /^([^\p{L}\p{N}]+?)(?=[\p{L}\p{N}])(.+)$/su]) {
    const m = re.exec(s);
    if (!m) continue;
    const inner = t(m[2]);
    if (inner !== m[2]) return m[1] + inner;
  }
  if (s.includes('\n')) {                                  // 줄 단위
    const out = s.split('\n').map(line => {
      const core = line.trim();
      return core ? line.replace(core, t(core)) : line;
    }).join('\n');
    if (out !== s) return out;
  }
  const parts = s.split(/(?<=[.!?…])\s+/);                 // 문장 단위
  if (parts.length > 1) {
    const out = parts.map(p => t(p)).join(' ');
    if (out !== s) return out;
  }
  return s;
}

// ── DOM 번역 — 텍스트 노드 + 주요 속성(placeholder/title 등) ────
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

function fixText(node) {
  const raw = node.nodeValue; if (!raw) return;
  const core = raw.trim();
  if (!core || !HAS_KO.test(core)) return;
  const tr = t(core);
  if (tr !== core) node.nodeValue = raw.replace(core, tr);
}

function fixAttrs(el) {
  for (const a of ATTRS) {
    const v = el.getAttribute?.(a);
    if (v && HAS_KO.test(v)) { const tr = t(v); if (tr !== v) el.setAttribute(a, tr); }
  }
}

export function translateDom(root) {
  if (LANG !== 'en' || !root) return;
  if (root.nodeType === 3) { fixText(root); return; }
  if (root.nodeType !== 1 && root.nodeType !== 9) return;
  if (root.nodeType === 1) fixAttrs(root);
  root.querySelectorAll?.('[placeholder],[title],[aria-label],[alt]').forEach(fixAttrs);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode(n) {
      if (n.nodeType === 1) {
        const tag = n.tagName;
        return (tag === 'SCRIPT' || tag === 'STYLE') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n; while ((n = w.nextNode())) fixText(n);
}

// ── 동적 UI 감시 — 영어 모드에서만 옵저버 가동 ──────────────────
export function watchDom(root) {
  if (LANG !== 'en' || !root) return;
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') fixText(m.target);
      else if (m.type === 'attributes') fixAttrs(m.target);
      else m.addedNodes.forEach((n) => translateDom(n));
    }
  });
  mo.observe(root, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ATTRS,
  });
}
