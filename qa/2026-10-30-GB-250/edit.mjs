import fs from 'node:fs';
const C = '// GB-250 (CU-178: the test page ran at 4-14 fps): waits on the game\'s own events go on game time (T.getSimTime(), as GB-131 and t72), the same windows; a wall-clock cap only so a stuck game still ends the check.';
const edits = {
  't112.js': [
    ["  const until = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (cond()) return true; await wait(40); } return cond(); };",
     "  " + C + "\n  const until = async (cond, ms, capMs = 120000) => { const s0 = T.getSimTime(), t0 = Date.now(); while ((T.getSimTime() - s0) * 1000 < ms && Date.now() - t0 < capMs) { if (cond()) return true; await wait(40); } return cond(); };"],
    ["    const t0 = performance.now();", "    const t0 = T.getSimTime();   // GB-250: game time"],
    ["ok(drawn && (performance.now() - t0) < 2100, 'the turret fires and draws its target within 2 s (' + ((performance.now() - t0) / 1000).toFixed(2) + ' s)');",
     "ok(drawn && (T.getSimTime() - t0) < 2.1, 'the turret fires and draws its target within 2 s (' + (T.getSimTime() - t0).toFixed(2) + ' s of game time)');"],
  ],
  't168.js': [
    ["    const t0 = Date.now(); let wokeAt = null;", "    " + C + "\n    const t0 = T.getSimTime(), t0w = Date.now(); let wokeAt = null;"],
    ["    while (Date.now() - t0 < 3000) { await wait(50); stand(s0.x + ux * 2.0, s0.z + uz * 2.0); if (wokeAt === null && !zs0.sleeping) wokeAt = Date.now() - t0; }",
     "    while (T.getSimTime() - t0 < 3 && Date.now() - t0w < 120000) { await wait(50); stand(s0.x + ux * 2.0, s0.z + uz * 2.0); if (wokeAt === null && !zs0.sleeping) wokeAt = Math.round((T.getSimTime() - t0) * 1000); }"],
    ["    const t1 = Date.now();", "    const t1 = T.getSimTime(), t1w = Date.now();   // GB-250: game time"],
    ["    while (Date.now() - t1 < 4000 && zs0.alive) {", "    while (T.getSimTime() - t1 < 4 && Date.now() - t1w < 120000 && zs0.alive) {"],
    ["    let most = 0; const t2 = Date.now();", "    let most = 0; const t2 = T.getSimTime(), t2w = Date.now();   // GB-250: game time"],
    ["    while (Date.now() - t2 < 2000) {", "    while (T.getSimTime() - t2 < 2 && Date.now() - t2w < 120000) {"],
  ],
  't171.js': [
    ["  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };",
     "  " + C + "\n  const until = async (f, ms, capMs = 120000) => { const s0 = T.getSimTime(), t0 = Date.now(); while ((T.getSimTime() - s0) * 1000 < ms && Date.now() - t0 < capMs) { if (f()) return true; await wait(50); } return !!f(); };"],
  ],
};
for (const [f, list] of Object.entries(edits)) {
  const p = 'tools/tests/' + f; let s = fs.readFileSync(p, 'utf8');
  if (s.charCodeAt(0) === 0xFEFF) throw new Error(f + ' has a BOM');
  const crlf = s.includes('\r\n'); const nl = crlf ? '\r\n' : '\n';
  for (const [a, b] of list) {
    const n = s.split(a).length - 1; if (n !== 1) throw new Error(f + ': found ' + n + 'x: ' + a.slice(0, 60));
    s = s.replace(a, () => b.split('\n').join(nl));
  }
  if (!process.argv.includes('--dry')) fs.writeFileSync(p, s, 'utf8');
  console.log(f, 'ok', crlf ? 'CRLF' : 'LF', list.length, 'edits');
}