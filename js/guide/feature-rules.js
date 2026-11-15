import { YARD_IDLE_SEC, YARD_MAX_TRIES } from '../pond/yard-steps.js';

export const FEATURE_HOUSE_STAGE = 3;

export function tutorialDone(gs) {
  const step = gs?.hintsSeen?.tutStep;
  if (step) return step === 'done';
  return !!gs?.unlocks?.legacy || (gs?.houseStage | 0) >= 1 || (!!gs?.tutorialSeen && !!gs?.hintsSeen?.spotV2);
}

export const featureGuidesOpen = (gs) => tutorialDone(gs) && (gs?.houseStage | 0) >= FEATURE_HOUSE_STAGE;

export const houseGoalDue = (gs, coaching) => !coaching && tutorialDone(gs) && (gs?.houseStage | 0) < FEATURE_HOUSE_STAGE;

export function placeGuideReady({ eligible, done, tries, idleSec }) {
  return !!eligible && !done && (tries | 0) < YARD_MAX_TRIES && idleSec >= YARD_IDLE_SEC;
}

export const ARROW_LABEL = Object.freeze({
  'weekly-board': '주간 의뢰판으로 가요',
  'weekly-market': '주말 장터로 가요',
  concert: '음악회 무대로 가요',
  auction: '저녁 경매로 가요',
  house: '집 터로 가요',
  fountain: '광장으로 가요',
});

export const FIRST_VISIT = Object.freeze({
  weekly: Object.freeze({ key: 'visitWeekly', ico: '📋', title: '이번 주 의뢰', line: '의뢰를 하고 티켓을 모아 장터에서 바꿔요' }),
  concert: Object.freeze({ key: 'visitConcert', ico: '🎵', title: '마을 음악회', line: '음표를 모아 악기와 꾸미기로 바꿔요' }),
  auction: Object.freeze({ key: 'visitAuction', ico: '🔨', title: '저녁 경매', line: '저녁마다 열리는 경매예요' }),
  pond: Object.freeze({ key: 'visitPond', ico: '🐟', title: '내 연못', line: '물고기에게 매일 먹이를 줘요' }),
  fountain: Object.freeze({ key: 'visitFountain', ico: '❄️', title: '겨울 분수', line: '재료를 보태면 내 분수가 올라가요' }),
});
