import { isNightAt } from '../daynight.js';

export const DUSK = Object.freeze({ from: 0.66, to: 0.8 });
export const THEME_CHECK_S = 0.3;

const deepFreeze = o => {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
  return Object.freeze(o);
};

const DAY = {
  skyTop: 0x5fa8e8, skyBot: 0xdff0ff, fog: 0xdcecfb, fogNear: 70, fogFar: 260,
  hemiSky: 0xd8ecff, hemiGround: 0x8f9cc8, hemi: 0.95, sun: 0xfff3df, sunI: 1.5, sunDir: [-60, 90, 70],
  snow: 0xf7fafd, snowShade: 0xe6eef8, track: 0xffffff, rock: 0x6f7a8c, path: 0xe9dfcf,
  pine: 0x2f5a3c, pineDark: 0x24472f, trunk: 0x6b4a33, ranges: [0x9fb8d8, 0xb9cde6, 0xd3e2f2],
  cloud: 0xffffff, cloudGlow: 0xd4dce6, snowfall: false,
};

export const MOUNTAIN_THEMES = deepFreeze({
  day: DAY,
  dusk: {
    skyTop: 0xf39a8c, skyBot: 0xffd7a8, fog: 0xf6c9b4, fogNear: 60, fogFar: 240,
    hemiSky: 0xffd6c0, hemiGround: 0x8c76b8, hemi: 0.9, sun: 0xffb27a, sunI: 1.35, sunDir: [-90, 40, 40],
    snow: 0xfff3ec, snowShade: 0xf0dfe8, track: 0xfffaf6, rock: 0x6c5f78, path: 0xf0d8c6,
    pine: 0x3d4f52, pineDark: 0x2c3a40, trunk: 0x5a3e34, ranges: [0xb07fa8, 0xcf98ab, 0xe8b8b2],
    cloud: 0xffe6dc, cloudGlow: 0xf2b9a6, snowfall: false,
  },
  snow: {
    skyTop: 0xa9c2dc, skyBot: 0xe9f1f8, fog: 0xe3ecf5, fogNear: 40, fogFar: 170,
    hemiSky: 0xe8f1fb, hemiGround: 0xa6b2cf, hemi: 1.05, sun: 0xf6f8ff, sunI: 0.9, sunDir: [-40, 100, 60],
    snow: 0xf9fbfe, snowShade: 0xe9eff7, track: 0xffffff, rock: 0x7d8796, path: 0xe4e0d8,
    pine: 0x34594a, pineDark: 0x284638, trunk: 0x6b4a33, ranges: [0xb5c4d6, 0xc8d5e3, 0xdbe4ee],
    cloud: 0xffffff, cloudGlow: 0xdfe6ee, snowfall: true,
  },
  night: {
    ...DAY,
    skyTop: 0x0b1530, skyBot: 0x2a3d68, fog: 0x1f3158, fogNear: 50, fogFar: 210,
    hemiSky: 0x8ea4d4, hemiGround: 0x30355e, hemi: 0.6, sun: 0xc2d2ff, sunI: 0.5, sunDir: [50, 90, 40],
    ranges: [0x2c3f68, 0x37507e, 0x456192], cloud: 0x8c9cc4, cloudGlow: 0x2c3a62, snowfall: false,
  },
});

export const THEME_KEYS = Object.freeze(Object.keys(MOUNTAIN_THEMES));

const wrap = t => ((t % 1) + 1) % 1;

export function mountainTheme({ timeOfDay, weather } = {}) {
  if (!Number.isFinite(timeOfDay)) return weather === 'snow' ? 'snow' : 'day';
  const t = wrap(timeOfDay);
  const dusk = t >= DUSK.from && t < DUSK.to;
  if (!dusk && isNightAt(t)) return 'night';
  if (weather === 'snow') return 'snow';
  return dusk ? 'dusk' : 'day';
}

export function mountainLook(input = {}) {
  const key = mountainTheme(input);
  return { key, snowfall: input.weather === 'snow' || MOUNTAIN_THEMES[key].snowfall };
}
