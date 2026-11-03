// Capture the real-renderer stage-3 check under the single shared game-test slot.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const child = spawn(process.execPath, ['tools/realtest.mjs', 'tcl281'], {
  cwd: root, env: process.env, stdio: ['inherit', 'pipe', 'pipe']
});
let output = '';
for (const stream of [child.stdout, child.stderr]) stream.on('data', (chunk) => { output += chunk.toString(); });
const code = await new Promise((resolve) => child.on('close', resolve));
fs.writeFileSync(path.join(root, 'review/GP-20016/tcl281-real.log'), output, 'utf8');
const lines = output.split(/\r?\n/).filter((line) => /^(FAIL|ok  |1 checks:)/.test(line.trim()));
console.log(lines.join('\n'));
if (code || !/1 checks: \d+ pass, 0 fail \(real renderer\)/.test(output)) process.exitCode = 1;
