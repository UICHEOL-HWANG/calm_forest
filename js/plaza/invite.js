// js/plaza/invite.js
// =============================================================
//  🦉 광장 초대 — 시즌마다 1번, 마을에 20초 머무르면 올빼미가 날아와 알려 준다.
//  광장 반경에 도착하면 🍂5 + 🪙10. 퀘스트 목록에 끼우지 않는다(일일 의뢰 개수 검증·재추첨 사고 회피).
// =============================================================
import { gameState, player, dist2D, ui, mode, giveReward, requestSave } from '../game.js';
import { onOwlLand, sendOwlToPlayer } from '../spaces/npc.js';
import { onTrack, trackEvent } from '../analytics.js';
import { PLAZA, PLAZA_R, PLAZA_INVITE_REWARD } from '../data/plaza.js';
import { PLAZA_COPY } from './copy.js';
import { inviteDue } from './invite-rule.js';

let season = '', tutorialBusy = false, villageSec = 0, cooldown = 0;
const questId = () => `courier:plaza:${season}`;

onTrack((name) => {                                   // 이번 세션에 튜토리얼이 시작됐으면 끝날 때까지 기다린다
  if (name === 'tutorial_start') tutorialBusy = true;
  if (name === 'tutorial_complete' || name === 'tutorial_skip') tutorialBusy = false;
});

onOwlLand('plaza', () => {
  gameState.plaza = { ...gameState.plaza, invited: season };
  ui.toast?.(PLAZA_COPY.invite.land, 4200);
  trackEvent('plaza_invite_deliver', { season, quest_id: questId() });
  requestSave();
});

function checkArrive() {
  const p = gameState.plaza;
  if (p.invited !== season || p.seen[`arrived:${season}`]) return;
  if (dist2D(PLAZA, player.position) > PLAZA_R + 1) return;
  gameState.plaza = { ...p, seen: { ...p.seen, [`arrived:${season}`]: true } };
  giveReward(PLAZA_INVITE_REWARD, 'quest_reward', questId());
  ui.toast?.(PLAZA_COPY.invite.arrive, 3600);
  trackEvent('plaza_invite_arrive', { season, quest_id: questId() });
  requestSave();
}

export function updateInvite(dt, inVillage, phase, seasonId, debug = false) {
  season = seasonId;
  villageSec = inVillage && mode === 'play' ? villageSec + dt : 0;
  cooldown -= dt; if (cooldown > 0) return;
  cooldown = 0.5;
  if (inviteDue({ phase, invited: gameState.plaza.invited, season, tutorialBusy, villageSec, modal: !!ui.anyModalOpen?.(), debug })) {
    sendOwlToPlayer('plaza');
  }
  if (inVillage) checkArrive();
}
