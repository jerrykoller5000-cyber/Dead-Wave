// CU-182: run checks with the stand-in three as it was before CU-181, inside one slot hold, and put the new one back.
//   node crew/crew.mjs slot run cursor CU-182 --checks "..." -- node qa/2026-10-30-CU-182/swap-run.mjs t111 t76
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..');
const live = path.join(root, 'tools', 'tests', 'fakethree.mjs');
const newer = fs.readFileSync(live);
const kept = path.join(dir, 'fakethree.after.mjs');
if (!fs.existsSync(kept)) fs.writeFileSync(kept, newer);
fs.copyFileSync(path.join(dir, '..', '2026-10-30-CU-181', 'fakethree.before.mjs'), live);
console.log('swap-run: tools/tests/fakethree.mjs is the CU-181 "before" for this run');
let code = 1;
try {
  code = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(root, 'tools', 'tests', 'run-all.mjs'), ...process.argv.slice(2), '--jobs', '1', '--all-fails'],
      { cwd: root, env: process.env, stdio: 'inherit' });
    child.on('exit', (c) => resolve(c ?? 1));
  });
} finally {
  fs.writeFileSync(live, newer);
  console.log('swap-run: the new fakethree.mjs is back (' + newer.length + ' bytes)');
}
process.exit(code);
