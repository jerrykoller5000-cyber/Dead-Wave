// One test-page batch, with quarter walls on, under the crew game-test lease.
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('run through the shared game-test slot');
const root = resolve(import.meta.dirname, '..', '..');
const result = spawnSync(process.execPath,
  ['tools/tests/run-all.mjs', 't318', 't320', '--jobs', '1', '--all-fails', '--no-retry',
   '--agent', 'chatgpt', '--task', 'GP-20008', '--checks', 'quarter-wall sightlines and dead walking'],
  { cwd:root, env:{...process.env,DW_TEST_QUERY:'quarterwalls=1'},
    encoding:'utf8', timeout:420000, maxBuffer:8*1024*1024 });
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');
if (result.status !== 0) throw new Error(`targeted tests failed: ${result.error || result.status}`);
