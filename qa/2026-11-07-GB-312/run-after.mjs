// qa/2026-11-07-GB-312/run-after.mjs - after-edit: page-load, t215, t95, tcl281, after shots (one slot turn)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runs = [
  ['page-load', ['node', 'qa/2026-11-07-GB-312/page-load.mjs']],
  ['t215-t95', ['node', 'tools/tests/run-all.mjs', 't215', 't95', '--jobs', '1']],
  ['tcl281', ['node', 'tools/tests/run-all.mjs', 'tcl281', '--jobs', '1']],
  ['shots-after', ['node', 'qa/2026-11-07-GB-312/shots.mjs', 'after']],
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