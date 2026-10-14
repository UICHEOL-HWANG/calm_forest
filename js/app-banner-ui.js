// =============================================================
//  calm forest · 📲 앱 유도 배너 — DOM·브라우저 연결부
//  -------------------------------------------------------------
//  규칙·상태는 app-banner.js(순수 모듈), 여기는 DOM 을 만들고 브라우저 값을 주입만 한다.
//  모양·배치는 index.html 의 #app-banner CSS (스펙 §3-1).
// =============================================================

import { createAppBanner, captureTouch, isHoldout, TOUCH_KEY } from './app-banner.js';

const storage = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 사파리 사생활 보호 등 — 상한만 안 지켜질 뿐 */ } },
};

const newJid = () => (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, '').slice(0, 12);

// 첫 랜딩에 jid·유입(utm)을 남긴다 — 구글 로그인 리다이렉트가 쿼리를 지우기 전에 부른다
export function bootAppBanner() {
  const prev = storage.get(TOUCH_KEY);
  const next = captureTouch(location.search, prev, Date.now(), newJid);
  if (next !== prev) storage.set(TOUCH_KEY, next);
}

function localDay() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 배너를 띄우면 안 되는 순간 — 모달·미니게임·안내서·코치·메뉴 등.
//   CSS 로 숨겨지는 상태는 render() 가 실제 표시 여부를 재서 따로 잡는다(리텐션 배너의 'CSS 숨김 ≠ JS 억제' 함정).
function suppressed() {
  const b = document.body;
  for (const c of ['mg-open', 'guide-open', 'intro-open', 'duel-open', 'menu-open', 'coaching', 'sea-mode', 'cv-open', 'boat-run', 'dream-cut']) {
    if (b.classList.contains(c)) return c;
  }
  if (document.querySelector('[id$="-modal"].show')) return 'modal';
  return null;
}

export function mountAppBanner({ config, platform, t, track, onTrack, isGuest, clientId, connect, devParam }) {
  const el = document.createElement('div');
  el.id = 'app-banner';
  el.setAttribute('role', 'region');
  el.innerHTML = `<img alt="">
    <div class="ab-text"><div class="ab-title"></div><div class="ab-line"></div></div>
    <button type="button" class="ab-btn"></button>
    <button type="button" class="ab-x">✕</button>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s);
  $('.ab-x').setAttribute('aria-label', t('배너 닫기'));

  // 실제로 보이고, 맨 위에 있는가 — CSS 숨김(display:none)이나 id 가 '-modal' 로 안 끝나는
  //   오버레이(#boat-result·#boat-shop·#album-view 등)에 덮인 배너는 노출로 치지 않는다
  const shownOnTop = () => {
    if (getComputedStyle(el).display === 'none') return false;
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return !!top && el.contains(top);
  };

  const banner = createAppBanner({
    config, platform,
    ua: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints || 0,
    storage, now: () => Date.now(), today: localDay,
    isGuest, clientId, holdout: isHoldout, suppressed,
    render({ os, guest }) {
      const img = $('img');
      if (!img.getAttribute('src')) img.src = '/apple-touch-icon.png';
      $('.ab-title').textContent = t('이 마을, 앱에서도 만나요');
      $('.ab-line').textContent = t(guest ? '로그인하면 지금 마을 그대로 가져가요' : '지금 마을 그대로 이어져요');
      const btn = $('.ab-btn');
      btn.classList.toggle('guest', !!guest);
      if (guest) btn.textContent = t('로그인하고 받기');
      else btn.innerHTML = os === 'android' ? '<span class="ab-play">▶ </span>Google Play' : 'App Store';
      document.body.classList.add('app-banner-on');
      el.classList.add('show');
      return shownOnTop();
    },
    hide() { el.classList.remove('show'); document.body.classList.remove('app-banner-on'); },
    connect, track,
    navigate: (url) => { location.href = url; },
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
  });

  if (devParam) {
    // QA 전용 — 버튼은 배너만 닫는다(실제 로그인·스토어 이동·상태 저장 없음)
    const [dOs, guest] = String(devParam).split('-');
    banner.debugShow(dOs === 'ios' ? 'ios' : 'android', guest === 'guest');
    for (const s of ['.ab-btn', '.ab-x']) $(s).addEventListener('click', () => { el.classList.remove('show'); document.body.classList.remove('app-banner-on'); });
    return banner;
  }
  $('.ab-btn').addEventListener('click', () => banner.click());
  $('.ab-x').addEventListener('click', () => banner.dismiss());
  onTrack((name) => banner.onEvent(name));
  banner.start();
  return banner;
}
