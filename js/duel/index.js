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
async function playRps(onRound, handle, animal) {
  let m = rpsInit(), draws = 0;
  while (!m.done) {
    onRound(m.rounds + 1);
    ui.setRound(m.rounds + 1, 3);
    ui.setBanner(ui.COPY.askHand);
    const t0 = Date.now();
    const mine = await ui.askHand();
    const rt = Date.now() - t0;                 // 고민한 시간 — 아주 짧으면 찍은 것이다
    const theirs = rollHand(Math.random());
    const result = judge(mine, theirs);
    if (result === 'draw') draws++;
    // [GA4] 판 단위 — 승부 전체만 보면 **어느 판에서 무너지는지**가 안 보인다.
    //   낸 손까지 남겨야 "사람이 바위를 편중해서 내는가" 같은 것도 뒤에서 볼 수 있다.
    trackEvent('duel_round', { animal, game: 'rps', round: m.rounds + 1, result, rt, mine, theirs });
    showThrow(handle, ui.HAND_ICO[mine], ui.HAND_ICO[theirs]);   // 🖐️ 낸 손을 둘의 머리 위에 — 무대에서 승부가 보이게
    await ui.showHands(mine, theirs, result);
    clearThrow(handle);
    m = rpsRound(m, result);
  }
  return { ...m, draws };
}

// 🦝 그릇 섞기 3판 전승 — 한 판이라도 틀리면 그 자리에서 끝
async function playShells(onRound, cropIco, animal) {
  let m = shellInit();
  for (const r of SHELL_ROUNDS) {
    onRound(m.round + 1);
    ui.setRound(m.round + 1, SHELL_ROUNDS.length);
    ui.setBanner(ui.COPY.askShell);
    const rolls = Array.from({ length: r.swaps }, () => Math.random());   // ⚠️ r.swaps 만큼 채운다 — 짧으면 makeSwaps 가 조용히 결정적 패턴으로 샌다
    const swaps = makeSwaps(r.swaps, rolls);
    const start = Math.floor(Math.random() * 3);
    const t0 = Date.now();
    const picked = await ui.askShell(swaps, start, r.ms, cropIco);
    const answer = finalPos(start, swaps);
    const ok = picked === answer;
    // [GA4] 판 단위 — 그 판의 **난이도**(섞기 횟수·속도)를 같이 남겨야 어느 속도부터
    //   무너지는지 볼 수 있다. off 는 정답과 몇 자리 떨어졌나 — 0 은 정답, 1 은 옆 그릇,
    //   2 는 반대쪽이다. 눈으로 좇다 놓친 건지 아예 못 좇은 건지가 갈린다.
    trackEvent('duel_round', {
      animal, game: 'shells', round: m.round + 1, result: ok ? 'win' : 'lose',
      rt: Date.now() - t0 - (r.swaps * r.ms + 1500),   // 섞기가 끝난 뒤 고민한 시간(연출 시간을 뺀다)
      swaps: r.swaps, ms: r.ms, picked, answer, off: Math.abs(picked - answer),
    });
    m = shellRound(m, ok);
    if (m.done) break;
  }
  return m;
}

export function initDuel() {
  setDuelSource(async (ctx) => {
    const game = ctx.animal === 'boar' ? 'rps' : 'shells';
    let at = 0;                                 // 몇 번째 판까지 갔나 — 중간 이탈 지점
    const onRound = (n) => { at = n; };
    // [GA4] 진입률 + 걸린 판돈. crop 종류를 남겨야 "고급 작물을 잃었을 때 더 열심히 하는가"를 본다
    trackEvent('duel_start', { animal: ctx.animal, game, crops: ctx.crops.length, crop: ctx.crops.find(c => c) || 'basic' });
    const started = Date.now();
    let handle = null;
    try {
      handle = enterDuelStage(ctx.stage, { animal: ctx.animal, x: ctx.x, z: ctx.z });
      ui.openDuel();
      ui.setBanner(ctx.animal === 'boar' ? ui.COPY.boarOpen : ui.COPY.raccoonOpen);
      const m = game === 'rps' ? await playRps(onRound, handle, ctx.animal) : await playShells(onRound, ctx.cropIco, ctx.animal);
      const won = !!m.won;
      ui.setBanner(won ? ui.COPY.matchWin : ui.COPY.matchLose);
      // [GA4] 실제 승률. 설계는 🐗 50% · 🦝 60~75% — 벗어나면 난수나 판정에 버그다.
      //   draws: 🐗 는 비긴 판이 rounds 에 안 들어간다. 이게 없으면 "몇 번 냈는지"를 못 센다.
      //   secs: 한 승부에 걸린 시간 — 길면 지루하다는 뜻이고, 이탈률과 같이 본다.
      trackEvent('duel_result', {
        animal: ctx.animal, game, win: won ? 1 : 0,
        rounds: game === 'rps' ? m.rounds : m.round,
        draws: m.draws || 0,
        secs: Math.round((Date.now() - started) / 1000),
        recovered: won ? ctx.crops.length : 0,
      });
      await new Promise(r => setTimeout(r, 1400));   // 결과를 읽을 틈
      return won;
    } catch (e) {
      // ⚠️ askHand/askShell 은 closeDuel() 로 끊기면 Error('duel-closed') 로 reject 한다.
      //    여기서 잡지 않으면 false 로 굴러 떨어져 "패배"로 집계되며 승률 지표가 어긋난다.
      // [GA4] 중간 이탈 — round 는 **진행 중이던 판**이어야 한다(루프 밖에서 한 번만 세면 늘 0 이다).
      //   secs 를 같이 남겨야 "지루해서 나갔나 / 급한 일로 나갔나"를 가른다.
      trackEvent('duel_quit', { animal: ctx.animal, game, round: at, secs: Math.round((Date.now() - started) / 1000) });
      console.warn('[승부] 중단', e?.message || e);
      return false;
    } finally {
      ui.closeDuel();
      if (handle) exitDuelStage(handle);
    }
  });
}
