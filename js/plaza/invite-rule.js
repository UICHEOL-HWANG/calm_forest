// js/plaza/invite-rule.js
// 🦉 광장 초대 판정 — 순수(tests/plaza-invite.test.mjs)
export function inviteDue({ phase, invited, season, tutorialBusy, villageSec, modal }) {
  return phase === 'active' && invited !== season && !tutorialBusy && !modal && villageSec >= 20;
}
