import { houseShort, prepassArm, prepassCan, prepassGrant, prepassUse, sanitizePrepass } from './prepass-rules.js';
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
@property --hs-a{syntax:'<angle>';initial-value:0deg;inherits:false}
#house-short .hs-ad{pointer-events:auto;align-self:flex-start;position:relative;margin-top:6px;border:2px solid transparent;border-radius:999px;padding:4px 12px;font:inherit;font-weight:800;font-size:12.5px;color:#4b3fa0;cursor:pointer;box-shadow:0 0 10px rgba(167,150,255,.55);background:linear-gradient(#f3f0ff,#f3f0ff) padding-box,conic-gradient(from var(--hs-a),#b9adf2,#fff7c2,#8fd8ff,#ffd1f0,#b9adf2) border-box;animation:hs-spin 2.4s linear infinite,hs-glow 1.6s ease-in-out infinite}
#house-short .hs-ad::before,#house-short .hs-ad::after{content:'✦';position:absolute;font-size:10px;color:#fff;text-shadow:0 0 4px #c9b8ff,0 0 8px #8fd8ff;animation:hs-twinkle 1.4s ease-in-out infinite}
#house-short .hs-ad::before{left:-6px;top:-7px}
#house-short .hs-ad::after{right:-5px;bottom:-7px;animation-delay:.7s}
#house-short .hs-ad:disabled{opacity:.6;cursor:default}
@keyframes hs-spin{to{--hs-a:360deg}}
@keyframes hs-glow{50%{box-shadow:0 0 16px rgba(167,150,255,.85)}}
@keyframes hs-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(45deg)}}
@media(prefers-reduced-motion:reduce){#house-short .hs-ad,#house-short .hs-ad::before,#house-short .hs-ad::after{animation:none}}
`;

export function createHouseShort(deps) {
  let root = null, card = null, box = null, btn = null, t = TICK, sig = '', busy = false, cur = null;
  const seen = new Set();
  const T = (s) => deps.translate(s);

  function mount() {
    if (root) return;
    const st = document.createElement('style'); st.id = 'house-short-style'; st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'house-short';
    card = document.createElement('div'); card.className = 'hs-card';
    box = document.createElement('div'); box.style.display = 'contents';
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'hs-ad';
    btn.addEventListener('click', (e) => { e.stopPropagation(); watch(); });
    card.append(box, btn); root.appendChild(card); document.body.appendChild(root);
  }

  function hide() { if (root) root.classList.remove('show'); cur = null; }

  const prepass = () => sanitizePrepass(deps.state().hintsSeen?.prepass);
  const arm = () => deps.forceArm?.() || prepassArm(deps.clientId(), deps.platform);

  function adOpen(sh) {
    return deps.enabled() && arm() === 'ad' && Object.keys(prepassGrant(sh.list)).length > 0 && deps.provider().available() && prepassCan(prepass(), sh.slot, deps.today());
  }

  function adLabel(sh) {
    btn.replaceChildren();
    const add = (s) => { const n = document.createElement('span'); n.textContent = s; btn.append(n); };
    add('🎬 '); add(T('광고 보고')); add(' ');
    const give = Object.entries(prepassGrant(sh.list)).map(([k, more]) => ({ k, more }));
    shortParts(give).forEach((p, i) => { if (i) add(' · '); add(`${p.ico} ${p.more}`); if (LANG !== 'en') add('개'); });
    add(' '); add(T('받기'));
  }

  async function watch() {
    if (busy || !cur || !adOpen(cur)) return;
    busy = true; btn.disabled = true;
    const sh = cur;
    let r = null;
    try { r = await deps.provider().show(sh.slot); } catch (err) { r = { result: 'fail', reason: String(err?.message || err) }; }
    deps.track('prepass_ad_result', { slot: sh.slot, result: r?.result || 'fail', value_micros: Number.isFinite(r?.valueMicros) ? r.valueMicros : undefined });
    if (r?.result === 'complete') {
      const give = prepassGrant(sh.list);
      const gs = deps.state();
      for (const [k, n] of Object.entries(give)) gs.inventory[k] = (gs.inventory[k] || 0) + n;
      gs.hintsSeen = { ...(gs.hintsSeen || {}), prepass: prepassUse(prepass(), sh.slot, deps.today()) };
      deps.refreshInventory(); deps.save();
      deps.toast(`🎁 ${Object.entries(give).map(([k, n]) => `${shortParts([{ k, more: n }])[0].ico} ${n}`).join(' · ')}`);
    } else if (r?.result !== 'skip') deps.toast(T('지금은 광고를 볼 수 없어요'));
    busy = false; btn.disabled = false; sig = '';
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
    if (deps.enabled() && !seen.has(sh.slot)) { seen.add(sh.slot); deps.track('prepass_eligible', { slot: sh.slot, arm: arm() }); }
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

  return { update, debug: () => ({ cur: cur && cur.slot, sig, arm: arm(), shown: !!root?.classList.contains('show') }) };
}
