import { trackEvent } from '../analytics.js';

export const trackOpen = (notes, isGuest) => trackEvent('concert_open', { notes, is_guest: isGuest ? 1 : 0 });
export const trackStart = (song, instrument, nth, diff) => trackEvent('concert_start', { song, instrument, nth, ...diff });
export const trackEnd = (song, stars, pct, notes, perfect, diff) => trackEvent('concert_end', { song, stars, pct, notes, perfect, ...diff });
export const trackExchange = (itemId, cost, left) => trackEvent('concert_exchange', { item_id: itemId, cost, left });
export const trackLoginPrompt = (notes) => trackEvent('concert_login_prompt', { notes });
