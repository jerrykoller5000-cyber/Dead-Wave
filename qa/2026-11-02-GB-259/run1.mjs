// GB-259 run 1: t277 and tcl281 on the real renderer, then the view gun's ADS shots for the KR-7, GW-4, pistol and Wasp.
import { spawnSync } from 'node:child_process';
const run = (args) => { console.log('\n=== node ' + args.join(' ')); const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); console.log('=== exit ' + r.status); return r.status; };
let bad = 0;
bad |= run(['tools/realtest.mjs', 't277', 'tcl281']);
for (const g of ['ak', 'm4', 'pistol', 'uzi']) run(['tools/vmsheet.mjs', '--gun', g, '--only', 'ads', '--out', 'qa/2026-11-02-GB-259/after/' + g]);
process.exit(bad ? 1 : 0);