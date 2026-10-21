// t110 - GB-96 (P-100): the shotgun earns its place against spiders on a wall: its pellets do a quarter
// more to a spider (at least 20% more than before), and exactly what they did to anything else.
// GB-104 (D-62): since the weakness table, a spider takes its row (pellet 1.1, bullet 0.7) and a shambler its own; the
// shotgun still bites a spider harder than it did before GB-96 (at least +19%: 1.1 against the old 0.92).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Spiders');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const mk = (type, dx) => { const z = T.spawnZombie(P.x + dx, P.z + 25, type, true, true); z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0; return z; };
    const hit = (z, amount, kind) => { const h0 = z.hp; T.damageZombie(z, amount, { kind, dir: { x: 0, z: 1 }, hitY: z.mesh.position.y + (z.hitH || 1.4) * 0.4 }); return h0 - z.hp; };
    const sp = mk('spider', -3), sh = mk('shambler', 3);
    const pel = T.WEAPON_STATS.shotgun.damage;
    const arm = (k) => T.ZOMBIE_TYPES[k].armor || 0;
    const dSp = hit(sp, pel, 'pellet'), dSh = hit(sh, pel, 'pellet');
    const base = pel * (1 - arm('spider')), Wk = T.WEAKNESS;
    ok(dSp >= base * 1.19 - 1e-6 && Math.abs(dSp - pel * Wk.spider.pellet) < 1e-6, 'a pellet on a spider: ' + dSp.toFixed(2) + ' (the table\'s ' + Wk.spider.pellet + '; before GB-96 ' + base.toFixed(2) + ', at least +19%)');
    ok(Math.abs(dSh - pel * Wk.shambler.pellet) < 1e-6, 'a pellet on a shambler takes its row: ' + dSh.toFixed(2));
    const dB = hit(sp, 30, 'bullet');
    ok(Math.abs(dB - 30 * Wk.spider.bullet) < 1e-6, 'a rifle round on a spider takes the table\'s ' + Wk.spider.bullet + ': ' + dB.toFixed(2));
    T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message || e));
  }
  return out.join('\n');
})()
