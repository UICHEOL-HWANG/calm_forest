const STALE_RE = /dynamically imported module|Importing a module script failed/i;
const FLAG = 'cf_stale_chunk_reload';

export function isStaleChunkError(reason) {
  return STALE_RE.test(String(reason?.message ?? ''));
}

export function installStaleChunkReload(win) {
  win.addEventListener('unhandledrejection', (ev) => {
    if (!isStaleChunkError(ev?.reason)) return;
    try {
      if (win.sessionStorage.getItem(FLAG)) return;
      win.sessionStorage.setItem(FLAG, '1');
    } catch {
      return;
    }
    win.location.reload();
  });
}
