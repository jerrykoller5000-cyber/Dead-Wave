import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync('qa/2026-10-29-GB-245/tune/rfocus11/rows.json', 'utf8'));
for (const row of rows) {
  const S = row.S;
  console.log(`up${S.up} side${S.side} fwd${S.fwd} tip${S.tip}`);
  for (const f of row.frames) console.log(`   u${String(Math.round(f.u*100)).padStart(2)} R ${String(f.R).padStart(6)} L ${String(f.L).padStart(6)}  ${f.ndc}${f.merged?' MERGED':''}`);
}
