const NATIVE = new Set(['android', 'ios']);

export async function adBuildInfo({ platform, capPlugin, loadSdk }) {
  try {
    if (NATIVE.has(platform)) {
      const app = capPlugin?.('App');
      if (!app) return { build: 'no_app_plugin' };
      const info = await app.getInfo();
      return { build: info?.version ? `${info.version}(${info.build ?? '?'})` : 'no_version' };
    }
    if (platform === 'toss') {
      const sdk = await loadSdk();
      return { build: `toss-${sdk?.getTossAppVersion?.() ?? 'unknown'}` };
    }
    return null;
  } catch {
    return { build: 'error' };
  }
}
