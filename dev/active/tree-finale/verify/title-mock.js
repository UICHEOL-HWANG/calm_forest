import { makeNameTag, player, setCameraRig } from '/js/game.js';

const BADGE = '🌸 세계수지기';

function closeAll() {
  for (const id of ['nb-pick-modal', 'tree-modal']) document.getElementById(id)?.classList.remove('show');
  document.getElementById('fin-ov')?.remove();
  setCameraRig(null);
}

export function chip() {
  closeAll();
  const c = document.getElementById('story-chip');
  c.classList.add('show');
  document.getElementById('sc-ico').textContent = '🌸';
  document.getElementById('sc-title').textContent = '세계수지기';
  document.getElementById('sc-goal').textContent = '모든 이야기를 마쳤어요';
  return true;
}

export async function picker() {
  closeAll();
  const { neighborApi: A } = await import('/js/neighbors/net.js');
  const row = (pid, nick, character, done) => ({ public_id: pid, nick, character, house_stage: 6, decor_n: 3, visited_today: done });
  A.today = async () => ({ ok: true, list: [row('11111111-2222-4333-8444-555555555551', '달빛마을', 'rabbit', false), row('11111111-2222-4333-8444-555555555552', '솔바람숲', 'fox', false), row('11111111-2222-4333-8444-555555555553', '도토리네', 'bear', true)], rewardedToday: 0 });
  A.visitors = async () => ({ ok: true, list: [], replies: [] });
  const s = await import('/js/spaces/neighbor.js');
  await s.openNeighborPicker('verify');
  await new Promise(r => setTimeout(r, 800));
  const names = [...document.querySelectorAll('#nb-pick-modal .nb-name')];
  [0, 2].forEach(i => { if (names[i]) { const b = document.createElement('span'); b.className = 'nb-badge'; b.style.background = '#ffe0ec'; b.textContent = BADGE; names[i].appendChild(b); } });
  return names.length;
}

export async function board() {
  closeAll();
  const w = await import('/js/spaces/world-tree.js');
  w.openWorldTree();
  await new Promise(r => setTimeout(r, 600));
  const life = document.getElementById('tb-tabs');
  if (life && !document.getElementById('tb-title-row')) {
    const r = document.createElement('div');
    r.id = 'tb-title-row';
    r.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0 2px;padding:8px 10px;border-radius:10px;background:#ffeef5;font-size:13px;font-weight:700;color:#8a3d5c';
    const t = document.createElement('span'); t.textContent = `${BADGE} · 모든 이야기를 마쳤어요`;
    const b = document.createElement('button'); b.textContent = '🎬 엔딩 다시 보기';
    b.style.cssText = 'font:inherit;font-size:12px;border:0;border-radius:8px;padding:5px 9px;background:#fff;color:#8a3d5c';
    r.append(t, b);
    life.before(r);
  }
  return !!document.getElementById('tree-modal')?.classList.contains('show');
}

let tag = null;
export function head() {
  closeAll();
  document.getElementById('story-chip')?.classList.remove('show');
  if (!tag) {
    tag = makeNameTag({ emoji: '🐻', name: '도토리숲', color: 0xf7c6d9 }, '🌸 ');
    tag.position.set(0, 2.5, 0);
    player.add(tag);
  }
  tag.visible = true;
  tag.material.opacity = 1;
  setCameraRig((camera) => {
    const p = player.position;
    camera.position.set(p.x, p.y + 4.2, p.z + 7.5 * (camera.aspect < 0.8 ? 1.4 : 1));
    camera.lookAt(p.x, p.y + 1.6, p.z);
    return true;
  });
  return true;
}
