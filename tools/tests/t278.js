// t278 — GP-19960 / D-87: a corpse falls from the height where its zombie died,
// rests on a deck or build top, and falls again if that support is removed.
// Run this before the fix as the reproduction: airborne and removed-support cases fail.
(async () => {
  const T = window.TT, out = [], ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await startMatch(T, 'CorpseGround');
    const w0 = Date.now();
    while (T.marine.getObjectByName('insertion-harness') && Date.now() - w0 < 90000) await wait(100);
    T.clearZombies(); T.skipGrace && T.skipGrace();
    const p = T.player.position, h = T.house && T.house.group ? T.house.group.position : { x: p.x - 1, z: p.z };
    let ux = p.x - h.x, uz = p.z - h.z;
    const len = Math.hypot(ux, uz) || 1; ux /= len; uz /= len;
    const x = h.x + ux * ((T.house && T.house.half) || 6) + ux * 16;
    const z = h.z + uz * ((T.house && T.house.half) || 6) + uz * 16;
    const step = (s) => { for (let t = 0; t < s; t += 0.05) T.updateCorpsesDbg(0.05); };
    const death = (kind, px, pz, y) => {
      const body = T.spawnZombie(px, pz, kind, true, true);
      if (!body) return null;
      body.riseT = 0; body.mesh.position.y = y;
      T.killZombie(body, false, { kind: 'melee', dir: { x: 1, z: 0 }, defense: true });
      return T.getCorpses().at(-1);
    };
    // The real kill/corpse path, starting with feet 3 m up as in a leap or knock-back.
    for (const [i, kind] of ['leaper', 'spider', 'drowned'].entries()) {
      const px = x + i * 2.5, pz = z + i * 2.5, ground = T.sampleHeight(px, pz);
      const c = death(kind, px, pz, ground + 3);
      ok(!!c, kind + ' makes a corpse after an airborne kill');
      if (c) {
        step(1.6);
        ok(Math.abs(c.baseY - ground) < 0.12, kind + ' settles from 3 m to terrain: ' + (c.baseY - ground).toFixed(2) + ' m above');
        if (kind !== 'spider') ok(Math.abs(c.mesh.position.y - c.baseY - c.lift * (c.tip == null ? 1 : c.tip)) < 0.02, kind + ' keeps CL-136 pose lift after settling');
      }
      T.clearZombies();
    }
    // A deck below the death holds the body; removing it sends the same corpse down.
    const gy = T.sampleHeight(x, z), deck = { x, z, hw: 1.1, hl: 1.1, yaw: 0, deckY: gy + 2 };
    T.platforms.push(deck);
    const dc = death('shambler', x, z, deck.deckY);
    if (dc) {
      step(1.5);
      ok(Math.abs(dc.baseY - deck.deckY) < 0.12, 'corpse rests on the deck, not terrain');
      ok(!!dc.frozen, 'deck corpse has frozen its pose before support removal');
      T.platforms.splice(T.platforms.indexOf(deck), 1);
      step(1.5);
      ok(Math.abs(dc.baseY - gy) < 0.12, 'corpse falls again after deck removal: ' + (dc.baseY - gy).toFixed(2) + ' m above');
      ok(Math.abs(dc.mesh.position.y - dc.baseY - dc.lift * (dc.tip == null ? 1 : dc.tip)) < 0.02, 'frozen corpse keeps its pose lift through the second fall');
    } else { ok(false, 'deck death makes a corpse'); T.platforms.splice(T.platforms.indexOf(deck), 1); }
    T.clearZombies();
    // The close-shell slide can carry a corpse off the edge while the deck remains.
    T.platforms.push(deck);
    const edge = death('shambler', x + deck.hw * 0.7, z, deck.deckY);
    if (edge) {
      edge.slide = 2; edge.dirX = 1; edge.dirZ = 0;
      step(0.3);
      ok(edge.mesh.position.x > deck.x + deck.hw, 'close-shell slide carries the corpse past the deck edge');
      step(1.3);
      const edgeGround = T.sampleHeight(edge.mesh.position.x, edge.mesh.position.z);
      ok(Math.abs(edge.baseY - edgeGround) < 0.12, 'sliding off the edge makes the corpse fall to terrain');
    } else ok(false, 'edge death makes a corpse');
    T.platforms.splice(T.platforms.indexOf(deck), 1);
    T.clearZombies();
    // A deck overhead must not pull a corpse up from the ground below it.
    T.platforms.push(deck);
    const below = death('shambler', x, z, gy);
    if (below) { step(1.3); ok(Math.abs(below.baseY - gy) < 0.12, 'overhead deck does not lift ground corpse'); }
    else ok(false, 'under-deck death makes a corpse');
    T.platforms.splice(T.platforms.indexOf(deck), 1);
    T.clearZombies();
    // An ordinary solid build top is also support, until it is broken.
    const b = T.spawnBuild('pillar', x + 5, z + 5);
    ok(!!b, 'placed a pillar for the build-top case');
    if (b) {
      const by = b.mesh.position.y + 2, bg = T.sampleHeight(b.x, b.z);
      const bc = death('shambler', b.x, b.z, by);
      if (bc) {
        step(1.5); ok(Math.abs(bc.baseY - by) < 0.12, 'corpse rests on the pillar top');
        T.removeBuild(b); step(1.5);
        ok(Math.abs(bc.baseY - bg) < 0.12, 'corpse falls again after pillar removal: ' + (bc.baseY - bg).toFixed(2) + ' m above');
      } else ok(false, 'pillar death makes a corpse');
    }
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.clearZombies(); } catch (_) {}
  return out.join('\n');
})();
