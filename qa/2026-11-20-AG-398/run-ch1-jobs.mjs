import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const LOG_PATH = path.join(ROOT, 'qa', '2026-11-20-AG-398', 'run.log');
fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'w' });

function log(line) {
  const text = `[${new Date().toISOString()}] ${line}\n`;
  process.stdout.write(text);
  logStream.write(text);
}

function runCam(args) {
  log(`RUN: node tools/camera.mjs ${args.join(' ')}`);
  const res = spawnSync(process.execPath, ['tools/camera.mjs', ...args], {
    cwd: ROOT,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.stdout) {
    process.stdout.write(res.stdout);
    logStream.write(res.stdout);
  }
  if (res.stderr) {
    process.stderr.write(res.stderr);
    logStream.write(res.stderr);
  }
  log(`EXIT: ${res.status}`);
  return res.status ?? 1;
}

const common = ['--agent', 'antigravity', '--task', 'AG-398'];
let exitCode = 0;
try {
  let code = runCam(['start', '--training', '--onscreen', ...common]);
  if (code !== 0) throw new Error(`camera start failed with code ${code}`);

  code = runCam(['job', 'Claude outputs/CH-1-menus/job-CH1-training-menus.json', ...common]);
  if (code !== 0) {
    log(`WARNING: training job exited with code ${code}`);
    exitCode = code;
  }

  code = runCam(['reload', '--title', ...common]);
  if (code !== 0) throw new Error(`camera reload --title failed with code ${code}`);

  code = runCam(['job', 'Claude outputs/CH-1-menus/job-CH1-title-menus.json', ...common]);
  if (code !== 0) {
    log(`WARNING: title job exited with code ${code}`);
    if (!exitCode) exitCode = code;
  }
} catch (err) {
  log(`ERROR: ${err && err.stack ? err.stack : err}`);
  exitCode = 1;
} finally {
  runCam(['stop', ...common]);
  logStream.end();
}

process.exit(exitCode);
