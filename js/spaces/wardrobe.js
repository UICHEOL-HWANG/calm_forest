// =============================================================
//  🧥 옷장 · 🐾 펫 — ☰ 🐾 캐릭터·꾸미기 화면의 두 탭 (2026-09-29)
//  ------------------------------------------------------------
//  ▶ 가게(cafe.js drawCosMenu)는 사고 입어보기만 한다. **입고 벗기·펫 바꾸기는 여기서만.**
//    이펙트를 여러 개 사 두면 갈아입으러 매번 가게까지 걸어가야 했다(유저 피드백).
//  ▶ 목록은 **산 것만** 보인다. 누르면 곧바로 실제 장착이 바뀐다(가게의 '입어보기' 같은 가상 상태 없음).
//  ▶ 규칙은 js/cosmetics/wardrobe.js(순수·테스트) — 여기는 DOM 과 게임 상태를 잇는 층.
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
// =============================================================
import {
  applyCosmetics, finishPetJob, gameState, petJob, requestSave, respawnPet, usePet,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다
import { trackEvent } from '../analytics.js';
import { ownedIn, toggleWear } from '../cosmetics/wardrobe.js';
import { PET_KINDS, stageOf, toNextStage } from '../pet/rules.js';

//  가게 탭 이름과 같은 말을 쓴다 — 가게에서 본 칸 이름이 옷장에서도 그대로 보이게
const SLOT_TABS = [['head', '🎩 머리'], ['neck', '🧣 목'], ['back', '🎒 가방'], ['trail', '✨ 이펙트']];
let slot = 'head';

/** 🐾 데리고 다닐 종을 바꾼다 — 가게에서 새로 산 직후에도 쓴다.
 *  ⚠️ 맡긴 일이 끝나기 전에 종을 바꾸면 finishPetJob 이 새로 데려온 펫에게 works 를 적립하고
 *     쿨다운까지 건다(원래 일한 펫은 헛일). 바꾸기 전에 지금까지 한 만큼을 **옛 펫에게** 정산한다. */
export function switchPet(kind) {
  if (petJob) finishPetJob();
  usePet(kind);
  respawnPet();
  requestSave();
}

function row(label, sub, btnText, disabled, onPress) {
  const r = document.createElement('div');
  r.className = 'sh-row';
  const col = document.createElement('div');
  col.className = 'sh-col';
  const name = document.createElement('span');
  name.className = 'sh-name';
  name.textContent = label;
  col.appendChild(name);
  if (sub) {
    const s = document.createElement('span');
    s.className = 'sh-sub';
    s.textContent = sub;
    col.appendChild(s);
  }
  const b = document.createElement('button');
  b.textContent = btnText;
  b.disabled = disabled;
  r.append(col, b);
  if (!disabled) r.onclick = onPress;                    // 줄 어디를 눌러도 같은 동작 — 폰에서 버튼만 노리지 않게
  return r;
}

function empty(box, text) {
  const p = document.createElement('p');
  p.className = 'wd-empty';
  p.textContent = text;
  box.appendChild(p);
}

/** 🧥 옷장 탭 — tabsEl 에 칸 버튼, box 에 산 것 목록. preview 는 캐릭터 화면의 3D 미리보기, hintEl 은 '돌려보기' 안내 */
export function drawWardrobe(tabsEl, box, preview, hintEl) {
  const redraw = () => drawWardrobe(tabsEl, box, preview, hintEl);
  tabsEl.innerHTML = '';
  for (const [id, label] of SLOT_TABS) {
    const b = document.createElement('button');
    b.className = 'sh-tab' + (slot === id ? ' active' : '');
    b.textContent = label;
    b.onclick = () => { slot = id; redraw(); };
    tabsEl.appendChild(b);
  }
  preview?.showPet(null);
  preview?.showTrail(slot === 'trail');                  // ✨ 이펙트 칸 — 캐릭터 대신 자국이 걸어온다(가게와 같다)
  preview?.refresh(null);                                // 옷장엔 가상 장착이 없다 — 늘 실제 모습
  //  걷는 자국은 돌리지 않는다 → 안내를 감춘다. visibility 라 자리는 남는다(칸을 오갈 때 상자 높이가 안 튄다)
  if (hintEl) hintEl.style.visibility = slot === 'trail' ? 'hidden' : '';
  box.innerHTML = '';
  const items = ownedIn(gameState.cosmetics, slot);
  if (!items.length) { empty(box, '아직 산 게 없어요 · 🎀 꾸미기 가게에서 살 수 있어요'); return; }
  for (const it of items) {
    const on = gameState.cosmetics.equipped[it.slot] === it.id;
    box.appendChild(row(`${it.ico} ${it.name}`, null, on ? '벗기' : '착용', false, () => {
      const r = toggleWear(gameState.cosmetics, it.id);
      if (!r.action) return;
      gameState.cosmetics = r.cos;
      trackEvent('cosmetic_equip', { item_id: it.id, slot: it.slot, action: r.action, via: 'wardrobe' });
      applyCosmetics(gameState.cosmetics);
      requestSave();
      redraw();
    }));
  }
}

/** 🐾 펫 탭 — 산 종만. 누르면 그 종을 데리고 다닌다 */
export function drawPets(box, preview) {
  const redraw = () => drawPets(box, preview);
  preview?.showTrail(false);
  box.innerHTML = '';
  const mine = PET_KINDS.filter(k => gameState.pets[k.id]);
  const active = gameState.pet ? gameState.pet.kind : null;
  const shown = active || mine[0]?.id;
  if (shown) preview?.showPet(stageOf(gameState.pets[shown].works), shown);
  else preview?.showPet(null);
  if (!mine.length) { empty(box, '아직 펫이 없어요 · 🎀 꾸미기 가게에서 데려올 수 있어요'); return; }
  for (const k of mine) {
    const p = gameState.pets[k.id];
    const left = toNextStage(p.works);
    const sub = left === null ? `${stageOf(p.works) + 1}단계 · 다 자랐어요` : `${stageOf(p.works) + 1}단계 · 다음까지 ${left}번`;
    const on = active === k.id;
    box.appendChild(row(`${k.ico} ${k.name}`, sub, on ? '함께 있음' : '데려가기', on, () => {
      trackEvent('pet_switch', { pet_kind: k.id, from_kind: active || 'none', stage: stageOf(p.works), via: 'wardrobe' });
      switchPet(k.id);
      redraw();
    }));
  }
}
