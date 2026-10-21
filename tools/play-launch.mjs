// Jerry's tracked manual game window. Play Dead-Wave.bat queues this command
// with Jerry priority; this process stays alive until its own Edge window closes.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import {
  assertGameTestSlot,
  registerGameTestProcess,
  releaseGameTestReservation,
  reserveGameTestProcess,
  unregisterGameTestProcess,
} from './game-test-slot.mjs';
import { ensureInspectorServer } from './inspector-launch.mjs';

await assertGameTestSlot();

if (process.platform !== 'win32') {
  throw new Error('The manual game launcher currently requires Windows Edge.');
}

const candidates = [
  process.env['ProgramFiles(x86)'],
  process.env.ProgramFiles,
  process.env.LOCALAPPDATA,
]
  .filter(Boolean)
  .map(dir => path.join(dir, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
const edge = candidates.find(file => fs.existsSync(file));
if (!edge) {
  throw new Error(
    'Edge was not found, so the queue cannot track Jerry’s manual game process safely.',
  );
}

const server = await ensureInspectorServer({ port: 8766 });
const token = process.env.DW_GAME_TEST_TOKEN;
const url =
  `${server.origin}/index.html?solid=1&__gameTestToken=${encodeURIComponent(token)}`;
const profile = path.join(os.tmpdir(), `dead-wave-game-${token.slice(0, 12)}`);
const reservationId = await reserveGameTestProcess('Jerry game Edge');
let browser;
try {
  browser = spawn(
    edge,
    [
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--force_high_performance_gpu',
      '--start-maximized',
      '--autoplay-policy=no-user-gesture-required',
      `--app=${url}`,
    ],
    { detached: false, windowsHide: false, stdio: 'ignore' },
  );
  await new Promise((resolve, reject) => {
    browser.once('spawn', resolve);
    browser.once('error', reject);
  });
} catch (error) {
  await releaseGameTestReservation();
  throw error;
}
try {
  await registerGameTestProcess(browser.pid, 'Jerry game Edge', undefined, reservationId);
} catch (error) {
  console.error('Game-window tracking failed; close the new Edge window to keep the slot safe.');
  if (browser.exitCode === null && browser.signalCode === null) {
    await new Promise(resolve => browser.once('exit', resolve));
  }
  await releaseGameTestReservation();
  throw error;
}
console.log(`Jerry game is holding the test slot until this Edge window closes: ${url}`);
await new Promise(resolve => browser.once('exit', resolve));
await unregisterGameTestProcess(browser.pid);
await fs.promises.rm(profile, { recursive: true, force: true }).catch(() => {});
