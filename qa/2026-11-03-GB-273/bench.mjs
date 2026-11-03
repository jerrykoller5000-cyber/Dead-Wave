import { spawnSync } from 'node:child_process';
const run = (args) => { console.log('\n=== node ' + args.join(' ')); const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); console.log('=== exit ' + r.status); return r.status; };
for (let i = 0; i < 2; i++) {
  run(['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof-all', '--query', 'wallcull=0', '--eval', 'qa/2026-11-03-GB-273/probe.js']);
  run(['tools/bench.mjs', '--night', '20', '--gfx', 'high', '--prof-all', '--eval', 'qa/2026-11-03-GB-273/probe.js']);
}
