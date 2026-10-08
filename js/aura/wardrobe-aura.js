// 🏮 옷장 🔮 오라 탭 — 받은 오라를 공방에 가지 않고 바꿔 두른다(다듬기는 공방에서).
// ⚠️ analytics.js(window 접근)·game.js(순환)는 drawAuraTab 안에서만 읽는다 — Node 테스트가 auraTabVisible 만 불러올 수 있게.

export const auraTabVisible = aura => !!aura && Array.isArray(aura.slots) && aura.slots.length > 0;

export async function drawAuraTab(box, redraw) {
  const [game, { trackEvent }] = await Promise.all([import('../game.js'), import('../analytics.js')]);
  const aura = game.gameState.aura;
  box.replaceChildren();
  for (const s of aura.slots) {
    const wearing = aura.equipped === s.id;
    const r = document.createElement('div');
    r.className = 'sh-row';
    const col = document.createElement('div');
    col.className = 'sh-col';
    const name = document.createElement('span');
    name.className = 'sh-name';
    name.textContent = wearing ? `🔮 ${s.recipe.name} · 두르는 중` : `🔮 ${s.recipe.name}`;
    col.appendChild(name);
    const b = document.createElement('button');
    b.textContent = wearing ? '벗기' : '착용';
    r.append(col, b);
    r.onclick = () => {
      game.gameState.aura = { ...aura, equipped: wearing ? null : s.id };
      trackEvent(wearing ? 'aura_unequip' : 'aura_equip', { order_id: s.id, via: 'wardrobe' });
      game.refreshAura();
      game.requestSave();
      redraw();
    };
    box.appendChild(r);
  }
}
