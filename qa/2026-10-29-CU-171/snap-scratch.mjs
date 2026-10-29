// CU-171: a snapshot of the current working tree (tracked + untracked, not ignored) outside the repo.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const repo = 'C:/Users/Zero/Desktop/Tiny Trek';
const dest = process.argv[2];
const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: repo, maxBuffer: 1 << 28 }).toString('utf8').split('\0').filter(Boolean);
const keep = (f) => f === 'index.html' || f === 'package.json' || /^(core|game|combat|studio|world|ui|vendor|assets|z-music|z-sounds)\//.test(f) || /^tools\/[^/]+\.mjs$/.test(f);
let n = 0, bytes = 0;
for (const f of out) {
  if (!keep(f)) continue;
  const src = path.join(repo, f);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(dest, f);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  n++; bytes += fs.statSync(dst).size;
}
fs.mkdirSync(path.join(dest, 'crew'), { recursive: true });
fs.writeFileSync(path.join(dest, 'crew', 'LOG.md'), '');
console.log('copied', n, 'files', (bytes / 1048576).toFixed(0), 'MB to', dest);
