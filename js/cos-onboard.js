export const COS_STAGES = ['visit', 'buy', 'done'];
export const COS_REWARD = 30;

export function shouldOffer({ tutorialSeen = false, owned = [], stage, houseStage = 0 } = {}) {
  return !!tutorialSeen && (houseStage || 0) >= 3 && !stage && !(Array.isArray(owned) && owned.length > 0);
}

export function afterVisit(stage) { return stage === 'visit' ? 'buy' : stage; }

export function afterBuy(stage) { return stage ? 'done' : stage; }

export const COS_HOW = {
  visit: '🗺️ 미니맵의 🎀 를 따라 마을 서쪽 꾸미기 가게로 가요',
  buy: '🌱 새싹반 탭에서 마음에 드는 꾸미기를 사서 달아요',
};

export function cosOnboardView(stage) {
  const base = { id: 'cos_onboard', name: '꾸미기 가게', title: '🎀 꾸미기 가게 구경하기', target: 2 };
  if (stage === 'visit') return { ...base, progress: 0, desc: '🎀 꾸미기 가게 들르기', how: COS_HOW.visit };
  if (stage === 'buy') return { ...base, progress: 1, desc: '🌱 첫 꾸미기 달기', how: COS_HOW.buy };
  return null;
}

export function restoreStage(stage, ownedCount = 0) {
  if (!COS_STAGES.includes(stage)) return undefined;
  return (ownedCount || 0) > 0 ? 'done' : stage;
}

export const COS_LINES = {
  title: '🎀 꾸미기 가게',
  offer: '새싹반 꾸미기가 들어왔어요. 미니맵의 🎀 를 따라가요',
  done: '🎉 첫 꾸미기 완성! 🪙 +30',
};
