import { prepassArm } from '../guide/prepass-rules.js';

const CSS = `
.rw-ad{pointer-events:auto;position:relative;isolation:isolate;overflow:hidden;display:inline-block;text-align:center;border:0;border-radius:14px;padding:8px 14px 8px 8px;font:inherit;font-weight:700;font-size:13px;line-height:1.2;color:#fbf6e6;cursor:pointer;background:linear-gradient(180deg,#3d6b4a,#2f5a3a);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 6px 14px -6px rgba(31,74,44,.6);transition:transform .2s cubic-bezier(.16,1,.3,1)}
.rw-ad::after{content:'';position:absolute;top:0;bottom:0;width:36%;left:-60%;background:linear-gradient(100deg,transparent,rgba(255,226,140,.5),transparent);transform:skewX(-18deg);animation:rw-sweep 3.8s cubic-bezier(.45,0,.2,1) infinite;pointer-events:none}
.rw-ad:active{transform:translateY(1px) scale(.98)}
.rw-ad:disabled{opacity:.6;cursor:default}
.rw-ad .rw-tag{display:inline-block;vertical-align:1px;margin-right:7px;font-size:10px;font-weight:800;letter-spacing:.04em;padding:3px 6px;border-radius:6px;background:rgba(255,211,107,.18);color:#ffd36b}
.rw-ad .rw-amt{color:#ffd36b;font-weight:800}
.rw-ad .rw-spark{position:absolute;right:6px;top:3px;font-size:8px;color:#ffe08a;pointer-events:none;opacity:0;animation:rw-twinkle 3.8s ease-in-out infinite;animation-delay:2.2s}
@keyframes rw-sweep{0%,60%{left:-60%}88%,100%{left:130%}}
@keyframes rw-twinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1.15) rotate(45deg)}}
@media(prefers-reduced-motion:reduce){.rw-ad::after,.rw-ad .rw-spark{animation:none}}
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
    const span = (cls, text) => { const n = document.createElement('span'); if (cls) n.className = cls; n.textContent = text; return n; };
    const words = parts.map(s => {
      const [, lead, core, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
      return span(/\d/.test(core) ? 'rw-amt' : null, core ? lead + deps.translate(core) + tail : s);
    });
    btn.replaceChildren(span('rw-tag', 'AD'), ...words, span('rw-spark', '✦'));
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
