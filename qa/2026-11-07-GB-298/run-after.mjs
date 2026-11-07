// run-after.mjs: sequential after-fix for GB-298 (probe, page-load, t215, t95, shots)
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runs = [
  ['probe', ['node', 'qa/2026-11-07-GB-298/probe.mjs', 'after']],
  ['page-load', ['node', 'qa/2026-11-07-GB-298/page-load.mjs']],
  ['t215-t95', ['node', 'tools/tests/run-all.mjs', 't215', 't95', '--jobs', '1']],
  ['shots', ['node', 'qa/2026-11-07-GB-298/shots.mjs']],
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