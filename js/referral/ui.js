// js/referral/ui.js
// =============================================================
//  calm forest · 🤝 친구 초대 시트 — DOM 그리기만 (네트워크·게임 상태 없음)
//  ------------------------------------------------------------
//  ▶ 문구는 rules.js MSG 단일 출처. textContent 로만 넣는다(i18n 옵저버가 번역 · XSS 없음).
//  ▶ 숫자 문장은 '{0#}' 자리를 채운 완성 문장으로 넣는다 — i18n 패턴 키가 통째로 잡는다(글루 금지).
// =============================================================
import { MSG, tierView, inviteUrl } from './rules.js';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const fill = (tpl, n) => tpl.replace('{0#}', String(n));

/**
 * view = { guest, loading, error, code, active, pending }
 * on   = { copy(url), share(url) }
 */
export function renderInviteSheet(box, view, on) {
  box.replaceChildren();
  box.append(el('h2', 'inv-title', MSG.title), el('p', 'inv-desc', MSG.desc));

  if (view.guest) { box.append(el('p', 'inv-note', MSG.guest)); return; }

  const tiers = el('div', 'inv-tiers');
  for (const t of tierView(view.active ?? 0)) {
    const chip = el('div', 'inv-tier' + (t.done ? ' done' : ''));
    chip.append(el('span', 'inv-ico', t.ico), el('span', 'inv-need', fill(MSG.tierNeed, t.need)));
    tiers.append(chip);
  }
  box.append(tiers, el('p', 'inv-now', fill(MSG.now, view.active ?? 0)));
  if (view.pending > 0) box.append(el('p', 'inv-note', fill(MSG.pending, view.pending)));

  if (view.error) { box.append(el('p', 'inv-note', MSG.loadFail)); return; }
  if (!view.code) { box.append(el('p', 'inv-note', '…')); return; }

  const url = view.url || inviteUrl(view.code);   // 토스는 index.js 가 만든 토스 공유 링크를 넘긴다
  const link = el('input', 'inv-link');
  link.readOnly = true; link.value = url;
  link.addEventListener('focus', () => link.select());
  const row = el('div', 'inv-actions');
  const copy = el('button', 'inv-copy', MSG.copy);
  copy.addEventListener('click', () => on.copy(url));
  const share = el('button', 'inv-share', MSG.share);
  share.addEventListener('click', () => on.share(url));
  row.append(copy, share);
  box.append(link, row);
}
