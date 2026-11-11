import { capPlugin } from './cap-bridge.js';

const DECIDED = new Set(['authorized', 'denied', 'restricted']);

export async function requestTrackingConsent({ plugin = capPlugin('Tracking') } = {}) {
  if (!plugin) return false;
  try {
    const { status } = await plugin.status();
    if (DECIDED.has(status)) return status === 'authorized';
    const answer = await plugin.request();
    return answer?.status === 'authorized';
  } catch (error) {
    console.warn('[att] tracking consent failed', error);
    return false;
  }
}
