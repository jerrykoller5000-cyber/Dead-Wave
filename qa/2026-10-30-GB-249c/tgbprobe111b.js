// tgbprobe111b - GB-249 temporary probe (Grokbot). Not a test: every line prints as FAIL PROBE. Deleted after its run.
// Why does TT.roundInfoDbg(z, 'head') sometimes miss a still feral/leaper's head (t111 flake)? Fresh zombies, as t111 makes them.
(async () => {
  const T = window.TT; const out = []; const pr = (m) => out.push('FAIL PROBE ' + m);
  try {
    await startMatch(T, 'Heads');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position; let k = 0;
    const fresh = (type) => { const z = T.spawnZombie(P.x - 10 + (k++ % 8) * 3, P.z + 30, type, true, true); z.riseT = 0; z.hp = z.maxHp = 1e6; z.speed = z.baseSpeed = 0; return z; };
    const f3 = (n) => (n == null ? 'na' : n.toFixed(3));
    for (const type of ['feral', 'leaper', 'spider', 'shambler', 'brute']) {
      let hits = 0; const N = 16;
      for (let i = 0; i < N; i++) {
        const z = fresh(type);
        const r = T.roundInfoDbg(z, 'head');
        if (r.headHit) { hits++; T.clearZombies(); continue; }
        const root = z.mesh.userData.head; z.mesh.updateMatrixWorld(true);
        const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity], v = z.mesh.position.clone();
        root.traverse((m) => { const pa = m.isMesh && !m.isSkinnedMesh && !m.userData.stump && (m.userData.skinSrc || m.visible !== false) && m.geometry?.attributes?.position; if (!pa) return; for (let j = 0; j < pa.count; j++) { v.fromBufferAttribute(pa, j).applyMatrix4(m.matrixWorld); const q = [v.x, v.y, v.z]; for (let a = 0; a < 3; a++) { if (q[a] < lo[a]) lo[a] = q[a]; if (q[a] > hi[a]) hi[a] = q[a]; } } });
        const c = { x: (lo[0] + hi[0]) / 2, y: (lo[1] + hi[1]) / 2, z: (lo[2] + hi[2]) / 2 }, hh = (hi[1] - lo[1]) / 2, hw = Math.max(hi[0] - lo[0], hi[2] - lo[2]) / 2;
        const dx = r.dir.x, dz = r.dir.z, inv = root.matrixWorld.clone().invert();
        const shoot = (yy, ss) => { const ox = -dz * ss, oz = dx * ss; return T.zombieRoundHit(z, z.mesh.position.clone().set(c.x + ox - dx * 3, yy, c.z + oz - dz * 3), z.mesh.position.clone().set(c.x + ox + dx * 3, yy, c.z + oz + dz * 3)); };
        const h0 = shoot(c.y, 0);
        const lp = h0 ? z.mesh.position.clone().set(h0.point.x, h0.point.y, h0.point.z).applyMatrix4(inv) : null;
        const u = z.mesh.userData, rx = (g) => (g ? f3(g.rotation.x) : 'na');
        pr(type + ' miss #' + i + ' state ' + z.state + ' idle ' + f3(z.idleAmt) + ' anim ' + f3(z.animT ?? z.walkPhase) + ' headScale ' + f3(u.headScale) + ' root vis ' + root.visible + ' collapsed ' + !!root.userData._skinCollapsed + ' partsLost ' + JSON.stringify(z.partsLost || {}));
        pr('  box y ' + f3(lo[1]) + '..' + f3(hi[1]) + ' x ' + f3(lo[0]) + '..' + f3(hi[0]) + ' z ' + f3(lo[2]) + '..' + f3(hi[2]) + ' dir ' + f3(dx) + ',' + f3(dz) + ' root world ' + f3(root.matrixWorld.elements[12]) + ',' + f3(root.matrixWorld.elements[13]) + ',' + f3(root.matrixWorld.elements[14]));
        pr('  centre shot: ' + (h0 ? 'hit t ' + f3(h0.t) + ' head ' + h0.headHit + ' point ' + f3(h0.point.x) + ',' + f3(h0.point.y) + ',' + f3(h0.point.z) + ' head-local ' + f3(lp.x) + ',' + f3(lp.y) + ',' + f3(lp.z) + (h0.point.y >= lo[1] && h0.point.y <= hi[1] && h0.point.x >= lo[0] - 0.02 && h0.point.x <= hi[0] + 0.02 && h0.point.z >= lo[2] - 0.02 && h0.point.z <= hi[2] + 0.02 ? ' (inside head box)' : ' (OUTSIDE head box: body in front?)') : 'no hit'));
        pr('  arms rx L ' + rx(u.armLG) + ' R ' + rx(u.armRG) + ' torso ' + rx(u.torso) + ' head ' + rx(u.head) + ' head ry ' + (u.head ? f3(u.head.rotation.y) : 'na'));
        let grid = '';
        for (const sk of [-0.6, -0.3, 0, 0.3, 0.6]) { grid += ' sk' + sk + ':'; for (const kk of [-0.6, -0.4, -0.25, 0, 0.25, 0.4, 0.6]) { const t = shoot(c.y + kk * hh, sk * hw); grid += !t ? '.' : t.headHit ? 'H' : 'b'; } }
        pr('  grid (k -0.6..0.6 of hh, per side offset):' + grid);
        T.clearZombies();
      }
      pr(type + ': hook headHit ' + hits + '/' + N);
    }
  } catch (e) { pr('threw: ' + (e && e.stack || e.message || e)); }
  return out.join('\n');
})()