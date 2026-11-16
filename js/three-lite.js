import { MeshStandardMaterial as CoreStandardMaterial, MeshLambertMaterial } from 'three-core';
import { liteMaterialOn, makeLiteStandard } from './lite-material.js';

export * from 'three-core';

const env = typeof location === 'undefined' ? {} : {
  ua: globalThis.navigator?.userAgent || '',
  touchPoints: globalThis.navigator?.maxTouchPoints || 0,
  screenMin: typeof screen === 'undefined' ? Infinity : Math.min(screen.width, screen.height),
  search: location.search,
};

export const MeshStandardMaterial = liteMaterialOn(env) ? makeLiteStandard(MeshLambertMaterial) : CoreStandardMaterial;
