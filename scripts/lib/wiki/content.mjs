import { escapeHtml } from '../seo-meta.mjs';

export const SECTION_ORDER = Object.freeze(['개요', '얻는 법', '쓰임새', '여담']);

const LINK_RE = /\[\[([a-z]+\/[a-z0-9_]+)(?:\|([^\]]+))?\]\]/g;

export function parseContent(md) {
  const out = new Map();
  let entry = null, head = null, buf = [];
  const flush = () => { if (entry && head) entry.set(head, buf.join('\n').trim()); buf = []; };
  for (const line of md.split('\n')) {
    const h2 = line.match(/^## +([a-z0-9_]+)\s*$/);
    const h3 = line.match(/^### +(.+?)\s*$/);
    if (h2) { flush(); head = null; entry = new Map(); out.set(h2[1], entry); }
    else if (h3) { flush(); head = h3[1]; }
    else if (head) buf.push(line);
  }
  flush();
  return out;
}

function target(ref, index) {
  const e = index.get(ref);
  if (!e) throw new Error(`위키 링크 대상 없음: ${ref}`);
  return e;
}

export function renderInline(text, index) {
  const parts = [];
  let last = 0;
  for (const m of text.matchAll(LINK_RE)) {
    const e = target(m[1], index);
    parts.push(escapeHtml(text.slice(last, m.index)));
    parts.push(`<a href="/wiki/${e.cat}/${e.id}">${escapeHtml(m[2] ?? e.name)}</a>`);
    last = m.index + m[0].length;
  }
  parts.push(escapeHtml(text.slice(last)));
  return parts.join('');
}

export function renderBlock(text, index) {
  return text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => `<p>${renderInline(p.replace(/\n/g, ' '), index)}</p>`).join('\n');
}

export function linkedRefs(text) {
  return [...text.matchAll(LINK_RE)].map(m => m[1]);
}

export function toPlain(text, index) {
  return text.replace(LINK_RE, (_, ref, label) => label ?? target(ref, index).name).replace(/\s+/g, ' ').trim();
}

export function firstSentence(plain) {
  const m = plain.match(/^.*?[.!?](?=\s|$)/);
  return (m ? m[0] : plain).trim();
}
