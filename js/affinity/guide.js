import { camera, gameState, giveReward, npcObjs, obstacles, player, requestSave, scene, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { getLang, t } from '../i18n.js';
import { NPCS } from '../data/npcs.js';
import { BENCH } from '../data/places.js';
import { createGuide } from '../guide/runner.js';
import { createGuideView } from '../guide/view.js';
import { GUIDE_PRIORITY, guideArbiter } from '../guide/arbiter.js';
import { guideGiveText } from './copy.js';
import { AFFINITY_NPCS } from './stages.js';

const NAV_MIN_R = 0.8;
const NEAR_R = 12;
let guide = null, view = null, npcId = null, base = 0, asking = false;

const npcObj = () => (npcObjs || []).find(o => o.def.id === npcId);
const total = () => AFFINITY_NPCS.reduce((s, id) => s + (gameState.affinity?.[id] || 0), 0);
const given = () => total() > base;
const nameOf = (id) => NPCS.find(n => n.id === id)?.name || id;

const STEPS = [
  {
    id: 'craft',
    text: () => t('🎁 작업대에서 꽃다발 만들기'),
    target: () => ({ x: BENCH.x, z: BENCH.z }),
    done: () => given() || (gameState.gifts?.bouquet || 0) > 0,
  },
  {
    id: 'give',
    text: () => guideGiveText({ name: nameOf(npcId), nameEn: t(nameOf(npcId)), lang: getLang() }),
    target: () => { const o = npcObj(); return o ? { x: o.group.position.x, z: o.group.position.z } : null; },
    done: given,
  },
];

const nearSolids = (me) => obstacles
  .filter(o => o.r >= NAV_MIN_R && Math.hypot(o.x - me.x, o.z - me.z) < NEAR_R)
  .map(o => [{ x: o.x, z: o.z }, o.r]);

export const affinityGuideActive = () => !!guide?.active();
export const affinityFocus = () => (affinityGuideActive() && guide.current()?.id === 'give' ? { npc: npcId } : null);
export const affinityPriority = () => (asking || affinityGuideActive() ? GUIDE_PRIORITY.goal + 5 : GUIDE_PRIORITY.affinity);

export function startAffinityGuide(id) {
  if (guide || !id) return false;
  asking = true;
  const ok = guideArbiter.mayShow('affinity');
  asking = false;
  if (!ok) { ui.toast?.(t('지금은 다른 안내가 먼저예요. 조금 뒤에 다시 눌러 주세요'), 2600); return false; }
  npcId = id;
  base = total();
  const crops = gameState.inventory?.crop || 0;
  if (crops < 2 && !(gameState.gifts?.bouquet > 0) && !gameState.hintsSeen?.affGuideRefill) {
    gameState.hintsSeen = { ...(gameState.hintsSeen || {}), affGuideRefill: 1 };
    giveReward({ crop: 2 - crops }, 'affinity_guide', id);
    ui.toast?.('🥕 꽃다발 재료(작물 2개)를 챙겨 드렸어요', 2600);
  }
  view ??= createGuideView({ scene, camera, root: document.body });
  guide = createGuide({
    flow: 'affinity', steps: STEPS, now: () => performance.now(),
    onStep: e => trackEvent('guide_step', e),
    onDone: () => {
      gameState.hintsSeen = { ...(gameState.hintsSeen || {}), affGuideDone: 1 };
      requestSave(); view.hide(); guide = null;
    },
  });
  return true;
}

export function updateAffinityGuide(visible) {
  if (!guide) return;
  const o = npcObj();
  if (!o || o.hidden) { guide.stop(); view.hide(); guide = null; return; }
  guide.tick({});
  if (!guide) return;
  const step = guide.current();
  if (!visible || !step) { view.hide(); return; }
  view.show(step, guide.index(), guide.total, {}, player.position, nearSolids(player.position), 0);
}
