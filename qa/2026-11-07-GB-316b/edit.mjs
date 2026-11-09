// GB-316b: exact-line edit of the pistol beavertail/tang (CRLF preserved, no BOM).
import fs from 'node:fs';
const FILE = 'studio/weapon-sidearms.js';
const raw = fs.readFileSync(FILE);
if (raw[0] === 0xEF) throw new Error('BOM');
const text = raw.toString('utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);

function must(pred, msg) {
  const i = lines.findIndex(pred);
  if (i < 0) throw new Error(msg);
  return i;
}

const tang = must((l) => l.includes('GB-316 (J23): tang flows into the backstrap'), 'pistol tang');
const old = lines[tang];
if (old.includes('GB-316b')) {
  console.log(JSON.stringify({ already: true, line: tang + 1 }));
  process.exit(0);
}
const next = '  K.slab([[-0.060, 0.008], [-0.084, 0.007], [-0.094, 0.004], [-0.099, -0.001], [-0.100, -0.008], [-0.096, -0.016], [-0.088, -0.022], [-0.076, -0.024], [-0.062, -0.020], [-0.048, -0.014], [-0.036, -0.008], [-0.026, -0.002]], 0.044, gunPoly, { bevel: 0.012, segs: 5 });   // GB-316b: short rounded shelf into the backstrap, not a fin';
if (!old.includes('K.slab([[-0.06, 0.008], [-0.098, 0.006], [-0.110, 0.000]')) {
  throw new Error('unexpected tang line: ' + old.slice(0, 120));
}
lines[tang] = next;
fs.writeFileSync(FILE, lines.join(nl), 'utf8');
console.log(JSON.stringify({ ok: true, line: tang + 1, eol: nl === '\r\n' ? 'CRLF' : 'LF', bytes: fs.statSync(FILE).size }));