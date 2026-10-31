// t111 - GB-99 (P-20 on the board): each kind has its own head line in its hit column. The brute's is 0.74 of
// hitH (its head sits low in a tall column), so a shot at its head's centre is always a headshot; every other kind
// keeps 0.78. hitH itself is unchanged. Claude's lines for the low-headed kinds (2026-09-29): feral 0.70, leaper 0.55,
// spider 0.60 (was 0.65; Claude dropped it under the walking p10), judged the same way: a shot at the head's centre counts, a chest shot just under the line doesn't.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Heads');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    let k = 0;
    const fresh = (type) => { const z = T.spawnZombie(P.x - 10 + (k++ % 8) * 3, P.z + 30, type, true, true); z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0; return z; };
    // Chance is held high for the shot, so no random limb or head comes off: each shot is judged on its hit line alone.
    const at = (type, frac) => { const z = fresh(type); const h0 = z.hp; const rnd = Math.random; Math.random = () => 0.999; try { T.damageZombie(z, 20, { kind: 'bullet', dir: { x: 0, z: 1 }, ...T.roundInfoDbg(z, frac === 'head' ? 'head' : z.mesh.position.y + z.hitH * frac) }); } finally { Math.random = rnd; } const d = h0 - z.hp; T.clearZombies(); return d; };
    // GB-185: since GP-19885 the round's own ray decides a headshot (confirmedHead), not a height line: a round
    // through its head is a headshot, one through its chest a body hit.
    const b50 = at('brute', 0.5), b40 = at('brute', 0.4), bH = at('brute', 'head'), bH2 = at('brute', 'head');
    ok(Math.abs(b40 - b50) < 1e-6, 'a brute hit in the chest is a body hit: ' + b40.toFixed(2) + ' vs ' + b50.toFixed(2));
    // A headshot at full health can also take the head off (damage 999999, by chance), so each shot is judged on its own.
    ok(bH > b50 * 1.5 && bH2 > b50 * 1.5, 'a round through its head is a headshot: ' + bH.toFixed(2) + ', ' + bH2.toFixed(2) + ' (body ' + b50.toFixed(2) + ')');
    const s50 = at('shambler', 0.5), s40 = at('shambler', 0.4), sH = at('shambler', 'head');
    ok(Math.abs(s40 - s50) < 1e-6 && sH > s50 * 1.5, 'a shambler: chest a body hit (' + s40.toFixed(2) + '), its head a headshot (' + sH.toFixed(2) + ')');
    T.clearZombies();
    // Where a walking brute's head really is: the centre of its head, sampled while it walks at him.
    const zs = [0, 1, 2].map((i) => { const z = T.spawnZombie(P.x - 6 + i * 6, P.z + 35, 'brute', true, true); z.riseT = 0; z.hp = z.maxHp = 1e6; return z; });
    const mids = [];
    for (let t = 0; t < 20; t++) {
      await wait(100);
      for (const z of zs) {
        if (!z.alive || !z.mesh.userData.head) continue;
        z.mesh.updateMatrixWorld(true);
        let lo = Infinity, hi = -Infinity;
        z.mesh.userData.head.traverse((m) => { const pa = m.isMesh && m.visible !== false && m.geometry && m.geometry.attributes && m.geometry.attributes.position; if (!pa) return; const e = m.matrixWorld.elements, arr = pa.array, st = pa.itemSize || 3; for (let i = 0; i < pa.count; i++) { const y = e[1] * arr[i * st] + e[5] * arr[i * st + 1] + e[9] * arr[i * st + 2] + e[13]; if (y < lo) lo = y; if (y > hi) hi = y; } });
        mids.push(((lo + hi) / 2 - z.mesh.position.y) / z.hitH);
      }
    }
    mids.sort((a, b) => a - b);
    const p10 = mids[Math.floor(mids.length * 0.1)];
    ok(mids.length > 20 && p10 > 0.74 + 0.02, 'a walking brute\'s head centre sits above its line with a margin: p10 ' + (p10 || 0).toFixed(3) + ' (line 0.74, ' + mids.length + ' samples)');
    T.clearZombies();
    // Feral 0.70, leaper 0.55, spider 0.60 (Claude): just under the line is a body hit, just over is a head,
    // and the head's centre, sampled while they come at him, sits above the line.
    for (const [type, line] of [['feral', 0.70], ['leaper', 0.55], ['spider', 0.60]]) {
      const chest = at(type, line - 0.15), hi = at(type, 'head');
      ok(hi > chest * 1.5, type + ': a round through its head is a headshot (' + hi.toFixed(2) + ' vs chest ' + chest.toFixed(2) + ')');
      const ws = [0, 1, 2].map((i) => { const z = T.spawnZombie(P.x - 6 + i * 6, P.z + 35, type, true, true); z.riseT = 0; z.hp = z.maxHp = 1e6; return z; });
      const hm = [];
      for (let t = 0; t < 15; t++) {
        await wait(100);
        for (const z of ws) {
          if (!z.alive || !z.mesh.userData.head || z.leapT > 0) continue;
          z.mesh.updateMatrixWorld(true);
          let a = Infinity, b = -Infinity;
          z.mesh.userData.head.traverse((m) => { const pa = m.isMesh && m.visible !== false && m.geometry && m.geometry.attributes && m.geometry.attributes.position; if (!pa) return; const e = m.matrixWorld.elements, arr = pa.array, st = pa.itemSize || 3; for (let i = 0; i < pa.count; i++) { const y = e[1] * arr[i * st] + e[5] * arr[i * st + 1] + e[9] * arr[i * st + 2] + e[13]; if (y < a) a = y; if (y > b) b = y; } });
          hm.push(((a + b) / 2 - z.mesh.position.y) / z.hitH);
        }
      }
      hm.sort((a, b) => a - b);
      const q = hm[Math.floor(hm.length * 0.1)], med = hm[Math.floor(hm.length * 0.5)];
      ok(hm.length > 15 && med > line, type + '\'s head centre sits above its line while it walks: median ' + (med || 0).toFixed(3) + ' (line ' + line + ', ' + hm.length + ' samples)');
      out.push('INFO ' + type + ' head centre p10 ' + (q || 0).toFixed(3) + ', median ' + (med || 0).toFixed(3) + ' of hitH (line ' + line + ')');
      T.clearZombies();
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
