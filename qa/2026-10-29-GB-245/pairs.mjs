import fs from 'node:fs';
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const row of rows) {
  const S = row.S;
  const key = `up${S.up} side${S.side} fwd${S.fwd}`;
  console.log(key);
  for (const f of row.frames) {
    // trustworthy only if both hides agree with each other (no asymmetric re-bake)
    const rOk = Math.abs(f.R1 - f.R2) <= Math.max(300, 0.25 * Math.max(f.R1, f.R2));
    const lOk = Math.abs(f.L1 - f.L2) <= Math.max(300, 0.25 * Math.max(f.L1, f.L2));
    const sep = !f.merged && (Math.abs(f.R1 - f.L1) > 200 || Math.abs(f.R2 - f.L2) > 200);
    const flag = (!rOk || !lOk) ? ' REBAKE' : (f.merged ? ' MERGED' : (sep ? ' ok' : ' SAME'));
    console.log(`   u${Math.round(f.u * 100)}  R1 ${String(f.R1).padStart(6)} R2 ${String(f.R2).padStart(6)}  L1 ${String(f.L1).padStart(6)} L2 ${String(f.L2).padStart(6)}   all ${String(f.all).padStart(6)}${flag}`);
  }
}
