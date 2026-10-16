export const LOOK = Object.freeze({ ambient: 0, bloom: 0.12 });

export function applyLook({ scene, hemiLight, ambient, sunLight, bloomPass, target }, theme, sky) {
  hemiLight.color.setHex(theme.hemiSky);
  hemiLight.groundColor.setHex(theme.hemiGround);
  hemiLight.intensity = theme.hemi;
  ambient.intensity = LOOK.ambient;
  sunLight.color.setHex(theme.sun);
  sunLight.intensity = theme.sunI;
  sunLight.target.position.copy(target);
  sunLight.position.set(target.x + theme.sunDir[0], target.y + theme.sunDir[1], target.z + theme.sunDir[2]);
  sunLight.target.updateMatrixWorld();
  scene.fog.color.setHex(theme.fog);
  scene.fog.near = theme.fogNear;
  scene.fog.far = theme.fogFar;
  scene.background = sky || scene.fog.color;
  if (bloomPass) bloomPass.strength = LOOK.bloom;
}
