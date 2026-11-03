// GB-259 run 2: the sight tests on the real renderer, then the pistol's and the Wasp's ADS after the sight fixes.
import { spawnSync } from 'node:child_process';
const run = (args) => { console.log('\n=== node ' + args.join(' ')); const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); console.log('=== exit ' + r.status); return r.status; };
run(['tools/realtest.mjs', 't277', 't284', 't279', 't291', 'tcl281']);
for (const g of ['pistol', 'uzi']) run(['tools/vmsheet.mjs', '--gun', g, '--only', 'ads', '--out', 'qa/2026-11-02-GB-259/after2/' + g]);