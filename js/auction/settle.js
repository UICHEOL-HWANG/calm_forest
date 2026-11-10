export function settleWin({ coins, outdoorStored }, itemId, price) {
  if (coins < price) return { ok: false, why: 'poor' };
  return { ok: true, coins: coins - price, outdoorStored: { ...outdoorStored, [itemId]: (outdoorStored[itemId] || 0) + 1 } };
}

export function markJoined(auction, day) { return { ...auction, lastDate: day }; }

export function addWin(auction) { return { ...auction, wins: auction.wins + 1 }; }
