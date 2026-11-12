import { capPlugin, capListen } from '../cap-bridge.js';
import { PLATFORM } from '../platform.js';
import { createRewardedAds } from './rewarded-native.js';
import { trackTenjinAdImpression } from '../tenjin-native.js';

const testMode = globalThis.__ADS_TEST__ === true;
const ads = createRewardedAds({
  platform: PLATFORM,
  plugin: capPlugin('AdMob'),
  listen: (event, cb) => capListen('AdMob', event, cb),
  testMode,
  onPaid: testMode ? undefined : (paid) => { void trackTenjinAdImpression(paid); },
});

export const rewardedAvailable = ads.available;
export const warmUpAds = ads.warmUp;
export const showRewarded = ads.showRewarded;
export const showAdPrivacyOptions = ads.showPrivacyOptions;
