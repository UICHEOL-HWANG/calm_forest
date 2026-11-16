import { touchSimOn } from './touch-sim.js';

const MOBILE_UA = /Mobi|Android|iP(hone|od|ad)/i;
const SMALL_TOUCH_SCREEN = 820;
const STANDARD_ONLY = new Set(['roughness', 'metalness', 'roughnessMap', 'metalnessMap', 'envMapIntensity']);

export function liteMaterialOn({ ua = '', touchPoints = 0, screenMin = Infinity, search = '' } = {}) {
  return MOBILE_UA.test(ua) || (touchPoints > 1 && screenMin < SMALL_TOUCH_SCREEN) || touchSimOn(search);
}

export function makeLiteStandard(MeshLambertMaterial) {
  return class LiteStandardMaterial extends MeshLambertMaterial {
    constructor(params = {}) {
      super(Object.fromEntries(Object.entries(params).filter(([k]) => !STANDARD_ONLY.has(k))));
      this.roughness = params.roughness ?? 1;
      this.metalness = params.metalness ?? 0;
    }

    copy(source) {
      super.copy(source);
      this.roughness = source.roughness ?? 1;
      this.metalness = source.metalness ?? 0;
      return this;
    }
  };
}
