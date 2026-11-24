import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerTravel } from './player-travel.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, a + ' vs ' + b);

function drive(travel, hz, seconds, x, z, speed, wish = 25, follow = 18, sideWish = 55, sideFollow = 24) {
  let dx = 0, dz = 0;
  for (let i = 0; i < Math.round(seconds * hz); i++) {
    travel.step(1 / hz, x, z, speed, wish, follow, sideWish, sideFollow);
    dx += travel.dx; dz += travel.dz;
  }
  return [dx,dz];
}

test('a held input, corner, reversal and release cover the same distance across frame rates', () => {
  const sample = hz => {
    const p = new PlayerTravel();
    return [
      ...drive(p,hz,1,0,1,16),
      ...drive(p,hz,.5,1,0,5.28),
      ...drive(p,hz,.5,-1,0,5.28),
      ...drive(p,hz,1,1,0,0,55,24),
      p.vx,p.vz,p.wishX,p.wishZ
    ];
  };
  const expected = sample(120);
  for (const hz of [20,30,60,90,144]) sample(hz).forEach((value,i) => close(value,expected[i]));
});

test('the first step is gentle, the held sprint reaches pace, and its braking distance is below one metre', () => {
  const p = new PlayerTravel();
  p.step(1/60,0,1,16,25,18);
  assert.ok(p.dz > 0 && p.dz < 0.01);
  drive(p,60,2,0,1,16);
  close(p.vz,16);
  const [, stop] = drive(p,60,2,1,0,0,55,24);
  close(stop,16*(1/55 + 1/24));
  assert.ok(stop < 1);
});

test('a planted turn sheds the previous heading without slowing acceleration along the new one', () => {
  const corner = new PlayerTravel(), start = new PlayerTravel();
  corner.vz = corner.wishZ = 16;
  const [side,overrun] = drive(corner,60,1,1,0,5.28);
  const [straight] = drive(start,60,1,1,0,5.28);
  close(side,straight);
  assert.ok(overrun > 0 && overrun < 1);
});

test('the response rotates with the input and has no diagonal speed bonus', () => {
  for (const [x,z] of [[0,-1],[-1,0],[Math.SQRT1_2,Math.SQRT1_2]]) {
    const p = new PlayerTravel();
    drive(p,60,2,x,z,4.1);
    close(p.vx,4.1*x);close(p.vz,4.1*z);
  }
});

test('equal response rates and a zero-length step preserve the analytic solution', () => {
  const p = new PlayerTravel();
  p.step(.1,0,1,9,20,20);
  close(p.wishZ,9*(1-Math.exp(-2)));
  close(p.vz,9*(1-3*Math.exp(-2)));
  const old = [p.wishZ,p.vz];
  p.step(0,0,1,0,20,20);
  close(p.dz,0);close(p.dx,0);close(p.wishZ,old[0]);close(p.vz,old[1]);
});
