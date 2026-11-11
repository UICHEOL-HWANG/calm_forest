import { createRun, step, bid, canBid, outcome } from './engine.js';
import { settleWin, markJoined, addWin } from './settle.js';
import { lotFor, bidderMaxes } from './rules.js';
import { BID_INCS, TICK } from '../data/auction.js';

const MAX_DT = 0.25;

export function callText(t, extended) {
  if (extended) return '⏱️ 연장!';
  if (t >= 3) return '';
  if (t >= 2) return '3…';
  if (t >= 1) return '2…';
  return '1…';
}

export function createAuctionScene(d) {
  let run = null, lot = null, acc = 0, feed = [], flashUntil = 0, runId = '', done = null, slamT = 9, bellT = 9;
  let say = null, sayN = { raise_npc: 0, raise_me: 0 }, wasTense = false;
  const allowed = inc => canBid(run, inc) && run.price + inc <= d.getCoins();
  const emit = () => d.onUi({
    phase: done ? 'done' : 'run', price: run.price, leader: run.leader, t: run.t,
    call: callText(run.t, run.total < flashUntil), feed,
    canBid: Object.fromEntries(BID_INCS.map(n => [n, allowed(n)])), result: done, itemId: lot.id, say,
  });
  const onBid = (who, inc, extended) => {
    const slot = who === 'me' ? 'raise_me' : 'raise_npc';
    say = who === 'me' ? { slot, i: sayN[slot]++ } : { slot, who, i: sayN[slot]++ };
    feed = [{ who, inc, price: run.price }, ...feed].slice(0, 3);
    if (extended) flashUntil = run.total + 0.8;
    d.actors.raise(who, d.now() + 1.0);
    d.actors.hop(who, false);
    d.actors.lead(who);
  };
  const finish = () => {
    let out = outcome(run), price = run.price;
    if (out === 'win') {
      const r = settleWin({ coins: d.getCoins(), outdoorStored: d.getStored() }, lot.id, price);
      if (r.ok) {
        d.setCoins(r.coins);
        d.setStored(r.outdoorStored);
        d.setAuction(addWin(d.getAuction()));
        d.econ('auction_win', lot.id, -price, r.coins);
      } else {
        out = 'none';
        price = 0;
      }
    }
    if (run.leader && out !== 'none') {
      d.actors.hop(run.leader, true);
      d.actors.burst(run.leader);
      const [x, z] = d.actors.spotOf(run.leader);
      d.stage.focus(x, z);
    }
    say = out === 'win' ? { slot: 'sold_me', i: 0 }
      : run.leader && out !== 'none' && run.leader !== 'me' ? { slot: 'sold_npc', who: run.leader, i: 0 }
      : null;
    slamT = 0; bellT = 0;
    done = { outcome: out, price, itemId: lot.id, runId, leader: out === 'none' ? null : run.leader };
    d.track('auction_result', { item_id: lot.id, outcome: out, price, my_bids: run.myBids, run_id: runId });
    d.save();
    emit();
    d.onDone(done);
  };
  return {
    begin(mode) {
      const day = d.day();
      lot = lotFor(day);
      run = createRun({ start: lot.start, maxes: bidderMaxes(day, lot.appraisal, d.bidders), wallet: d.getCoins(), mode, bidders: d.bidders });
      acc = 0; feed = []; flashUntil = 0; done = null; slamT = 0; bellT = 0;
      say = { slot: 'open', i: 0 }; sayN = { raise_npc: 0, raise_me: 0 }; wasTense = false;
      runId = `${day}:${Math.floor(d.rng() * 1e6)}`;
      d.setAuction(markJoined(d.getAuction(), day));
      d.save();
      d.stage.setItem(lot.id);
      d.stage.focus(-1.25, -0.05);
      d.track('auction_join', { item_id: lot.id, mode, coins: d.getCoins() });
      emit();
    },
    playerBid(inc) {
      if (!run || done || !allowed(inc)) return false;
      run = bid(run, 'me', inc);
      onBid('me', inc, run.extended);
      emit();
      return true;
    },
    update(rawDt, t) {
      if (!run) return;
      const dt = Math.min(rawDt, MAX_DT);
      slamT += dt; bellT += dt;
      if (!done) {
        acc += dt;
        while (acc >= TICK - 1e-9 && !done) {
          acc -= TICK;
          const out = step(run, d.rng);
          run = out.run;
          for (const e of out.events) {
            if (e.type === 'bid') onBid(e.who, e.inc, e.extended);
            if (e.type === 'sold') finish();
          }
        }
      }
      const tense = !done && run.t < 3;
      if (tense && !wasTense) say = { slot: 'last', i: 0 };
      wasTense = tense;
      if (!done) emit();
      d.stage.setNight(d.getNight());
      d.stage.setTension(tense, t);
      d.stage.gavel.rotation.z = slamT < 0.14 ? 1.3 - 1.4 * (slamT / 0.14)
        : slamT < 0.4 ? -0.1 + 0.1 * ((slamT - 0.14) / 0.26)
        : tense ? 1.05 + Math.sin(t * 6) * 0.05 : 0;
      d.stage.bell.rotation.z = bellT < 2 ? Math.sin(bellT * 22) * 0.5 * Math.exp(-bellT * 3) : 0;
      d.actors.update(dt, d.now(), t);
    },
    active() { return !!run && !done; },
    end() { run = null; done = null; },
  };
}
