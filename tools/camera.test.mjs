import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForCameraExit } from './camera.mjs';

test('camera stop waits until the detached daemon is proven gone', async () => {
  let checks = 0;
  await waitForCameraExit(1234, {
    interval: 1,
    timeout: 100,
    alive: () => ++checks < 4,
  });
  assert.equal(checks, 4);
});

test('camera stop times out instead of claiming an unproven exit', async () => {
  await assert.rejects(
    waitForCameraExit(1234, { interval: 1, timeout: 3, alive: () => true }),
    /did not exit/,
  );
});
