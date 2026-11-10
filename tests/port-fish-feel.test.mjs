import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropPose, waitPose, bobberDip, liftPose, LIFT_END, DROP_END, DROP_REL, REST_ELEV, WAIT_ELEV } from '../js/port/fish-feel.js';

const close = (a, b, eps = 0.02) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('drop starts from the rest pose and settles low toward the water', () => {
  close(dropPose(0).elev, REST_ELEV);
  close(dropPose(DROP_END).elev, WAIT_ELEV, 0.05);
  assert.ok(DROP_REL < DROP_END);
});

test('drop raises the rod before flicking it down', () => {
  assert.ok(dropPose(0.2).elev > REST_ELEV);
  assert.ok(dropPose(DROP_REL + 0.03).elev < dropPose(0.2).elev);
});

test('bite pulls the rod tip down and dunks the bobber', () => {
  const calm = waitPose(0.087, false), bite = waitPose(0.087, true);
  assert.ok(bite.elev < calm.elev);
  assert.ok(bite.tip > calm.tip);
  assert.ok(bobberDip(0.087, true) < bobberDip(0.087, false));
});

test('early tap only twitches the rod upward', () => {
  assert.ok(waitPose(1, false, 1).elev > waitPose(1, false, 0).elev);
});




test('castTarget lands between 2.2 and 3 m from the boat toward the spot', async () => {
  const { castTarget } = await import('../js/port/fish-feel.js');
  const far = castTarget({ x: 10, z: 0 }, { x: 0, z: 0 }, 0);
  close(far.x, 3); close(far.z, 0);
  const near = castTarget({ x: 1.8, z: 0 }, { x: 0, z: 0 }, 0);
  close(near.x, 2.2);
  const onTop = castTarget({ x: 0.3, z: 0 }, { x: 0, z: 0 }, Math.PI / 2);
  close(onTop.x, 2.2); close(onTop.z, 0);
});

test('rest pose holds the rod over the right shoulder, the drop ends in a forward grip', async () => {
  const { REST_POSE, SHOULDER, gripArms, dropPose, DROP_END } = await import('../js/port/fish-feel.js');
  assert.deepEqual(REST_POSE.armR, SHOULDER.armR);
  assert.equal(REST_POSE.side, SHOULDER.side);
  const end = dropPose(DROP_END);
  end.armR.forEach((v, i) => close(v, gripArms(end.armUp).armR[i]));
  close(end.side, 0);
});

test('lift goes from low to high and returns the rod to the shoulder with the fish landed', async () => {
  const { SHOULDER } = await import('../js/port/fish-feel.js');
  const start = liftPose(0), end = liftPose(LIFT_END);
  close(start.pose.elev, WAIT_ELEV, 0.05);
  close(end.pose.elev, REST_ELEV, 0.05);
  assert.equal(start.fish.phase, 'water');
  assert.equal(end.fish.phase, 'land');
  assert.equal(end.fish.k, 1);
  let peak = -Infinity;
  for (let t = 0; t <= LIFT_END; t += 0.02) peak = Math.max(peak, liftPose(t).pose.elev);
  assert.ok(peak > 2, `peak ${peak}`);
  end.pose.armR.forEach((x, i) => close(x, SHOULDER.armR[i]));
});

test('bezier through a point above the head clears the head at the midpoint', async () => {
  const { bezierPoint } = await import('../js/port/fish-feel.js');
  const from = { x: 2.6, y: 0, z: 0 }, over = { x: -0.7, y: 3.9, z: 0 }, deck = { x: -0.78, y: 0.42, z: 0 };
  for (let k = 0; k <= 1.0001; k += 0.05) {
    const p = bezierPoint(from, over, deck, k);
    const msg = `k=${k.toFixed(2)} y=${p.y.toFixed(2)} x=${p.x.toFixed(2)}`;
    if (Math.abs(p.x) < 0.35) assert.ok(p.y > 1.9, msg);
    else if (Math.abs(p.x) < 0.5) assert.ok(p.y > 1.2, msg);
  }
});
