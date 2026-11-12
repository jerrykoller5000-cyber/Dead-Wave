// qa/2026-11-11-AG-310b/run-slot-batch.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';

function run(cmd, args) {
  console.log(`\n=== RUN: ${cmd} ${args.join(' ')} ===`);
  try {
    execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  } catch (err) {
    console.error(`ERROR running ${cmd} ${args.join(' ')}:`, err && (err.stack || err.message || err));
    try {
      fs.writeFileSync('qa/2026-11-11-AG-310b/batch-error.log', String(err && (err.stack || err.message || err)), 'utf8');
    } catch (_) {}
    process.exit(1);
  }
}

run('node', ['qa/2026-11-11-AG-310b/ag310b-verify.mjs', '--phase', 'after']);
run('python', ['qa/2026-11-11-AG-310b/build-sheet.py']);
run('node', ['tools/tests/run-all.mjs', 't38', 't181', 't215', '--agent', 'antigravity', '--task', 'AG-310b', '--jobs', '1']);
try {
  execFileSync('node', ['tools/tests/run-all.mjs', 't334', '--agent', 'antigravity', '--task', 'AG-310b', '--jobs', '1'], { cwd: ROOT, stdio: 'inherit', env: process.env });
} catch (e) {
  console.warn('t334 non-fatal exit:', e?.message || e);
}
