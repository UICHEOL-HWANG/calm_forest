import { Input } from '../game-lazy.js';
import { CONFIG } from '../config.js';
import { LANG } from '../i18n.js';
import { trackEvent } from '../analytics.js';

let $, ui;

// ── 📖 초보자 안내서 패널 ──────────────────────────────────────
//  · fragment(guide/guide.html)를 fetch 해 DOM 에 직접 주입(iframe 금지: iOS 웹뷰 스크롤·X-Frame-Options)
//  · 열리면 body.guide-open 으로 HUD 숨김 + keydown capture 로 게임 입력 차단(Esc 만 닫기)
//  · 토스 번들은 CONFIG.GUIDE_BASE 가 웹 오리진 절대 URL 이라 같은 코드로 동작
let guidePanel, guideBody, guideChips;
let guideLoaded = false, guideOpenedAt = 0, guideCurSec = '', guideScrollY = 0, guideSecTimer = null, guideCssLinked = false, guideIo = null;
const guideAbs = (rel) => new URL(rel, new URL(CONFIG.GUIDE_BASE, location.href)).href;
function buildGuideChips(root) {
  guideChips.innerHTML = '';
  const secs = [...root.querySelectorAll('section.gd-sec')].filter(s => !s.dataset.dev || root.classList.contains('dev-' + s.dataset.dev));
  for (const sec of secs) {
    const h2 = sec.querySelector('h2');
    const b = document.createElement('button');
    b.textContent = h2?.dataset.chip || h2?.textContent || sec.id;
    b.dataset.sec = sec.id;
    b.addEventListener('click', () => { sec.scrollIntoView({ block: 'start' }); });   // 즉시 이동 — 웹뷰·reduced-motion 에서도 확실히
    guideChips.appendChild(b);
  }
  guidePanel.querySelector('.gd-toc')?.remove();
  const toc = document.createElement('nav'), tocList = document.createElement('ol');
  toc.className = 'gd-toc'; toc.setAttribute('aria-label', LANG === 'en' ? 'Contents' : '목차');
  for (const sec of secs) {
    const part = sec.querySelector('[data-part]')?.dataset.part;
    if (part) { const li = document.createElement('li'); li.className = 'gd-toc-part'; li.textContent = part; tocList.appendChild(li); }
    const li = document.createElement('li'), a = document.createElement('a'), label = document.createElement('span');
    a.href = '#' + sec.id; a.dataset.sec = sec.id;
    label.textContent = sec.querySelector('h2')?.dataset.chip || sec.id;
    a.append(label, document.createElement('i'));
    a.addEventListener('click', (e) => { e.preventDefault(); sec.scrollIntoView({ block: 'start' }); });
    li.appendChild(a); tocList.appendChild(li);
  }
  toc.appendChild(tocList); guidePanel.appendChild(toc);
  guideIo?.disconnect(); guideCurSec = '';
  const io = guideIo = new IntersectionObserver((entries) => {
    const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!hit) return;
    const id = hit.target.id;
    if (id === guideCurSec) return;
    guideCurSec = id;
    for (const b of guideChips.children) b.classList.toggle('on', b.dataset.sec === id);
    for (const a of toc.querySelectorAll('a')) a.classList.toggle('on', a.dataset.sec === id);
    guideChips.querySelector('.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    clearTimeout(guideSecTimer);
    guideSecTimer = setTimeout(() => trackEvent('guide_section', { id }), 800);   // 스크롤 훑기 중엔 안 쏨
  }, { root: guideBody, rootMargin: '-8% 0px -80% 0px', threshold: 0 });
  secs.forEach(s => io.observe(s));
}
async function loadGuide() {
  guideBody.innerHTML = '<div class="gp-skel"><i></i><i></i><i></i></div>';
  try {
    if (!guideCssLinked) {   // 본문 스타일은 fragment 와 같은 곳에서 — 토스에서도 웹 오리진
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = guideAbs('guide.css');
      document.head.appendChild(l); guideCssLinked = true;
    }
    // 🌐 영어 모드는 영어판 fragment(guide/guide-en.html) — 본문 문장은 사전(i18n)으로 못 바꾸므로 파일을 따로 둔다
    const res = await fetch(guideAbs(LANG === 'en' ? 'guide-en.html' : 'guide.html'));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const wrap = document.createElement('div'); wrap.className = document.body.classList.contains('is-touch') ? 'gd dev-touch' : 'gd dev-pc'; wrap.innerHTML = await res.text();
    wrap.querySelectorAll('img[src]').forEach(img => { img.src = guideAbs(img.getAttribute('src')); });
    guideBody.replaceChildren(wrap);
    buildGuideChips(wrap);
    guideLoaded = true;
  } catch (err) {
    console.warn('[guide] 안내서 불러오기 실패:', err?.message || err);
    guideBody.innerHTML = '<div class="gp-err"><p>안내서를 불러오지 못했어요.</p><button id="guide-retry">다시 시도</button></div>';
    $('guide-retry').addEventListener('click', loadGuide);
  }
}
function openGuide(src) {
  if (guidePanel.classList.contains('show')) return;
  $('topleft').classList.remove('open');
  guidePanel.classList.add('show'); guidePanel.setAttribute('aria-hidden', 'false');
  document.body.classList.add('guide-open');
  guideOpenedAt = Date.now();
  if (!guideLoaded) loadGuide(); else guideBody.scrollTop = guideScrollY;   // 세션 안에서는 읽던 자리로
  trackEvent('guide_open', { src });
}
function closeGuide() {
  if (!guidePanel.classList.contains('show')) return;
  guideScrollY = guideBody.scrollTop;
  guidePanel.classList.remove('show'); guidePanel.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('guide-open');
  trackEvent('guide_close', { sec: guideCurSec, dur: Date.now() - guideOpenedAt });
}
// 📖 튜토리얼을 마치거나 건너뛴 직후 한 번만: 안내서가 있다는 걸 상단 컨텍스트 슬롯(hint-banner)으로 알린다.
//    졸업 토스트와 안 겹치게 3초 뒤. 저장 플래그(guideNudgeSeen)로 두 번 다시 안 뜬다.
function nudgeGuideOnce() {
  if (Input.guideNudgeSeen()) return;
  Input.markGuideNudgeSeen();
  setTimeout(() => ui.showHintBanner({
    ico: '📖', title: '초보자 안내서가 있어요', line: '눌러서 열기 · ☰ 메뉴 → 📖 에서 언제든',
    near: () => true, attention: true, onTap: () => openGuide('nudge'),
  }), 3000);
}

export function installGuidePanel(ctx) {
  ({ $, ui } = ctx);
  guidePanel = $('guide-panel'); guideBody = $('guide-body'); guideChips = $('guide-chips');
  $('guide-close').addEventListener('click', closeGuide);
  guideBody.addEventListener('click', (e) => {   // 안내서 첫 장 "튜토리얼 다시 보기" — 패널 닫고 환영 모달
    if (!e.target.closest('[data-act="tutorial"]')) return;
    closeGuide(); ui.showTutorial('help');
  });
  window.addEventListener('keydown', (e) => {   // 패널이 떠 있으면 어떤 키도 게임으로 안 간다(스크롤 등 브라우저 기본은 허용)
    if (!guidePanel.classList.contains('show')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeGuide(); }
    e.stopPropagation();
  }, true);
  return { openGuide, nudgeGuideOnce };
}

export const PANEL_IDS = ['guide-body', 'guide-chips', 'guide-close', 'guide-panel', 'topleft'];
