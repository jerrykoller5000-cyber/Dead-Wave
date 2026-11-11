const M = await import('/home/claude/handfit-work/hand/mh-tool.mjs');
const base = JSON.parse(process.argv[2]); const res = [];
for (const a of [1.25, 1.3, 1.35, 1.4]) for (const b of [0.7, 0.8, 0.9, 1.0]) for (const c of [0.04, 0.2, 0.4, 0.6]) for (const s of [-0.238]) {
  const p = JSON.parse(JSON.stringify(base)); p.f[0] = [a, b, c, s];
  const g = M.handClipReport(p, 0.0005, false, M.GLOVE_INFLATE), r = M.handClipReport(p, 0.0005, false, 0);
  if (g.max <= 0.45 && r.max <= 0.45) res.push({ f0: p.f[0], g: g.max, d: Math.abs(a - 1.35) + Math.abs(b - 0.797) + Math.abs(c - 0.039) });
}
res.sort((x, y) => x.d - y.d); console.log(JSON.stringify(res.slice(0, 6)));
