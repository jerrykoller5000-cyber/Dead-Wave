// qa/2026-11-11-CC-343c/run-slot-batch.mjs
import { execFileSync } from 'node:child_process';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const steps = [
  ['node', ['qa/2026-11-11-AG-311/retake-impact-shot.mjs']],
  ['python', ['qa/2026-11-11-AG-311/build-sheets.py']],
  ['node', ['qa/2026-11-11-CC-343c/cc343c-verify.mjs']],
  ['python', ['qa/2026-11-11-CC-343c/build-cc343c-sheet.py']]
];

for (const [cmd, args] of steps) {
  console.log(`\n=== RUNNING: ${cmd} ${args.join(' ')} ===`);
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
}
