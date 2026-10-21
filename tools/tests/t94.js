// t94 - CU-50 (P-23): damageBuild publishes dw-game build-hit. One event when a wall
// drops to about 40%, silence for the next hit inside 2 s, and a break still reports.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'BuildHit');
    T.unlockAllBuilds(); T.addCash(100000);
    const hits = [];
    window.addEventListener('dw-game', (e) => { if (e.detail && e.detail.type === 'build-hit') hits.push(e.detail); });
    const p = T.player.position;
    const gx = T.gridIndex(p.x) + 4, gz = T.gridIndex(p.z) + 2;
    const wall = T.placeBuildAt('wall', gx, gz, 0);
    ok(!!wall && wall.maxHp > 0 && wall.id > 0, 'a wall with an id and a max');
    if (!wall) { document.body.textContent = out.join('\n'); return; }
    const before = hits.length;
    T.damageBuild(wall, wall.maxHp * 0.6, 'enemy');
    const first = hits.slice(before);
    ok(first.length === 1 && Math.abs(first[0].frac - 0.4) < 0.02 && first[0].broke === false
      && first[0].kind === 'wall' && first[0].id === wall.id
      && first[0].x === wall.x && first[0].z === wall.z, 'one event at about 40%, with kind and id');
    const mid = hits.length;
    T.damageBuild(wall, 1, 'enemy');
    ok(hits.length === mid, 'a second hit inside 2 s stays quiet');
    T.damageBuild(wall, wall.maxHp, 'enemy');
    const last = hits[hits.length - 1];
    ok(hits.length === mid + 1 && last && last.broke === true && last.frac === 0 && last.id === wall.id, 'the break still reports');
    const other = T.placeBuildAt('wall', gx + 2, gz, 0);
    ok(!!other, 'a second wall');
    if (other) {
      const n = hits.length;
      T.damageBuild(other, 1, 'player');
      ok(hits.length === n && other.hp === other.maxHp, 'his own shot does not hurt it or report');
      T.damageBuild(other, 1, 'enemy');
      T.damageBuild(other, 1, 'enemy');
      ok(hits.length === n + 1, 'two quick hits on the other wall are one event');
      await wait(2100);
      T.damageBuild(other, 1, 'enemy');
      ok(hits.length === n + 2 && hits[hits.length - 1].id === other.id, 'after 2 s the next hit reports');
    }
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
