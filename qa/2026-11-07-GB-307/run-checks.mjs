import { spawnSync } from 'node:child_process';
function run(cmd, args) {
  console.log('>', cmd, args.join(' '));
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true });
  return r.status || 0;
}
const a = run('node', ['qa/2026-11-07-GB-307/pistol-float.mjs']);
const b = run('node', ['tools/tests/run-all.mjs', 't333', '--agent', 'grokbot', '--task', 'GB-307', '--all-fails']);
process.exit(a || b);
