import { ICON_BY_EMOJI, ICON_BY_ID } from './toss-icons.js';

const CSS = '.ti{width:1.2em;height:1.2em;display:inline-block;vertical-align:-.22em;flex:none;pointer-events:none}';
const HYDRATE = '.uico, .inv-ico, .bag-emo, .hico, #season-emoji, #time-emoji, #emote-pop button, #action-btn, #feedback-tab > span:first-child, #dex-tab > span:first-child';

const norm = (e) => String(e ?? '').replace(/\uFE0F/g, '').trim();

export const hasIcon = (e) => Object.hasOwn(ICON_BY_EMOJI, norm(e));

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export const iconHtml = (e) => (hasIcon(e) ? ICON_BY_EMOJI[norm(e)] : escapeHtml(e));

export const iconById = (id) => (Object.hasOwn(ICON_BY_ID, id) ? ICON_BY_ID[id] : '');

export function setIcon(el, e) {
  if (!el || (el.dataset.ico === e && el.firstChild)) return;
  el.dataset.ico = e;
  el.innerHTML = iconHtml(e);
}

export const iconText = (el) => el?.dataset.ico || el?.textContent || '';

function installStyle(doc, id, css) {
  if (doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  doc.head.appendChild(style);
}

export const installIconStyle = (doc = document) => installStyle(doc, 'toss-icon-css', CSS);

export function hydrateIcons(root = document) {
  installIconStyle(root.ownerDocument || root);
  root.querySelectorAll(HYDRATE).forEach((el) => {
    const e = el.dataset.ico || el.textContent.trim();
    if (hasIcon(e)) setIcon(el, e);
  });
}

export async function startEmojiIcons(root = document.body) {
  const [{ ICON_ALL }, { createEmojiConverter, EMOJI_CSS }] = await Promise.all([import('./toss-icons-all.js'), import('./emoji-dom.js')]);
  installStyle(root.ownerDocument, 'emoji-icon-css', EMOJI_CSS);
  const converter = createEmojiConverter(ICON_ALL, root.ownerDocument);
  converter.convert(root);
  converter.observe(root);
}

if (typeof document !== 'undefined' && document.head) installIconStyle();
