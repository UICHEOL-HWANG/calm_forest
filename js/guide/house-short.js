import { houseShort, prepassGrant } from './prepass-rules.js';
import { fillStepCard, stepSignature } from './step-card.js';
import { shortParts } from './story-steps.js';
import { LANG } from '../i18n.js';

const NEAR = 6;
const TICK = 0.25;
const VERB = { 1: ['🔨', '바닥 깔기'], 2: ['🔨', '벽 세우기'], 3: ['🏠', '지붕 올리기'] };

const CSS = `
#house-short{position:fixed;inset:0;z-index:23;pointer-events:none;display:none}
#house-short.show{display:block}
#house-short .hs-card{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;gap:2px;background:rgba(255,253,246,.97);border-radius:16px;box-shadow:0 4px 14px rgba(30,60,40,.28);padding:8px 12px;min-width:190px;max-width:min(270px,calc(100vw - 24px))}
#house-short .hs-t{font-weight:800;color:#2f5a3a;font-size:14px}
#house-short .hs-d{font-size:13px;color:#4a5a4f}
#house-short .hs-s{margin-top:4px;padding-top:5px;border-top:1px dashed #e3dccb;font-size:12.5px;font-weight:700;color:#7a5a20}
#house-short .hs-ad{align-self:flex-start;margin-top:6px}
`;

export function createHouseShort(deps) {
  let root = null, card = null, box = null, btn = null, t = TICK, sig = '', cur = null;
  const T = (s) => deps.translate(s);
  const ad = deps.rewarded;

  function mount() {
    if (root) return;
    const st = document.createElement('style'); st.id = 'house-short-style'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'house-short';
    card = document.createElement('div'); card.className = 'hs-card';
    box = document.createElement('div'); box.style.display = 'contents';
    btn = ad.button(() => cur, [], (sh) => grant(sh), () => { sig = ''; });
    btn.classList.add('hs-ad');
    card.append(box, btn); root.appendChild(card); document.body.appendChild(root);
  }

  function hide() { if (root) root.classList.remove('show'); cur = null; }

  function adOpen(sh) {
    return Object.keys(prepassGrant(sh.list)).length > 0 && ad.open();
  }

  function adLabel(sh) {
    const parts = ['🎬 ', '광고 보고', ' '];
    const give = Object.entries(prepassGrant(sh.list)).map(([k, more]) => ({ k, more }));
    shortParts(give).forEach((p, i) => { if (i) parts.push(' · '); parts.push(`${p.ico} ${p.more}`); if (LANG !== 'en') parts.push('개'); });
    parts.push(' ', '받기');
    ad.label(btn, parts);
  }

  function grant(sh) {
    const give = prepassGrant(sh.list);
    const gs = deps.state();
    for (const [k, n] of Object.entries(give)) gs.inventory[k] = (gs.inventory[k] || 0) + n;
    deps.refreshInventory(); deps.save();
    deps.toast(`🎁 ${Object.entries(give).map(([k, n]) => `${shortParts([{ k, more: n }])[0].ico} ${n}`).join(' · ')}`);
  }

  function update(dt = 1 / 60) {
    t += dt;
    if (t < TICK) return;
    t = 0;
    const gs = deps.state();
    const p = deps.player.position, h = deps.house;
    const near = deps.inVillage() && !deps.modalOpen() && Math.hypot(p.x - h.x, p.z - h.z) < NEAR;
    const sh = near ? houseShort(gs.houseStage, gs.inventory) : null;
    if (!sh) { hide(); return; }
    mount();
    cur = sh;
    const sp = deps.project({ x: h.x, y: 0, z: h.z }, 3.2);
    if (!sp) { hide(); return; }
    ad.offer(sh.slot);
    const [ico, verb] = VERB[sh.stage];
    const st = { key: sh.slot, ico, name: '', verb, doNow: '재료를 모아 와요', shortList: sh.list };
    const open = adOpen(sh);
    const s = `${stepSignature(st)}|${open}`;
    if (s !== sig) {
      sig = s;
      fillStepCard(box, st, { t: 'hs-t', d: 'hs-d', s: 'hs-s' }, T);
      btn.style.display = open ? '' : 'none';
      if (open) adLabel(sh);
    }
    const half = Math.min(135, innerWidth / 2 - 12);
    card.style.left = `${Math.round(Math.min(innerWidth - half, Math.max(half, sp.x)))}px`;
    card.style.top = `${Math.round(Math.max(Math.max(110, deps.topInset()) + 120, sp.y))}px`;
    root.classList.add('show');
  }

  return { update, debug: () => ({ cur: cur && cur.slot, sig, arm: ad.arm(), shown: !!root?.classList.contains('show') }) };
}
