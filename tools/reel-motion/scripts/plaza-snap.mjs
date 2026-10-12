// 🌾 Freeze the live harvest-plaza progress into src/plazaSnapshot.json before rendering.
// The reel shows a real number with its date. `npm run render:harvest` runs this first, so a network
// failure or an ended season stops the render instead of shipping a stale number (and it rewrites the snapshot).
import { writeFile } from 'node:fs/promises';

const URL_ = 'https://calmforest.cloud/api/plaza?season=harvest-2026';
const res = await fetch(URL_, { signal: AbortSignal.timeout(10_000) });
if (!res.ok) throw new Error(`/api/plaza ${res.status}`);
const p = await res.json();
if (!p.active || !Array.isArray(p.items)) throw new Error(`season not active: ${JSON.stringify(p).slice(0, 200)}`);

const cur = p.items.filter((i) => i.stage === p.stage);
const have = cur.reduce((s, i) => s + Math.min(i.have, i.need), 0);
const need = cur.reduce((s, i) => s + i.need, 0);
const kst = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
const snap = { asOf: kst, stage: p.stage, have, need, pct: need > 0 ? Math.round((have / need) * 100) : 100, donors: p.donors, endsAt: p.ends_at };

await writeFile(new URL('../src/plazaSnapshot.json', import.meta.url), JSON.stringify(snap, null, 2) + '\n');
console.log('plazaSnapshot.json', snap);
