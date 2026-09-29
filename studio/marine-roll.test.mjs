import test from 'node:test';
import assert from 'node:assert/strict';
import { rollTravel, rollAxisLocal } from './marine-roll.js';

const near = (a,b) => assert(Math.abs(a-b)<1e-10, `${a} != ${b}`);
test('eight movement keys give eight normalized camera-relative roll directions', () => {
  for(const [f,s,x,z] of [[1,0,0,1],[-1,0,0,-1],[0,1,1,0],[0,-1,-1,0],
    [1,1,Math.SQRT1_2,Math.SQRT1_2],[1,-1,-Math.SQRT1_2,Math.SQRT1_2],
    [-1,1,Math.SQRT1_2,-Math.SQRT1_2],[-1,-1,-Math.SQRT1_2,-Math.SQRT1_2]]) {
    const v=rollTravel(f,s,0,0);near(v.x,x);near(v.z,z);near(Math.hypot(v.x,v.z),1);
    const axis=rollAxisLocal(v.x,v.z,0);near(axis.x,z);near(axis.z,-x);
  }
});
test('camera rotation changes travel, no held direction uses aim', () => {
  let d=rollTravel(1,0,Math.PI/2,0);near(d.x,1);near(d.z,0);
  d=rollTravel(0,1,Math.PI/2,0);near(d.x,0);near(d.z,-1);
  d=rollTravel(0,0,Math.PI/3,Math.PI/4);near(d.x,Math.SQRT1_2);near(d.z,Math.SQRT1_2);
});
test('side roll stays sideways, backward roll reverses and diagonals tilt on both axes', () => {
  const forward=rollAxisLocal(0,1,0),back=rollAxisLocal(0,-1,0);
  const right=rollAxisLocal(1,0,0),left=rollAxisLocal(-1,0,0);
  near(forward.x,1);near(back.x,-1);near(right.z,-1);near(left.z,1);
  const diagonal=rollAxisLocal(Math.SQRT1_2,Math.SQRT1_2,0);
  near(diagonal.x,Math.SQRT1_2);near(diagonal.z,-Math.SQRT1_2);
});
test('turning aim mid-roll preserves the chosen world travel axis', () => {
  // World right is local right at yaw 0, then local forward at yaw 90 degrees.
  const a=rollAxisLocal(1,0,0),b=rollAxisLocal(1,0,Math.PI/2);
  near(a.x,0);near(a.z,-1);near(b.x,1);near(b.z,0);
});
