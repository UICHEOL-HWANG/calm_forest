import { trackEvent } from '../analytics.js';

export const trackBoardOpen = (week, done) => trackEvent('weekly_board_open', { week, done });
export const trackQuestClaim = (week, questId, tickets) => trackEvent('weekly_quest_claim', { week, quest_id: questId, tickets });
export const trackMarketOpen = (week, tickets, isGuest) => trackEvent('market_open', { week, tickets, is_guest: isGuest ? 1 : 0 });
export const trackMarketBuy = (week, itemId, cost) => trackEvent('market_buy', { week, item_id: itemId, cost });
export const trackLoginPrompt = (week, tickets) => trackEvent('market_login_prompt', { week, tickets });
