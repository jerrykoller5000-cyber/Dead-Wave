import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runs = [
  ['studio-after', ['node', 'qa/2026-11-07-GB-310/studio-shots.mjs', 'after']],
  ['page-load', ['node', 'qa/2026-11-07-GB-311/page-load.mjs']],
  ['t215-t95', ['node', 'tools/tests/run-all.mjs', 't215', 't95', '--jobs', '1']],
  ['tcl281', ['node', 'tools/tests/run-all.mjs', 'tcl281', '--jobs', '1']],
  ['fp-after', ['node', 'qa/2026-11-07-GB-310/fp-shots.mjs', 'after']],
];
let failed = 0;
for (const [name, cmd] of runs) {
  console.log('\n=== ' + name + ' ===');
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, stdio: 'inherit', env: process.env });
  const code = r.status == null ? 1 : r.status;
  console.log(name + ' exit ' + code);
  if (code !== 0) failed++;
}
process.exit(failed ? 1 : 0);
