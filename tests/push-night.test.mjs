// 🔔 푸시 🦝 밤손님 예고 — 판정 로직을 API 와 cron 이 함께 쓰도록 꺼낸 순수 함수들
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeNight, seededRolls } from '../functions/api/_night-judge.js';
import { onRequestPost as nightVisit } from '../functions/api/night-visit.js';
import { computeNightDefense } from '../js/duel/night-defense.js';

const SECRET = 'test-secret';
const UID = '11111111-2222-3333-4444-555555555555';

test('seededRolls — 같은 uid·date 면 같은 난수열(0~1)', async () => {
  const a = await seededRolls(SECRET, UID, '2026-10-13', 8);
  const b = await seededRolls(SECRET, UID, '2026-10-13', 8);
  assert.deepEqual(a, b);
  assert.equal(a.length, 8);
  assert.ok(a.every(r => r >= 0 && r < 1));
  assert.notDeepEqual(a, await seededRolls(SECRET, UID, '2026-10-14', 8));
});

// 리팩토링 전(origin/main e88db6a) night-visit.js 원본으로 뽑은 결과 — '-'=안 옴, 그 외 동물 첫 글자+털린 밭 인덱스
//   (30일 × 방어 4조합: 없음·허수아비·울타리·둘 다). 판정 규칙을 바꾸면 이 값이 깨져야 정상이다.
const GOLDEN = '- - - - r2 r2 r2 r2 - - - - r1 r1 r1 - b1 - - - - - - - - - - - b21 - - - b0 b0 b0 b0 b021 b02 b02 - - - - - r210 r21 r21 - r12 r1 r1 r1 r210 r21 r21 r2 - - - - - - - - - - - - r021 r02 r02 r0 r021 r02 r02 - b102 b10 b10 - b120 b12 b12 b1 - - - - r20 - - - - - - - b12 - - - r01 r0 r0 r0 r012 - - - - - - - r01 r0 r0 r0 b021 b02 b02 b0'.split(' ');
const encode = r => r.visited ? r.animal[0] + r.stolenIdx.join('') : '-';
const DEFENSES = [{}, { scarecrow: true }, { fence: true }, { scarecrow: true, fence: true }];

test('judgeNight 과 /api/night-visit 은 리팩토링 전 원본 결과와 같다', async () => {
  const plots = [{ crop: 'carrot' }, { crop: 'potato' }, { crop: 'wheat' }];
  let k = 0;
  for (let d = 1; d <= 30; d++) {
    const date = `2026-11-${String(d).padStart(2, '0')}`;
    for (const defense of DEFENSES) {
      const req = new Request('https://x/api/night-visit', { method: 'POST',
        body: JSON.stringify({ uid: UID, date, nights: 1, plots, defense }) });
      const api = await (await nightVisit({ request: req, env: { NIGHT_SEED_SECRET: SECRET } })).json();
      const j = await judgeNight({ secret: SECRET, uid: UID, date, plotCount: plots.length,
        scarecrow: !!defense.scarecrow, fence: !!defense.fence, blocked: [] });
      assert.equal(encode(api), GOLDEN[k], `api ${date} ${JSON.stringify(defense)}`);
      assert.equal(encode(j), GOLDEN[k], `judge ${date} ${JSON.stringify(defense)}`);
      k++;
    }
  }
});

test('judgeNight — 두 동물 다 휴전이면 안 온다', async () => {
  for (let d = 1; d <= 20; d++) {
    const j = await judgeNight({ secret: SECRET, uid: UID, date: `2026-12-${String(d).padStart(2, '0')}`,
      plotCount: 2, scarecrow: false, fence: false, blocked: ['raccoon', 'boar'] });
    assert.equal(j.visited, false);
  }
});

test('computeNightDefense — 심은 밭 9칸 안 허수아비 1개 / 울타리 4개 이상', () => {
  const cands = [{ x: 0, z: 0 }];
  assert.deepEqual(computeNightDefense(cands, []), { scarecrow: false, fence: false });
  assert.equal(computeNightDefense(cands, [{ id: 'scarecrow', x: 5, z: 5 }]).scarecrow, true);
  assert.equal(computeNightDefense(cands, [{ id: 'scarecrow', x: 9, z: 0 }]).scarecrow, false, '반경 9 미만만');
  const fences = n => Array.from({ length: n }, (_, i) => ({ id: 'fence', x: i, z: 1 }));
  assert.equal(computeNightDefense(cands, fences(3)).fence, false);
  assert.equal(computeNightDefense(cands, fences(4)).fence, true);
  assert.equal(computeNightDefense(cands, [...fences(3), { id: 'gravefence', x: 1, z: 1 }]).fence, false, '🎃 묘비 울타리는 방어가 아니다');
  assert.deepEqual(computeNightDefense([], [{ id: 'scarecrow', x: 0, z: 0 }]), { scarecrow: false, fence: false });
  assert.deepEqual(computeNightDefense(cands, null), { scarecrow: false, fence: false }, '옛 세이브(outdoor 없음)');
});
