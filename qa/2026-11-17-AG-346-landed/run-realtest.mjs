// qa/2026-11-17-AG-346-landed/run-realtest.mjs
// Run plain native realtest (t164 t340 t222 t93 --all) on landed index.html (668e97a3)
// inside the crew game-test slot and save exact verbatim stdout/stderr to review/CB-349/landed/realtest-668e97a3.log.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

if (!process.env.DW_GAME_TEST_TOKEN) {
  throw new Error('Must run inside crew game-test slot (DW_GAME_TEST_TOKEN required)');
}

const ROOT = 'C:/Users/Zero/Desktop/Tiny Trek';
const OUT_DIR = path.join(ROOT, 'review', 'CB-349', 'landed');
fs.mkdirSync(OUT_DIR, { recursive: true });

const idxMd5 = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, 'index.html'))).digest('hex').slice(0, 8);
assert.equal(idxMd5, '668e97a3', `Expected landed index.html md5 668e97a3, got ${idxMd5}`);

const res = spawnSync(process.execPath, ['tools/realtest.mjs', 't164', 't340', 't222', 't93', '--all'], {
  cwd: ROOT,
  env: process.env,
  encoding: 'utf8',
});

const raw = (res.stdout || '') + (res.stderr ? '\n[stderr]\n' + res.stderr : '');
fs.writeFileSync(path.join(OUT_DIR, 'realtest-668e97a3.log'), `index.html md5: ${idxMd5}\n` + raw, 'utf8');
if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);
process.exit(res.status ?? 1);
