import { spawnSync } from 'node:child_process';
const run = (args) => { console.log('\n=== node ' + args.join(' ')); const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); console.log('=== exit ' + r.status); return r.status; };
run(['--test', 'game/wall-cull.test.mjs']);
run(['tools/realtest.mjs', 'tgb273']);
run(['tools/tests/run-all.mjs', 'tgb273', 't215', 't95', 't329', 't80', '--jobs', '1', '--all-fails']);
run(['tools/smoke-real.mjs']);
run(['qa/2026-11-03-GB-273/run-probe.mjs']);