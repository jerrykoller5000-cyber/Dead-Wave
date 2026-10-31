// CU-193: the slot's state file is replaced with a retry, because Windows EPERM on the
// delete used to throw before the rename was ever tried.
import assert from 'node:assert/strict';
import test from 'node:test';
import { installStateFile } from '../../tools/game-test-slot.mjs';

function perm() {
  const error = new Error('perm');
  error.code = 'EPERM';
  return error;
}

test('retries EPERM on the delete and then on the rename', async () => {
  let unlinks = 0, renames = 0, waits = 0, copies = 0;
  await installStateFile('temp', 'dest', 'backup', {
    windows: true,
    waitMs: 0,
    copyFile: async () => { copies += 1; },
    unlink: async () => { unlinks += 1; if (unlinks < 3) throw perm(); },
    rename: async () => { renames += 1; if (renames < 2) throw perm(); },
    delay: async () => { waits += 1; },
  });
  // Two deletes refused, then a delete that sticks and a rename refused, then both succeed.
  assert.equal(unlinks, 4);
  assert.equal(renames, 2);
  assert.equal(copies, 4);
  assert.equal(waits, 3);
});

test('a non-retryable error stops and the temp is removed', async () => {
  let temps = 0;
  const error = new Error('no');
  error.code = 'ENOENT';
  await assert.rejects(
    () => installStateFile('temp', 'dest', 'backup', {
      windows: true,
      waitMs: 0,
      copyFile: async () => {},
      unlink: async () => {},
      rename: async () => { throw error; },
      delay: async () => { throw new Error('should not wait'); },
    }),
    (e) => e.code === 'ENOENT',
  );
  // The rejection above doesn't count the temp unlink. Run it again with a counter.
  await assert.rejects(
    () => installStateFile('temp', 'dest', null, {
      windows: false,
      copyFile: async () => { throw new Error('no backup'); },
      unlink: async (p) => { if (p === 'temp') temps += 1; },
      rename: async () => { const e = new Error('no'); e.code = 'ENOENT'; throw e; },
      delay: async () => {},
    }),
  );
  assert.equal(temps, 1);
});
