import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_TESTS = [
  't37', 't50', 't59', 't96', 't116', 't124', 't126', 't193', 't209', 't223', 't253', 't266', 't268',
  't74', 't75', 't76', 't91', 't99', 't206', 't222', 't244',
];

const extra = process.argv.slice(2).filter((x) => /^t\d+/.test(x));
const tests = [...new Set(extra.length ? extra : DEFAULT_TESTS)].filter((t) =>
  fs.existsSync(path.join('tools', 'tests', `${t}.js`))
);

const outDir = path.join('qa', '2026-10-20-AG-103');
fs.mkdirSync(outDir, { recursive: true });
const logFile = path.join(outDir, 'fixed-reds.log');
fs.writeFileSync(logFile, `# AG-103 Targeted Fixed Reds: ${tests.join(' ')}\n# Started: ${new Date().toISOString()}\n\n`, 'utf8');

const args = [
  'tools/tests/run-all.mjs',
  ...tests,
  '--agent', 'antigravity',
  '--task', 'AG-103',
  '--checks', `AG-103 targeted fixed reds (${tests.length} checks)`,
  '--minutes', '40',
  '--all-fails',
];

const child = spawn(process.execPath, args, {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

child.stdout.on('data', (buf) => {
  const str = buf.toString('utf8');
  process.stdout.write(str);
  fs.appendFileSync(logFile, str, 'utf8');
});

child.stderr.on('data', (buf) => {
  const str = buf.toString('utf8');
  process.stderr.write(str);
  fs.appendFileSync(logFile, str, 'utf8');
});

child.on('exit', (code, signal) => {
  const footer = `\n# Finished: ${new Date().toISOString()} code=${code} signal=${signal || 'none'}\n`;
  fs.appendFileSync(logFile, footer, 'utf8');
  process.exit(code ?? 1);
});
