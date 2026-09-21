// =============================================================
//  calm forest · 🐗🦝 밤손님 승부 — 흐름
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-night-duel-design.md
//  ▶ game.js 의 setDuelSource() 확장점에 끼운다(night-visit.js 와 같은 문법).
//  ▶ 여기서 true 를 돌려주면 game.js 가 작물 회수와 🤝 휴전을 처리한다.
//    보상 규칙을 이쪽에 두지 않는다 — 인벤토리는 game.js 의 것이다.
//  ▶ ⚠️ rps 와 shells 가 같은 이름(initMatch·applyRound)을 export 한다. 별칭으로 받는다.
// =============================================================
import { setDuelSource } from '../game.js';
import { trackEvent } from '../analytics.js';
import { rollHand, judge, initMatch as rpsInit, applyRound as rpsRound } from './rps.js';
import { SHELL_ROUNDS, makeSwaps, finalPos,
         initMatch as shellInit, applyRound as shellRound } from './shells.js';
import { enterDuelStage, exitDuelStage, showThrow, clearThrow } from './stage.js';
import * as ui from './ui.js';

// 🐗 가위바위보 2선승 — 비기면 판 번호를 올리지 않고 다시 낸다
async function playRps(onRound, handle) {
  let m = rpsInit();
  while (!m.done) {
    onRound(m.rounds + 1);
    ui.setRound(m.rounds + 1, 3);
    ui.setBanner(ui.COPY.askHand);
    const mine = await ui.askHand();
    const theirs = rollHand(Math.random());
    const result = judge(mine, theirs);
    showThrow(handle, ui.HAND_ICO[mine], ui.HAND_ICO[theirs]);   // 🖐️ 낸 손을 둘의 머리 위에 — 무대에서 승부가 보이게
    await ui.showHands(mine, theirs, result);
    clearThrow(handle);
    m = rpsRound(m, result);
  }
  return m;
}

// 🦝 그릇 섞기 3판 전승 — 한 판이라도 틀리면 그 자리에서 끝
async function playShells(onRound, cropIco) {
  let m = shellInit();
  for (const r of SHELL_ROUNDS) {
    onRound(m.round + 1);
    ui.setRound(m.round + 1, SHELL_ROUNDS.length);
    ui.setBanner(ui.COPY.askShell);
    const rolls = Array.from({ length: r.swaps }, () => Math.random());   // ⚠️ r.swaps 만큼 채운다 — 짧으면 makeSwaps 가 조용히 결정적 패턴으로 샌다
    const swaps = makeSwaps(r.swaps, rolls);
    const start = Math.floor(Math.random() * 3);
    const picked = await ui.askShell(swaps, start, r.ms, cropIco);
    m = shellRound(m, picked === finalPos(start, swaps));
    if (m.done) break;
  }
  return m;
}

export function initDuel() {
  setDuelSource(async (ctx) => {
    const game = ctx.animal === 'boar' ? 'rps' : 'shells';
    let at = 0;                                 // 몇 번째 판까지 갔나 — 중간 이탈 지점
    const onRound = (n) => { at = n; };
    trackEvent('duel_start', { animal: ctx.animal, game, crops: ctx.crops.length });   // [GA4] 진입률
    let handle = null;
    try {
      handle = enterDuelStage(ctx.stage, { animal: ctx.animal, x: ctx.x, z: ctx.z });
      ui.openDuel();
      ui.setBanner(ctx.animal === 'boar' ? ui.COPY.boarOpen : ui.COPY.raccoonOpen);
      const m = game === 'rps' ? await playRps(onRound, handle) : await playShells(onRound, ctx.cropIco);
      const won = !!m.won;
      ui.setBanner(won ? ui.COPY.matchWin : ui.COPY.matchLose);
      trackEvent('duel_result', {                                                      // [GA4] 실제 승률
        animal: ctx.animal, game, win: won ? 1 : 0,
        rounds: game === 'rps' ? m.rounds : m.round,
        recovered: won ? ctx.crops.length : 0,
      });
      await new Promise(r => setTimeout(r, 1400));   // 결과를 읽을 틈
      return won;
    } catch (e) {
      // ⚠️ askHand/askShell 은 closeDuel() 로 끊기면 Error('duel-closed') 로 reject 한다.
      //    여기서 잡지 않으면 false 로 굴러 떨어져 "패배"로 집계되며 승률 지표가 어긋난다.
      trackEvent('duel_quit', { animal: ctx.animal, game, round: at });                // [GA4] 중간 이탈
      console.warn('[승부] 중단', e?.message || e);
      return false;
    } finally {
      ui.closeDuel();
      if (handle) exitDuelStage(handle);
    }
  });
}
