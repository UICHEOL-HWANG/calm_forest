import { emojiPattern, splitByIcons } from './emoji-dom.js';

const ICON_EM = 1.15;
const GAP_EM = 0.04;

let images = null;
let pattern = null;

export function iconSrc(raw) {
  const svg = raw.match(/<svg[\s\S]*<\/svg>/);
  if (svg) {
    const s = svg[0].replace(/^<svg/, `<svg width="96" height="96"${svg[0].includes('xmlns') ? '' : ' xmlns="http://www.w3.org/2000/svg"'}`);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  return raw.match(/src="([^"]+)"/)?.[1] || null;
}

const load = (url) => new Promise((res) => {
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = () => res(null);
  img.src = url;
});

export function setCanvasIcons(map) {
  images = map;
  pattern = emojiPattern(map);
}

export async function loadCanvasIcons() {
  if (images) return;
  const { ICON_ALL } = await import('./toss-icons-all.js');
  const entries = await Promise.all(Object.entries(ICON_ALL).map(async ([k, raw]) => {
    const url = iconSrc(raw);
    return [k, url ? await load(url) : null];
  }));
  setCanvasIcons(Object.fromEntries(entries.filter(([, img]) => img)));
}

const pxOf = (font) => Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] || 16);

function layout(c, text) {
  const parts = pattern && splitByIcons(String(text ?? ''), pattern);
  if (!parts) return null;
  const px = pxOf(c.font);
  const icon = px * ICON_EM, gap = px * GAP_EM;
  let width = 0;
  const items = parts.map((p) => {
    const it = { p, x: width };
    width += typeof p === 'string' ? c.measureText(p).width : icon + gap * 2;
    return it;
  });
  return { items, width, px, icon, gap };
}

export function measureIconText(c, text) {
  const l = layout(c, text);
  if (!l) return c.measureText(text);
  return { width: l.width, actualBoundingBoxLeft: 0, actualBoundingBoxRight: l.width };
}

function iconTop(base, y, px, icon) {
  if (base === 'middle') return y - icon / 2;
  if (base === 'top' || base === 'hanging') return y + (px - icon) / 2;
  if (base === 'bottom' || base === 'ideographic') return y - icon;
  return y - px * 0.82 - (icon - px) / 2;
}

function startX(c, x, width) {
  const a = c.textAlign;
  const rtl = c.direction === 'rtl';
  if (a === 'center') return x - width / 2;
  if (a === 'right' || (a === 'end' && !rtl) || (a === 'start' && rtl)) return x - width;
  return x;
}

export function fillIconText(c, text, x, y, maxWidth) {
  const l = layout(c, text);
  if (!l) return maxWidth === undefined ? c.fillText(text, x, y) : c.fillText(text, x, y, maxWidth);
  const k = maxWidth !== undefined && l.width > maxWidth ? maxWidth / l.width : 1;
  const top = iconTop(c.textBaseline, y, l.px, l.icon);
  c.save();
  c.translate(startX(c, x, l.width * k), 0);
  c.scale(k, 1);
  c.textAlign = 'left';
  for (const { p, x: dx } of l.items) {
    if (typeof p === 'string') c.fillText(p, dx, y);
    else c.drawImage(images[p.key], dx + l.gap, top, l.icon, l.icon);
  }
  c.restore();
}
