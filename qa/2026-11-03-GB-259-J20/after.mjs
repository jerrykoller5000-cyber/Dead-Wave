import { spawnSync } from 'node:child_process';
const run = (args) => { console.log('\n=== node ' + args.join(' ')); const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); console.log('=== exit ' + r.status); return r.status; };
run(['tools/tests/run-all.mjs', 't215', 't95', 't277', 't284', 'tcl281', '--jobs', '1', '--all-fails']);
run(['tools/realtest.mjs', 'tcl281']);
run(['tools/realtest.mjs', 't277']);
run(['tools/smoke-real.mjs']);
