import { shortFrom, shortParts } from './story-steps.js';
import { LANG } from '../i18n.js';

const node = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

export function stepSignature(st) {
  return st ? [st.key, st.ico, st.name, st.verb, st.doNow, st.n || 0, JSON.stringify(st.shortList || [])].join('|') : '';
}

export function fillStepCard(box, st, cls, T = (s) => s) {
  box.replaceChildren();
  const title = node('b', cls.t);
  title.append(node('span', null, `${st.ico} `));
  if (st.name) title.append(node('span', null, T(st.name)), node('span', null, ' '));
  title.append(node('span', null, T(st.verb)));
  const doNow = node('span', cls.d);
  doNow.append(node('span', null, T(st.doNow)));
  if (st.n > 1) doNow.append(node('span', null, ` ×${st.n}`));
  box.append(title, doNow);
  const parts = shortParts(st.shortList);
  if (!parts.length) return;
  const short = node('span', cls.s);
  parts.forEach((p, i) => { if (i) short.append(node('span', null, ' · ')); short.append(node('span', null, `${p.ico} ${p.more}`)); if (LANG !== 'en') short.append(node('span', null, '개')); });
  short.append(node('span', null, ' '), node('span', null, T('더 필요')));
  const from = shortFrom(st.shortList);
  if (from) short.append(node('span', null, ' · '), node('span', null, T(from)));
  box.append(short);
}
