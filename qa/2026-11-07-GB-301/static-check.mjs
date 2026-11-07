import fs from 'fs';
import { execFileSync } from 'child_process';
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
let m, best = null, attrs = '';
while ((m = re.exec(html))) {
  if (/type=["']importmap/.test(m[1])) continue;
  if (m[2].trim().length < 50) continue;
  if (!best || m[2].length > best.length) { best = m[2]; attrs = m[1]; }
}
if (!best) { console.log('FAIL: no inline script'); process.exit(1); }
const isMod = /type=["']module/.test(attrs);
const f = `qa/2026-11-07-GB-301/inline-main.${isMod ? 'mjs' : 'js'}`;
fs.writeFileSync(f, best);
const bom = html.charCodeAt(0) === 0xFEFF;
console.log('extracted', f, 'chars', best.length, 'bom', bom);
// duplicate scan for helpers we care about
for (const name of ['sniperBoltPose', 'updateSniperBoltCycle', 'applySniperBoltCycle', 'poseRevolverCylinder']) {
  const n = (best.match(new RegExp('function ' + name + '\\b', 'g')) || []).length;
  console.log('dup', name, n);
  if (name.startsWith('sniper') && n !== 1) { console.log('FAIL dup', name); process.exitCode = 1; }
}
try {
  execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
  console.log('node --check PASS');
  if (!process.exitCode) process.exitCode = bom ? 1 : 0;
} catch (e) {
  console.log('node --check FAIL');
  process.exitCode = 1;
} finally {
  try { fs.unlinkSync(f); } catch (_) {}
}
