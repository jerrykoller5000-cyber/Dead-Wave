import fs from 'fs'; import { execFileSync } from 'child_process';
const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g; let m, k = 0, bad = 0;
while ((m = re.exec(html))) {
  const body = m[2]; if (body.trim().length < 50) continue; k++;
  const isMod = /type=["']module/.test(m[1]); const f = `qa/2026-11-02-GB-253/inline${k}.${isMod ? 'mjs' : 'js'}`;
  fs.writeFileSync(f, body);
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); console.log('ok', f, body.length); } catch (e) { bad++; console.log('FAIL', f, String(e.stderr).slice(0, 400)); }
  const names = new Map(); for (const d of body.matchAll(/^    (?:async )?(?:function\s+([A-Za-z0-9_$]+)|(?:const|let)\s+([A-Za-z0-9_$]+)\s*=)/gm)) { const n = d[1] || d[2]; names.set(n, (names.get(n) || 0) + 1); }
  const dups = [...names].filter(([, c]) => c > 1); console.log('  top-level dup names:', dups.length ? dups.map(([n, c]) => n + 'x' + c).join(', ') : 'none');
  fs.unlinkSync(f);
}
const lines = html.split('\n'); let run = 0; for (let i = 1; i < lines.length; i++) if (lines[i].trim().length > 40 && lines[i] === lines[i - 1]) run++;
console.log('adjacent duplicate lines (>40 chars):', run, 'bom:', html.charCodeAt(0) === 0xFEFF);
process.exit(bad ? 1 : 0);
