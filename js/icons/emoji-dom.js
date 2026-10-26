const SKIP = 'script, style, textarea, input, select, option, title, noscript, svg, canvas, .te, .ti, [data-noicon], [contenteditable=""], [contenteditable="true"]';

export const EMOJI_CSS = '.te{position:relative;display:inline-block;width:1.2em;height:1.2em;vertical-align:-.22em;line-height:1;flex:none}'
  + '.te>svg,.te>img{width:100%;height:100%;display:block;pointer-events:none}'
  + '.te-t{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function emojiPattern(map) {
  const keys = Object.keys(map).sort((a, b) => b.length - a.length).map(esc);
  return new RegExp(`(${keys.join('|')})\\uFE0F?`, 'gu');
}

export function splitByIcons(text, re) {
  re.lastIndex = 0;
  if (!re.test(text)) return null;
  re.lastIndex = 0;
  const out = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push({ key: m[1], raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function createEmojiConverter(map, doc = document) {
  const re = emojiPattern(map);

  const iconEl = (key, raw) => {
    const span = doc.createElement('span');
    span.className = 'te';
    span.innerHTML = map[key];
    const keep = doc.createElement('span');
    keep.className = 'te-t';
    keep.textContent = raw;
    span.appendChild(keep);
    return span;
  };

  function convertText(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest(SKIP)) return;
    const parts = splitByIcons(node.nodeValue, re);
    if (!parts) return;
    const frag = doc.createDocumentFragment();
    for (const p of parts) frag.append(typeof p === 'string' ? p : iconEl(p.key, p.raw));
    node.replaceWith(frag);
  }

  function convert(root) {
    if (!root) return;
    if (root.nodeType === 3) { convertText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const found = [];
    let n;
    while ((n = walker.nextNode())) found.push(n);
    found.forEach(convertText);
  }

  function observe(root) {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'characterData') convertText(m.target);
        else m.addedNodes.forEach(convert);
      }
    });
    mo.observe(root, { subtree: true, childList: true, characterData: true });
    return mo;
  }

  return { convert, observe };
}
