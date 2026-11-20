// qa/2026-11-17-AG-345-cb345d/run-witness.mjs
// Run ONE --inspect --onscreen --nofreeze witness of review/CB-343/native-job.json via tools/camera-cb345d.mjs
// inside the active crew game-test slot (inherits DW_GAME_TEST_TOKEN), guaranteeing `stop` runs in finally.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside crew game-test slot (DW_GAME_TEST_TOKEN required)');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const LOG_PATH = path.join(ROOT, 'qa', '2026-11-17-AG-345-cb345d', 'witness.log');
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });

const chunks = [];
function runStep(label, args) {
  const header = `\n=== ${label}: node ${args.join(' ')} (${new Date().toISOString()}) ===\n`;
  chunks.push(header);
  process.stdout.write(header);
  const res = spawnSync(process.execPath, args, { cwd: ROOT, env: process.env, encoding: 'utf8' });
  if (res.stdout) {
    chunks.push(res.stdout);
    process.stdout.write(res.stdout);
  }
  if (res.stderr) {
    chunks.push('[stderr]\n' + res.stderr);
    process.stderr.write(res.stderr);
  }
  if (res.error) {
    const msg = `[spawnError] ${res.error.message}\n`;
    chunks.push(msg);
    process.stderr.write(msg);
  }
  const footer = `[exit ${res.status ?? 'null'} signal=${res.signal ?? 'none'}]\n`;
  chunks.push(footer);
  process.stdout.write(footer);
  return res.status ?? 1;
}

const task = process.argv[2] || 'AG-345';
let startCode = 1;
let batchCode = null;
let stopCode = null;
try {
  startCode = runStep('START', ['tools/camera-cb345d.mjs', 'start', '--inspect', '--onscreen', '--nofreeze', '--agent', 'antigravity', '--task', task]);
  if (startCode === 0) {
    batchCode = runStep('BATCH', ['tools/camera-cb345d.mjs', 'batch', 'review/CB-343/native-job.json', '--agent', 'antigravity', '--task', task]);
  }
} finally {
  stopCode = runStep('STOP', ['tools/camera-cb345d.mjs', 'stop', '--agent', 'antigravity', '--task', task]);
  fs.writeFileSync(LOG_PATH, chunks.join(''), 'utf8');
}

process.exit(startCode !== 0 ? startCode : (batchCode !== 0 ? batchCode : (stopCode !== 0 ? stopCode : 0)));
