// js/plaza/invite-rule.js
// 🦉 광장 초대 판정 — 순수(tests/plaza-invite.test.mjs)
export function inviteDue({ phase, invited, season, tutorialBusy, villageSec, modal, debug = false }) {
  if (debug) return false;   // 🔒 검수용 ?plaza= 단계 고정 중엔 초대(🍂🪙 보상)를 아예 안 보낸다
  return phase === 'active' && invited !== season && !tutorialBusy && !modal && villageSec >= 20;
}
