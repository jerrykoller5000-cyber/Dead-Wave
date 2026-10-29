// Keep this agent's card to a screenful; history remains in handoff reports.
import fs from 'node:fs/promises';
const file='crew/status/chatgpt.md';
const beforeStat=await fs.stat(file),raw=await fs.readFile(file);
if(raw.subarray(0,3).equals(Buffer.from([0xef,0xbb,0xbf])))throw Error('unexpected BOM');
const source=raw.toString('utf8'),eol=source.includes('\r\n')?'\r\n':'\n';
const marker=`${eol}## Notes${eol}`;
const at=source.indexOf(marker);
if(at<0||source.indexOf(marker,at+1)>=0)throw Error('missing or duplicate Notes marker');
const notes=[
  'GP-19970 OPEN: Source of truth: handoffs/2026-10-27-chatgpt-GP-19970.md, handoffs/GP-19970/remaining-pass.md, qa/2026-10-29-gp-19970-scores/report.md. Accepted at >=4: scoped zombie appearance fixes, marine balaclava and supply CRT, all 14 generic attack/death surveys, live Spitter/Bomber/Leaper/Demon/Spider specials. All checks use the single native game-test slot; full suite/load/fps are Cursor/Claude integration work.',
  'GP-19970 NEXT: AG is scoring Colossus body-hit yaw correction (0.7→0.32), exposed Screamer howl structure, and acid/web ground impact. Live Feral lunge 3.5 and Colossus slam 3.0 belong to Grokbot, who answered LATER after GB-245. Check handoffs/requests.md for replies before new edits; do not mark GP-19970 done until remaining motion and context are scored.',
  'GP-19974, GP-19973, GP-19975, GP-19968/69/72, GP-19977 DONE; reports in handoffs/. Only Cursor/Claude commit or push. CU-160 note-box wording remains LATER as a separate task.',
].join(`${eol}${eol}`);
const next=source.slice(0,at+marker.length)+eol+notes+eol;
const latestStat=await fs.stat(file),latestRaw=await fs.readFile(file);
if(latestStat.mtimeMs!==beforeStat.mtimeMs||!latestRaw.equals(raw))throw Error('card changed under edit; merge manually');
await fs.writeFile(file,Buffer.from(next,'utf8'));
console.log(`card Notes compacted: ${source.slice(at).split(/\r?\n/).length} → ${next.slice(at).split(/\r?\n/).length} lines`);
