export const guideNeed = (state) => !state.tutorial && state.notes === 0;

export function guideTarget({ need, inVillage, pastOnboarding, cameraFree, uiBusy, otherGuide }) {
  return !!need && inVillage && pastOnboarding && cameraFree && !uiBusy && !otherGuide;
}
