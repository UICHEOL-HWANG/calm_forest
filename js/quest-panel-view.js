export function questPanelView(list, { phone, open, short, more }) {
  if (!list.length) return { items: [], more: 0, toggle: null };
  if (!open) {
    return { items: [{ q: list[0], mode: 'line' }], more: more + list.length - 1, toggle: '펼치기' };
  }
  const leadFirst = phone || !short;
  const items = list.map((q, i) => ({ q, mode: i === 0 && leadFirst ? 'lead' : 'sub' }));
  return { items, more, toggle: '접기' };
}
