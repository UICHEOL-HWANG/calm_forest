import { INTRO_CARDS } from './onboard.js';

const CSS = `#auction-intro-modal{position:fixed;left:0;right:0;bottom:0;z-index:41;display:none;justify-content:center;padding:0 12px calc(16px + env(safe-area-inset-bottom))}
#auction-intro-modal.show{display:flex}
#auction-intro-modal .ai-ico{font-size:38px;grid-row:span 2}
#auction-intro-modal .ai-title{font-size:17px;font-weight:700;word-break:keep-all}
#auction-intro-modal .ai-sub{opacity:.75;font-size:14px;word-break:keep-all}
#auction-intro-modal .ai-dots span{display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 3px;background:rgba(0,0,0,0.15)}
#auction-intro-modal .ai-dots span.on{background:#6fd08c}
#auction-intro-modal .ai-next{border:none;border-radius:14px;padding:12px 28px;background:var(--mint);color:var(--ink);font-weight:700;font-size:15px;font-family:inherit;cursor:pointer;box-shadow:var(--shadow)}
#auction-intro-modal .ai-next:active{transform:scale(0.96)}
body:has(#auction-intro-modal.show) :is(#door-prompt,#near-pill){opacity:0!important;pointer-events:none!important}`;

export function introStepView(step) {
  const c = INTRO_CARDS[step];
  return { ...c, last: step === INTRO_CARDS.length - 1, dots: INTRO_CARDS.map((_, i) => i === step) };
}

export function createAuctionIntro({ t, track, onDone }) {
  let root = null, step = -1;

  function mount() {
    if (root) return;
    const style = document.createElement('style');
    style.id = 'auction-intro-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    root = document.createElement('div');
    root.id = 'auction-intro-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'auction-intro-title');
    root.innerHTML = '<div class="e1-sheet"><div class="ai-ico"></div><div class="ai-title" id="auction-intro-title"></div><div class="ai-sub"></div><div class="e1-foot"><div class="ai-dots"></div><button class="ai-next" type="button"></button></div></div>';
    root.querySelector('.ai-next').addEventListener('click', next);
    document.body.appendChild(root);
  }

  function render() {
    const v = introStepView(step);
    root.querySelector('.ai-ico').textContent = v.ico;
    root.querySelector('.ai-title').textContent = t(v.title);
    root.querySelector('.ai-sub').textContent = t(v.sub);
    root.querySelector('.ai-dots').innerHTML = v.dots.map(on => `<span class="${on ? 'on' : ''}"></span>`).join('');
    root.querySelector('.ai-next').textContent = t(v.btn);
  }

  function onKey(e) {
    if (e.repeat || (e.code !== 'Space' && e.code !== 'Enter')) return;
    if (e.target === root?.querySelector('.ai-next')) return;
    e.preventDefault();
    next();
  }

  function next() {
    if (step < 0) return;
    root.querySelector('.ai-next').blur();
    const last = introStepView(step).last;
    track('auction_intro', { step: step + 1, act: last ? 'done' : 'next' });
    if (!last) { step++; render(); return; }
    step = -1;
    window.removeEventListener('keydown', onKey);
    root.classList.remove('show');
    onDone();
  }

  function show() {
    if (step >= 0) return;
    mount();
    step = 0;
    render();
    root.classList.add('show');
    window.addEventListener('keydown', onKey);
  }

  return { show, get open() { return step >= 0; } };
}
