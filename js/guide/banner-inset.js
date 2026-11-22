export function insetBelow(box, viewH, clear = 40) {
  return box && box.height && box.bottom < viewH / 2 ? Math.round(box.bottom + clear) : 0;
}

export function bannerInset() {
  const el = document.getElementById('hint-banner');
  return el?.classList.contains('show') ? insetBelow(el.getBoundingClientRect(), window.innerHeight) : 0;
}
