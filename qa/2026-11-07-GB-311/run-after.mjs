// qa/2026-11-07-GB-311/run-after.mjs: GB-311 after-edit checks, one at a time (page-load, t215, t95, tcl281, shots)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runs = [
  ['page-load', ['node', 'qa/2026-11-07-GB-311/page-load.mjs']],
  ['t215-t95', ['node', 'tools/tests/run-all.mjs', 't215', 't95', '--jobs', '1']],
  ['tcl281', ['node', 'tools/tests/run-all.mjs', 'tcl281', '--jobs', '1']],
  ['shots-shotgun', ['node', 'qa/2026-11-07-GB-311/shots.mjs', 'shotgun', 'after']],
  ['shots-ak', ['node', 'qa/2026-11-07-GB-311/shots.mjs', 'ak', 'after']],
];
let failed = 0;
for (const [name, cmd] of runs) {
  console.log('\n=== ' + name + ' ===');
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: 'inherit', env: process.env, shell: false });
  const code = r.status == null ? 1 : r.status;
  console.log(name + ' exit ' + code);
  if (code !== 0) failed++;
}
process.exit(failed ? 1 : 0);