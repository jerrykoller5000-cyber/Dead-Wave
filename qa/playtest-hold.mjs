// Keeps Jerry's playtest hold alive. A bare `hold` exits on this PC because
// the signal wait does not keep Node's event loop running.
import { defaultGameTestSlot } from '../tools/game-test-slot.mjs';

setInterval(() => {}, 60_000);
const queued = await defaultGameTestSlot.request({
  agent: 'jerry',
  task: 'PLAYTEST',
  checks: 'Jerry playtest, agents stay off the machine',
  command: 'manual hold',
  waitPid: process.pid,
  priority: 'jerry',
});
await defaultGameTestSlot.waitForGrant(queued.token);
console.log('HOLDING jerry PLAYTEST pid ' + process.pid);
