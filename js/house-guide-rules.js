// First-house guidance experiment. Independent from the E1 starting-location arm.
import { BUILD_STAGES } from './house-cost.js';

export const HOUSE_GUIDE_WOOD = BUILD_STAGES[0].cost.wood;
export const HOUSE_GUIDE_ARMS = ['control', 'guide'];

export function houseGuideArm(clientId, platform) {
  const key = `house-guide-v1:${platform || 'web'}:${clientId || ''}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return HOUSE_GUIDE_ARMS[(hash >>> 0) & 1];
}

export function sanitizeHouseGuide(value) {
  if (!value || !HOUSE_GUIDE_ARMS.includes(value.arm)) return null;
  return { arm: value.arm, shown: !!value.shown, arrived: !!value.arrived };
}

export function houseGuideEligible(previousWood, currentWood, houseStage, assigned) {
  return !assigned && houseStage === 0 && previousWood < HOUSE_GUIDE_WOOD && currentWood >= HOUSE_GUIDE_WOOD;
}
