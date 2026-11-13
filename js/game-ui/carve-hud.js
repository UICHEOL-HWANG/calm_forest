import { Input } from '../game-lazy.js';

let $, ui, layoutBuffs;

// ── 🗿 조각 공방 HUD — 판정·연출은 game.js(캔버스 소유), 여기는 진행 표시 + 결과 카드만 ──
let CV = { active: false };
const CV_PAPERS = [['kraft', '크라프트'], ['floral', '꽃무늬'], ['starry', '별밤']];
function openCarveHud(st) {
  CV = { active: true, kept: null, paper: 'floral', gemT: 0 };
  $('cv-title').textContent = `${st.ico} ${st.name}`;
  $('cv-result').classList.remove('show', 'wrap');
  $('cv-gem').classList.remove('show');
  $('cv-hint').textContent = st.grain ? '결 따라 길게 그으면 여러 칸이 한 번에 깎여요' : '밝은 칩을 탭·드래그로 깎아내세요 — 어두운 밑그림을 탭하면 흠집!';
  cvProgress({ removed: 0, waste: st.waste, dmg: 0, combo: 0, best: 0 });
  $('cv-layer').classList.add('show');
  document.body.classList.add('menu-open'); document.body.classList.add('mg-open'); document.body.classList.add('cv-open');   // 마을 UI 걷고 무대에 몰입
  Input.setAnalog(0, 0);
}
function cvProgress(p) {
  $('cv-prog').textContent = `다듬기 ${Math.round(p.removed / p.waste * 100)}%`;
  $('cv-dmg').textContent = `흠집 ${'●'.repeat(p.dmg)}${'○'.repeat(Math.max(0, 3 - p.dmg))}`;
  const combo = p.combo || 0, best = p.best || 0;
  $('cv-combo').textContent = `콤보 ${combo}`;
  $('cv-gauge').querySelector('.cvg-fill').style.width = `${Math.min(combo, 15) / 15 * 100}%`;
  $('cv-gauge').querySelectorAll('.cvg-tick').forEach(t => t.classList.toggle('hit', best >= +t.dataset.at));
}
function cvGem() {
  const el = $('cv-gem');
  el.classList.add('show');
  clearTimeout(CV.gemT);
  CV.gemT = setTimeout(() => el.classList.remove('show'), 1800);
}
function cvDone(res) {
  if (!CV.active) return;
  $('cvr-ico').textContent = res.tier.ico;
  $('cvr-title').textContent = `${res.tier.name}!`;
  $('cvr-sub').innerHTML = res.canKeep ? `<span>${res.ico}</span> <span>${res.name}</span>` : `${res.ico} ${res.name} 완성 — 보상 🪙 <b>${res.coins}</b>`;
  $('cvr-stats').innerHTML = `<span>품질 <b>${res.score}</b>점${res.isBest ? ' ⭐신기록!' : ''}</span><span>흠집 <b>${res.dmg}</b></span><span>최고 콤보 <b>${res.comboMax}</b></span><span>누적 조각 <b>${res.carved}</b></span>`;
  $('cvr-sell').innerHTML = `🪙 팔기<small>+${res.coins}</small>`;
  $('cvr-keep').innerHTML = `🎁 간직하기<small>선물 ❤️+${res.keepLove}</small>`;
  $('cvr-choice').style.display = res.canKeep ? '' : 'none';
  $('cvr-closebar').style.display = res.canKeep ? 'none' : '';
  $('cv-result').classList.remove('wrap');
  $('cv-result').classList.add('show');
}
function cvRenderPapers() {
  const box = $('cvr-papers'); box.innerHTML = '';
  CV_PAPERS.forEach(([id, name]) => {
    const b = document.createElement('button');
    b.className = 'cvr-paper' + (CV.paper === id ? ' sel' : '');
    b.innerHTML = `<span class="sw p-${id}"></span><span>${name}</span>`;
    b.addEventListener('click', () => { CV.paper = id; cvRenderPapers(); });
    box.appendChild(b);
  });
}
function cvKeep() {
  if (CV.kept) return;
  const r = Input.carveResolve('keep');
  if (!r?.ok) { closeCarve(); return; }
  ui.toast(`🎁 ${r.name}${r.particle} 선물로 간직했어요`, 2400);
  CV.kept = r.id;
  cvRenderPapers();
  $('cv-result').classList.add('wrap');
}
function cvWrap() {
  const r = Input.carveWrap(CV.kept, CV.paper);
  if (!r.ok) { ui.toast(r.msg || '포장할 수 없어요'); return; }
  closeCarve();
}
function closeCarve() {
  CV.active = false;
  $('cv-layer').classList.remove('show');
  document.body.classList.remove('menu-open'); document.body.classList.remove('mg-open'); document.body.classList.remove('cv-open');
  Input.carveSceneEnd();                              // 마을 카메라 복귀
  layoutBuffs();
}
const getCV = () => CV;

export function installCarveHud(ctx) {
  ({ $, ui, layoutBuffs } = ctx);
  $('cv-quit').addEventListener('click', () => Input.carveAbandon());   // 포기해도 낮은 등급으로 정산됨
  $('cvr-close').addEventListener('click', closeCarve);
  $('cvr-sell').addEventListener('click', () => { Input.carveResolve('sell'); closeCarve(); });
  $('cvr-keep').addEventListener('click', cvKeep);
  $('cvr-plain').addEventListener('click', closeCarve);
  $('cvr-wrapgo').addEventListener('click', cvWrap);
  return { openCarveHud, cvProgress, cvDone, cvGem, getCV };
}

export const PANEL_IDS = ['cv-combo', 'cv-dmg', 'cv-gauge', 'cv-gem', 'cv-hint', 'cv-layer', 'cv-prog', 'cv-quit', 'cv-result', 'cv-title', 'cvr-choice', 'cvr-close', 'cvr-closebar', 'cvr-ico', 'cvr-keep', 'cvr-papers', 'cvr-plain', 'cvr-sell', 'cvr-stats', 'cvr-sub', 'cvr-title', 'cvr-wrapgo'];
