// GB-259b after: the probe and the tests that read gun models (test page), then t277/tcl281 on the real renderer,
// the revolver's view-gun ADS shot, and a real page load.
import { spawnSync } from 'node:child_process';
const run = (args) => { console.log('\n=== node ' + args.join(' ')); const r = spawnSync(process.execPath, args, { stdio: 'inherit' }); console.log('=== exit ' + r.status); return r.status; };
run(['tools/tests/run-all.mjs', 'tgb259b', 't215', 't95', 't105', 't121', 't122', 't146', 't150', 't180', 't187', 't188', 't189', 't194', 't195', 't217', 't218', 't221', 't228', 't229', 't242', 't262', 't277', 't283', 't284', 't38', 'tcl281', '--jobs', '1', '--all-fails']);
run(['tools/realtest.mjs', 't277', 'tcl281']);
run(['tools/vmsheet.mjs', '--gun', 'revolver', '--only', 'ads', '--out', 'qa/2026-11-02-GB-259b/after/revolver']);
run(['tools/smoke-real.mjs']);