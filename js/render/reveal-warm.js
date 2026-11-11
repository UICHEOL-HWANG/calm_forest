export async function warmBeforeReveal({ warm, veil = null, hold, maxMs = 3000 }) {
  veil?.show();
  hold(true);
  try {
    await Promise.race([
      Promise.resolve().then(warm).catch(() => false),
      new Promise((r) => setTimeout(r, maxMs)),
    ]);
  } finally {
    hold(false);
    veil?.hide();
  }
}
