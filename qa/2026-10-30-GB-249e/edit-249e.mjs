import fs from 'node:fs';
const edit = (f, pairs) => {
  const s = fs.readFileSync(f, 'utf8');
  const crlf = s.includes('\r\n'), bom = s.charCodeAt(0) === 0xfeff, eol = crlf ? '\r\n' : '\n';
  const lines = s.split(eol);
  for (const [from, to] of pairs) {
    const idx = lines.map((l, i) => l === from ? i : -1).filter((i) => i >= 0);
    if (idx.length !== 1) { console.log(f + ': expected 1 exact line, found ' + idx.length + ' for: ' + from.slice(0, 80)); process.exit(1); }
    lines.splice(idx[0], 1, ...to);
  }
  fs.writeFileSync(f, lines.join(eol));
  console.log(f + ' ok crlf=' + crlf + ' bom=' + bom + ' edits ' + pairs.length);
};
edit('tools/tests/t111.js', [
  ["    const at = (type, frac) => { const z = fresh(type); const h0 = z.hp; const rnd = Math.random; Math.random = () => 0.999; try { T.damageZombie(z, 20, { kind: 'bullet', dir: { x: 0, z: 1 }, ...T.roundInfoDbg(z, frac === 'head' ? 'head' : z.mesh.position.y + z.hitH * frac) }); } finally { Math.random = rnd; } const d = h0 - z.hp; T.clearZombies(); return d; };",
   ["    // GB-249 (Claude's ruling (a), 2026-10-30): an arm in front of the face takes the round, as in 1.0 (the round's own ray decides, GB-185). So a head round",
    "    // is fired on the first frame of the fresh zombie's anim (stepped on game time, cap 3 s) where roundInfoDbg finds its head clear; no clear frame is a FAIL,",
    "    // never an empty pass. The INFO line counts the blocked checks, so an anim that hides the face for good shows up.",
    "    const at = async (type, frac) => { const z = fresh(type); const h0 = z.hp; let ri = null; if (frac === 'head') { let blocked = 0, seen = 0; const s0 = T.getSimTime(), w0 = Date.now(); for (;;) { const r = T.roundInfoDbg(z, 'head'); seen++; if (r.headHit) { ri = r; break; } blocked++; if (T.getSimTime() - s0 > 3 || Date.now() - w0 > 60000) break; await wait(30); } out.push('INFO ' + type + ' head round: ' + blocked + ' of ' + seen + ' checks blocked before a clear frame (' + (T.getSimTime() - s0).toFixed(2) + ' s of game time)'); if (!ri) { out.push('FAIL ' + type + ': no frame in 3 s of game time where a round at its head centre reaches the head (' + blocked + ' blocked)'); T.clearZombies(); return 0; } } const rnd = Math.random; Math.random = () => 0.999; try { T.damageZombie(z, 20, { kind: 'bullet', dir: { x: 0, z: 1 }, ...(ri || T.roundInfoDbg(z, z.mesh.position.y + z.hitH * frac)) }); } finally { Math.random = rnd; } const d = h0 - z.hp; T.clearZombies(); return d; };"]],
  ["    const b50 = at('brute', 0.5), b40 = at('brute', 0.4), bH = at('brute', 'head'), bH2 = at('brute', 'head');",
   ["    const b50 = await at('brute', 0.5), b40 = await at('brute', 0.4), bH = await at('brute', 'head'), bH2 = await at('brute', 'head');"]],
  ["    const s50 = at('shambler', 0.5), s40 = at('shambler', 0.4), sH = at('shambler', 'head');",
   ["    const s50 = await at('shambler', 0.5), s40 = await at('shambler', 0.4), sH = await at('shambler', 'head');"]],
  ["      const chest = at(type, line - 0.15), hi = at(type, 'head');",
   ["      const chest = await at(type, line - 0.15), hi = await at(type, 'head');"]],
]);
edit('tools/tests/t222.js', [
  ["    await pointAt(headCentre(zr)); await wait(60);",
   ["    // GB-249 (Claude's ruling (a), 2026-10-30): an arm in front of the face takes the round (white X = body). The gold-X round goes on a frame where the line",
    "    // from the muzzle along the aim reaches the head: the shambler's anim steps on game time (cap 3 s) until it does; none clear is a FAIL, never an empty pass.",
    "    let xClear = false, xBlocked = 0; { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 <= 3 && Date.now() - w0 < 60000) { await pointAt(headCentre(zr)); await wait(60); const M0 = T.getMuzzleWorld().clone(), d0 = T.aimTarget.clone().sub(M0), L0 = d0.length() + 3, h0 = T.zombieRoundHit(zr, M0.clone(), M0.clone().addScaledVector(d0.normalize(), L0)); if (h0 && h0.headHit) { xClear = true; break; } xBlocked++; } }",
    "    info('the gold-X round: ' + xBlocked + ' aim(s) blocked before a clear line to the head' + (xClear ? '' : ', none clear in 3 s of game time'));",
    "    if (!xClear) ok(false, 'a clear line from the muzzle to the shambler\\'s head within 3 s of game time (' + xBlocked + ' blocked)');"]],
]);
