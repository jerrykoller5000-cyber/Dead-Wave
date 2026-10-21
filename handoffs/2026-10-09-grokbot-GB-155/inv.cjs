// GB-155 inventory: every form of the old name, case-insensitive, outside history.
const fs = require('fs'), path = require('path');
const ROOT = process.cwd();
const RE = /dead[\s_\-]?wave/gi;
const SKIP_DIR = new Set(['node_modules', '.git', 'archive', 'handoffs']);
const SKIP_FILE = (rel) => /^crew[\\/]LOG\.md$/i.test(rel) || /^review[\\/].*notes.*\.md$/i.test(rel) || /^tools[\\/]tests[\\/]test-\d+\.html$/.test(rel);
const BIN = /\.(png|jpe?g|gif|webp|glb|gltf|bin|mp3|ogg|wav|zip|ico|woff2?|ttf|otf|mp4|webm|pdf|psd|blend|fbx)$/i;
const out = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
  const p = path.join(d, e.name), rel = path.relative(ROOT, p);
  if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) walk(p); continue; }
  if (BIN.test(e.name) || SKIP_FILE(rel)) continue;
  let s; try { const st = fs.statSync(p); if (st.size > 8e6) continue; s = fs.readFileSync(p, 'utf8'); } catch { continue; }
  const lines = s.split('\n');
  lines.forEach((l, i) => { const m = l.match(RE); if (m) out.push(`${rel}:${i + 1}: [${m.join(',')}] ${l.trim().slice(0, 170)}`); });
} };
walk(ROOT);
const mode = process.argv[2];
if (mode === 'files') { const c = {}; for (const o of out) { const f = o.split(':')[0]; c[f] = (c[f] || 0) + 1; } for (const [f, n] of Object.entries(c).sort((a, b) => b[1] - a[1])) console.log(n + '\t' + f); }
else console.log(out.join('\n'));
