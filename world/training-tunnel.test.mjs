// world/training-tunnel.test.mjs — CL-171: the dark holding tunnel behind the Training Ground's gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import { TUNNEL, tunnelLine, veilsInFront, tunnelShows, cameraInRoom, tunnelDepth, buildTrainingTunnel } from './training-tunnel.js';

const passage = { x: 10, wallZ: 50, halfWidth: 3.3, height: 6.3 };

test('the line: one behind the other down the middle, starting out of sight, bigger bodies given more room', () => {
  const line = tunnelLine(passage, [0.42, 0.42, 1.05, 0.42]);
  assert.ok(line.every((p) => p.x === passage.x), 'single file');
  assert.ok(tunnelDepth(passage, line[0].z) > TUNNEL.showDepth, 'the first starts walking where it cannot be seen');
  for (let i = 1; i < line.length; i++) assert.ok(line[i].z - line[i - 1].z >= TUNNEL.minGap - 1e-9);
  assert.ok(line[2].z - line[1].z > line[1].z - line[0].z, 'a colossus needs more room');
});

test('deeper in, more veils in front; past the last one nothing shows, and nothing shows to a camera outside the room', () => {
  assert.equal(veilsInFront(0), 0);
  assert.ok(veilsInFront(2) > veilsInFront(1));
  assert.equal(veilsInFront(TUNNEL.showDepth), TUNNEL.veils, 'every veil is in front before it stops being drawn');
  assert.equal(tunnelShows(1, true), true);
  assert.equal(tunnelShows(TUNNEL.showDepth + 0.1, true), false);
  assert.equal(tunnelShows(1, false), false);
  assert.equal(cameraInRoom(passage, 40), true);
  assert.equal(cameraInRoom(passage, 50), false, 'level with the wall: outside');
  assert.equal(cameraInRoom(passage, 60), false);
});

test('every face points into the tunnel or at the room, and it is shown only from the room side', () => {
  const t = buildTrainingTunnel(THREE, passage, 0);
  const g = t.group; g.updateMatrixWorld(true);
  const n = new THREE.Vector3(), c = new THREE.Vector3(passage.x, passage.height / 2, passage.wallZ + TUNNEL.length / 2), p = new THREE.Vector3();
  let faces = 0;
  g.traverse((o) => {
    if (!o.isMesh) return;
    faces++;
    n.set(0, 0, 1).applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()));
    o.getWorldPosition(p);
    if (o.material.transparent || o.material.color.getHex() === 0) assert.ok(n.z < -0.99, 'veils and the back face the room');
    else assert.ok(n.dot(c.clone().sub(p)) > 0, 'walls, floor and ceiling face inward');
  });
  assert.equal(faces, 5 + TUNNEL.veils);
  assert.equal(g.visible, false, 'hidden until the host says the camera is in the room');
  assert.equal(t.update(40), true); assert.equal(t.update(55), false);
  t.dispose();
});
