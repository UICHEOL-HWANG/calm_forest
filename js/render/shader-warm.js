export async function warmShaders(renderer, scene, camera) {
  if (!renderer || !scene || !camera) return false;
  try {
    if (renderer.extensions?.has?.('KHR_parallel_shader_compile') && renderer.compileAsync) await renderer.compileAsync(scene, camera);
    else renderer.compile(scene, camera);
    return true;
  } catch {
    return false;
  }
}
