// Capture the real-renderer stage-2 check without losing the rifle geometry lines to terminal truncation.
// Run only via crew/crew.mjs slot run chatgpt GP-20012.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const log = path.join(root, 'review/GP-20012/tcl281-real.log');
const child = spawn(process.execPath, ['tools/realtest.mjs', 'tcl281', '--all'], {
  cwd: root, env: process.env, windowsHide: true
});
let output = '';
for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk.toString('utf8'); });
const code = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('close', resolve);
});
fs.writeFileSync(log, output, 'utf8');
for (const line of output.split(/\r?\n/)) {
  if (/forearm|elbow|FAIL|checks:/.test(line)) console.log(line);
}
console.log('Full UTF-8 log:', path.relative(root, log));
if (code || /^\s*FAIL\b/m.test(output)) process.exitCode = code || 1;
