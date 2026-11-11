import { AUCTION_BIDDERS, COUNT_START, COUNT_RESET, RUN_CAP, TICK } from '../data/auction.js';

export function createRun({ start, maxes, wallet, mode, bidders = AUCTION_BIDDERS }) {
  return {
    price: start, leader: null, t: COUNT_START, total: 0, wallet, mode,
    over: false, extended: false, myBids: 0,
    bidders: bidders.map(b => ({ id: b.id, style: b.style, inc: b.inc, max: maxes[b.id], cool: 0 })),
  };
}

export function canBid(run, inc) {
  return !run.over && run.mode === 'bid' && run.leader !== 'me' && run.price + inc <= run.wallet;
}

export function bid(run, who, inc) {
  if (run.over) return run;
  return {
    ...run,
    price: run.price + inc,
    leader: who,
    t: Math.max(run.t, COUNT_RESET),
    extended: run.t < 3,
    myBids: run.myBids + (who === 'me' ? 1 : 0),
  };
}

function chance(style, t) {
  if (style === 'eager') return 0.05;
  if (style === 'big') return 0.025;
  return t < 2.2 ? 0.2 : 0.004;
}

export function step(run, rng) {
  if (run.over) return { run, events: [] };
  let r = {
    ...run,
    t: run.t - TICK,
    total: run.total + TICK,
    extended: false,
    bidders: run.bidders.map(b => ({ ...b, cool: Math.max(0, b.cool - TICK) })),
  };
  const events = [];
  for (const b of r.bidders) {
    if (r.leader === b.id || b.cool > 0 || r.price + b.inc > b.max) continue;
    if (rng() >= chance(b.style, r.t)) continue;
    const cool = 0.6 + rng() * 0.8;
    r = bid(r, b.id, b.inc);
    r = { ...r, bidders: r.bidders.map(x => (x.id === b.id ? { ...x, cool } : x)) };
    events.push({ type: 'bid', who: b.id, inc: b.inc, price: r.price, extended: r.extended });
    break;
  }
  if (r.t <= 0 || r.total >= RUN_CAP - 1e-9) {
    r = { ...r, over: true };
    events.push({ type: 'sold', who: r.leader, price: r.price });
  }
  return { run: r, events };
}

export function outcome(run) {
  if (!run.leader) return 'none';
  if (run.mode === 'watch') return 'watch';
  return run.leader === 'me' ? 'win' : 'lose';
}
