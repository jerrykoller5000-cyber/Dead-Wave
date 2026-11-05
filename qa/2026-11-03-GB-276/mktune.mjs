// GB-276: build tune189.js from probe189.js: runs t189's measure repeatedly in one page, tuning the live SLING_INNER table by secant steps.
import fs from 'node:fs';
let p = fs.readFileSync('qa/2026-11-03-GB-276/probe189.js', 'utf8');
const a = "await startMatch(T, 'Stowed');";
if (!p.includes(a)) throw new Error('start anchor');
p = p.replace(a, () => "if (!window.__started) { await startMatch(T, 'Stowed'); window.__started = true; }");
const iife = p.trim().replace(/;\s*$/, '');
const code = `(async () => {
  const M = await import('/ui/marine-kit-fit.js'), SI = M.SLING_INNER, TARGET = 0.004, hist = {}; const log = [];
  const runOnce = async () => (${iife});
  for (let it = 0; it < 7; it++) {
    const res = await runOnce(); const rows = res.split('\\n').filter((l) => l.startsWith('DATA ')).map((l) => JSON.parse(l.slice(5))).filter((r) => /sling/.test(r.tag));
    let worst = 0;
    for (const r of rows) {
      const m = r.tag.match(/^(\\w+)@sling([+-])$/), kind = m[1], i = m[2] === '+' ? 0 : 1, err = r.gap, key = r.tag, cur = SI[kind][i];
      worst = Math.max(worst, Math.abs(err - TARGET));
      const h = hist[key] || (hist[key] = []); h.push([cur, err]);
      let slope = 0.6;
      if (h.length >= 2) { const [c0, e0] = h[h.length - 2]; if (Math.abs(cur - c0) > 1e-5) slope = Math.min(1.5, Math.max(0.15, (err - e0) / (cur - c0))); }
      SI[kind][i] = +(cur - (err - TARGET) / slope).toFixed(4);
    }
    log.push('IT ' + it + ' worst |gap-target| ' + worst.toFixed(4) + ' ' + rows.map((r) => r.tag + ':' + r.gap).join(' '));
    log.push('TABLE ' + JSON.stringify(SI));
    if (worst < 0.003) break;
  }
  return log.join('\\n');
})()`;
fs.writeFileSync('qa/2026-11-03-GB-276/tune189.js', code);
