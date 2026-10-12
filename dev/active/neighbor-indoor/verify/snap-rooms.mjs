// 🏠 내 집 실내 스냅숏(단계 3·5·6·7 모던·7 한옥) → stdout JSON. buildRoomWith 리팩터링 전후 diff 로 동치 확인
import { open, SNAP_ROOMS } from './harness.mjs';

const CASES = ['house=3', 'house=5', 'house=6', 'house=7&style=modern', 'house=7&style=hanok'];
const out = {};
const h = await open();
for (const c of CASES) {
  await h.enterGame(c);
  await h.b.sleep(2000);
  const r = await h.ev(SNAP_ROOMS);
  out[c] = r.startsWith?.('{') ? JSON.parse(r) : r;
}
await h.close();
console.log(JSON.stringify(out, null, 1));
process.exit(0);
