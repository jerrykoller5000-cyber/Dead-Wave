// J62 after: the probe and the tests that read gun models (test page), tcl281 on the real renderer,
// the launcher's view-gun ADS shot, and a real page load.
import { spawnSync } from 'node:child_process';
const run = (args) => { console.log('\n=== node ' + args.join(' ')); const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); console.log('=== exit ' + r.status); return r.status; };
run(['tools/tests/run-all.mjs', 'tj62', 't215', 't95', 't105', 't121', 't122', 't146', 't150', 't180', 't187', 't188', 't189', 't194', 't195', 't217', 't218', 't221', 't228', 't229', 't242', 't262', 't277', 't283', 't284', 't38', 'tcl281', '--jobs', '1', '--all-fails']);
run(['tools/realtest.mjs', 'tcl281']);
run(['tools/vmsheet.mjs', '--gun', 'launcher', '--only', 'ads', '--out', 'qa/2026-11-02-J62/after/launcher']);
run(['tools/smoke-real.mjs']);