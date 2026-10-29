// fixmontage.mjs: point montage.mjs at the frames probe.mjs actually writes (<phase>/strips/<gun>-u<US>.png,
// with the probe's US in hundredths). Exact-line, hash-guarded, LF, no BOM.
import fs from 'node:fs';
import crypto from 'node:crypto';
const p = 'qa/2026-10-29-GB-245/montage.mjs';
const want = 'D3B2A9A0F0B2C7BE32D0D3C5B0B1A5B1A7C8E1F0A1B2C3D4E5F60718293A4B5C';
const s = fs.readFileSync(p, 'utf8');
if (!fs.existsSync(p + '.orig')) fs.writeFileSync(p + '.orig', s, { encoding: 'utf8' });
const before = s;
const a = 'const files = US.map((u) => `qa/2026-10-29-GB-245/${ph}/${g}-u${u}.png`);';
const b = 'const files = US.map((u) => `qa/2026-10-29-GB-245/${ph}/strips/${g}-u${u}.png`);';
if (s.split(a).length !== 2) throw new Error('files line not found exactly once');
let out = s.replace(a, b);
const c = 'writePng(`qa/2026-10-29-GB-245/${ph}/${g}-strip.png`, per[ph].w, per[ph].h, per[ph].data);';
const d = 'writePng(`qa/2026-10-29-GB-245/${ph}/strips/${g}-strip.png`, per[ph].w, per[ph].h, per[ph].data);';
if (out.split(c).length !== 2) throw new Error('writePng line not found exactly once');
out = out.replace(c, d);
if (!out.includes('\r') === false) throw new Error('CRLF appeared');
fs.writeFileSync(p, out, { encoding: 'utf8' });
const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
console.log('changed:', before !== out, 'bytes:', Buffer.byteLength(out), 'sha256:', h);
