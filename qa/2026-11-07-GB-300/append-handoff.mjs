import fs from 'fs';

const p = 'handoffs/2026-11-07-grokbot-GB-300.md';
let buf = fs.readFileSync(p);
if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) throw new Error('BOM present');
let t = buf.toString('utf8');
if (t.includes('\r')) {
  console.log('normalizing CR count', (t.match(/\r/g) || []).length);
  t = t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
if (!t.endsWith('\n')) t += '\n';
if (t.includes('## Follow-up checks (2026-11-07')) {
  console.log('already appended');
  process.exit(0);
}
const add = `
## Follow-up checks (2026-11-07 ~2:28 AM America/Chicago)

Missing from the original handoff; run after checkout with the card left idle.

- index.html inline module: extract biggest non-importmap script -> node --check PASS (qa/2026-11-07-GB-300/static-check.mjs; 3,912,952 chars; no BOM).
- t95 via game-test slot: 9 pass / 0 fail (56.2s). Slot note: GB-300 follow-up: t95 (missing handoff check).

Both green. No re-check-in. Card idle. GB-301 not started.
`;
const out = Buffer.from(t + add, 'utf8');
fs.writeFileSync(p, out);
console.log('appended; bytes', out.length, 'hasCR', out.includes(0x0d), 'bom', out[0] === 0xEF);
