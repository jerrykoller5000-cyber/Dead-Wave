// qa/2026-11-11-AG-304/run-after-and-suite.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

function countLineEndings(filePath) {
  const buf = fs.readFileSync(filePath);
  let crlf = 0, lf = 0;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0a) {
      if (i > 0 && buf[i - 1] === 0x0d) crlf++;
      else lf++;
    }
  }
  return { crlf, lf };
}

// 1. Line-ending & syntax checks
const idxLE = countLineEndings('C:/Users/Zero/Desktop/Tiny Trek/index.html');
const vmLE = countLineEndings('C:/Users/Zero/Desktop/Tiny Trek/game/viewmodel.js');
console.log('[AG-304] index.html line endings:', idxLE);
console.log('[AG-304] game/viewmodel.js line endings:', vmLE);
assert.equal(idxLE.lf, 0, 'index.html must remain pure CRLF (lf: 0)');
assert.equal(vmLE.crlf, 0, 'game/viewmodel.js must remain pure LF (crlf: 0)');

execFileSync(process.execPath, ['--check', 'game/viewmodel.js'], { cwd: 'C:/Users/Zero/Desktop/Tiny Trek', stdio: 'inherit' });
execFileSync(process.execPath, ['--check', 'qa/2026-11-11-AG-304/ag304-bench.mjs'], { cwd: 'C:/Users/Zero/Desktop/Tiny Trek', stdio: 'inherit' });

const html = fs.readFileSync('C:/Users/Zero/Desktop/Tiny Trek/index.html', 'utf8');
const blocks = html.match(/<script type="module">([\s\S]*?)<\/script>/g);
const last = blocks[blocks.length - 1]
  .replace(/^<script[^>]*>|<\/script>$/g, '')
  .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"];?/gm, '// import')
  .replace(/^\s*export\s+/gm, '');
new vm.Script(`(async () => {\n${last}\n})`);
console.log('[AG-304] index.html inline script syntax OK (' + last.length + ' chars)');

if (process.argv.includes('--syntax-only')) process.exit(0);

// 2. Run AG-304 AFTER benchmark with --shots
execFileSync(process.execPath, ['qa/2026-11-11-AG-304/ag304-bench.mjs', '--tag=after', '--shots'], {
  cwd: 'C:/Users/Zero/Desktop/Tiny Trek',
  stdio: 'inherit',
  env: process.env
});

// 3. Run neighbor test suite tag296 (--jobs 1)
execFileSync(process.execPath, ['tools/tests/run-all.mjs', 'tag296', '--jobs', '1', '--agent', 'antigravity', '--task', 'AG-304'], {
  cwd: 'C:/Users/Zero/Desktop/Tiny Trek',
  stdio: 'inherit',
  env: process.env
});
