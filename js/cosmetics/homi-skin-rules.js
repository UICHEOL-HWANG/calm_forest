export const HOMI_SKIN_OF = Object.freeze({ homi_najeon: 'najeon', homi_coral: 'coral', homi_whale: 'whale' });

export function homiSkinOf(cos) {
  const id = cos?.equipped?.homi;
  return typeof id === 'string' && Object.hasOwn(HOMI_SKIN_OF, id) ? HOMI_SKIN_OF[id] : null;
}
