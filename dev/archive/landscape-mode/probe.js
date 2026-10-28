window.__probe = async ({ coach = true, prompts = true } = {}) => {
  const $ = (id) => document.getElementById(id);
  if (coach) {
    $('coach-goal').textContent = '1장 · 🏠 내 집 짓기';
    $('coach-text').textContent = '🪓도끼(2)로 나무를 베면 집 지을 🪵목재가 나와요';
    $('coach-fill').style.width = '18%';
    $('coach-count').textContent = '3 / 17';
    $('coach').classList.add('show');
    document.body.classList.add('coaching');
  }
  if (prompts) {
    $('toast').textContent = '🪵 목재 +3'; $('toast').classList.add('show');
    $('npc-prompt').textContent = '💬 올빼미와 대화'; $('npc-prompt').classList.add('show');
    $('door-prompt').textContent = '🚪 들어가기'; $('door-prompt').classList.add('show');
  }
  window.dispatchEvent(new Event('resize'));
  await new Promise((r) => setTimeout(r, 1200));
  const ids = ['coach', 'toast', 'npc-prompt', 'door-prompt', 'topleft', 'topright', 'minimap', 'feedback-tab', 'dex-tab', 'hotbar', 'joy-base', 'action-btn', 'quest-panel'];
  const rs = ids.map((id) => {
    const e = $(id); const c = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { id, vis: c.display !== 'none' && +c.opacity > 0.05 && r.width > 0, l: r.left, t: r.top, r: r.right, b: r.bottom };
  }).filter((o) => o.vis);
  const ov = [];
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
    const a = rs[i], b = rs[j];
    const x = Math.min(a.r, b.r) - Math.max(a.l, b.l), y = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (x > 2 && y > 2) ov.push(`${a.id} x ${b.id} (${Math.round(x)}x${Math.round(y)})`);
  }
  const out = rs.filter((o) => o.l < 0 || o.t < 0 || o.r > innerWidth || o.b > innerHeight).map((o) => o.id);
  return { size: `${innerWidth}x${innerHeight}${document.body.classList.contains('platform-toss') ? '+toss' : ''}`, ov, out };
};
