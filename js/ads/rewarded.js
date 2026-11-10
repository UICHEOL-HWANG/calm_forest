import { prepassArm } from '../guide/prepass-rules.js';

const CSS = `
@property --rw-a{syntax:'<angle>';initial-value:0deg;inherits:false}
.rw-ad{pointer-events:auto;position:relative;display:inline-block;text-align:center;border:2px solid transparent;border-radius:999px;padding:7px 13px;font:inherit;font-weight:800;font-size:12.5px;line-height:1.1;color:#4b3fa0;cursor:pointer;background:linear-gradient(#f4f1ff,#f4f1ff) padding-box,conic-gradient(from var(--rw-a),#b9adf2,#fff1b8,#9fd9f2,#ffd3ec,#b9adf2) border-box;box-shadow:0 2px 8px -2px rgba(110,90,200,.35);animation:rw-spin 3s linear infinite;transition:transform .18s cubic-bezier(.16,1,.3,1)}
.rw-ad:active{transform:translateY(1px) scale(.98)}
.rw-ad:disabled{opacity:.6;cursor:default}
.rw-ad::before,.rw-ad::after{content:'✦';position:absolute;font-size:9px;color:#fff;text-shadow:0 0 3px #c9b8ff;pointer-events:none;animation:rw-twinkle 1.8s ease-in-out infinite}
.rw-ad::before{left:-5px;top:-6px}
.rw-ad::after{right:-4px;bottom:-6px;animation-delay:.9s}
@keyframes rw-spin{to{--rw-a:360deg}}
@keyframes rw-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1.1) rotate(45deg)}}
@media(prefers-reduced-motion:reduce){.rw-ad,.rw-ad::before,.rw-ad::after{animation:none}}
`;

function ensureStyle() {
  if (document.getElementById('rw-ad-style')) return;
  const st = document.createElement('style');
  st.id = 'rw-ad-style';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function createRewarded(deps) {
  const seen = new Set();
  let busy = false;
  const arm = () => deps.forceArm?.() || prepassArm(deps.clientId(), deps.platform);
  const open = () => deps.enabled() && arm() === 'ad' && !!deps.provider().available();

  function offer(slot) {
    if (deps.enabled() && !seen.has(slot)) { seen.add(slot); deps.track('prepass_eligible', { slot, arm: arm() }); }
    return open();
  }

  async function watch(slot, grant) {
    if (busy || !open()) return false;
    busy = true;
    let r = null;
    try { r = await deps.provider().show(slot); } catch (err) { r = { result: 'fail', reason: String(err?.message || err) }; }
    busy = false;
    deps.track('prepass_ad_result', { slot, result: r?.result || 'fail', value_micros: Number.isFinite(r?.valueMicros) ? r.valueMicros : undefined });
    if (r?.result === 'complete') { grant(); return true; }
    if (r?.result !== 'skip') deps.toast(deps.translate('지금은 광고를 볼 수 없어요'));
    return false;
  }

  function label(btn, parts) {
    btn.replaceChildren(...parts.map(s => {
      const n = document.createElement('span');
      const [, lead, core, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
      n.textContent = core ? lead + deps.translate(core) + tail : s;
      return n;
    }));
  }

  function button(slot, parts, grant, after) {
    ensureStyle();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rw-ad';
    label(btn, parts);
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ctx = typeof slot === 'function' ? slot() : slot;
      if (!ctx) return;
      btn.disabled = true;
      const ok = await watch(ctx.slot || ctx, () => grant(ctx));
      btn.disabled = false;
      after?.(ok, btn);
    });
    return btn;
  }

  return { offer, open, watch, button, label, arm };
}
