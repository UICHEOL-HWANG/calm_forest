export const POOL_CAP = 30;
export const EN_RATIO = 1.8;
export const VAR_LEN = 4;
export const LINE_LANGS = ['ko', 'en'];
export const ANY = '_any';
export const AUCTION_ITEMS = ['moonswing', 'lanternarch', 'starvane'];

export const SLOTS = {
  auction: {
    intro: { scope: 'item', max: 60, per: 1, vars: [] },
    open: { scope: 'item', max: 30, per: 1, vars: [] },
    raise_npc: { scope: 'any', max: 24, per: 4, vars: ['who'] },
    raise_me: { scope: 'any', max: 24, per: 4, vars: [] },
    last: { scope: 'any', max: 24, per: 1, vars: [] },
    sold_me: { scope: 'any', max: 30, per: 1, vars: [] },
    sold_npc: { scope: 'any', max: 30, per: 1, vars: ['who'] },
  },
};

const VAR_RE = /\{(\w+)\}/g;
const HAS_VAR = /\{\w+\}/;
const JOSA = /\}(으로|이|가|을|를|은|는|와|과|로)(?=[\s.,!?…~]|$)/;
const KO_END = /[.!?…~]$/;
const ARCHAIC = /\b(hath|thee|thou|thy|doth|huzzah|hark)\b/i;
const BANNED = [/[—–]/, /놀(다|아|았|자|고|러|이)/];

export function keysFor(kind) {
  return kind === 'auction' ? [...AUCTION_ITEMS, ANY] : [];
}

export function slotsFor(kind, key) {
  const all = SLOTS[kind] || {};
  const scope = key === ANY ? 'any' : 'item';
  return Object.keys(all).filter(s => all[s].scope === scope);
}

export function cells(kind) {
  return keysFor(kind).flatMap(key => slotsFor(kind, key).flatMap(slot => LINE_LANGS.map(lang => ({ kind, key, slot, lang }))));
}

export const cellId = c => `${c.kind}|${c.key}|${c.slot}|${c.lang}`;

export function lineLength(text) {
  return [...String(text).replace(VAR_RE, 'x'.repeat(VAR_LEN))].length;
}

export function lineProblem(text, { kind, slot, lang }) {
  const def = SLOTS[kind]?.[slot];
  if (!def) return 'slot';
  if (typeof text !== 'string' || !text.trim()) return 'empty';
  const vars = [...text.matchAll(VAR_RE)].map(m => m[1]);
  if (vars.some(v => !def.vars.includes(v)) || def.vars.some(v => !vars.includes(v))) return 'vars';
  if (/[0-9０-９]/.test(text)) return 'digit';
  if (BANNED.some(re => re.test(text))) return 'banned';
  if (JOSA.test(text)) return 'josa';
  const max = lang === 'en' ? Math.round(def.max * EN_RATIO) : def.max;
  if (lineLength(text) > max) return 'length';
  const hangul = /[가-힣]/.test(text);
  if (lang === 'en' ? hangul : !hangul) return 'lang';
  if (lang === 'en' ? ARCHAIC.test(text) : !KO_END.test(text.trim())) return 'style';
  return null;
}

export function fillLine(text, vars = {}) {
  const out = String(text).replace(VAR_RE, (m, k) => (vars[k] == null ? m : String(vars[k])));
  return HAS_VAR.test(out) ? null : out;
}
