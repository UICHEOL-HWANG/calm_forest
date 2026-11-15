export function shopCueVisible({ now, until, hidden }) {
  return now <= until && !hidden;
}
