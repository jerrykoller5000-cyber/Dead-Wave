// t192 - CU-87: while he is on the M240B the mortar's dotted arc stays off and the reticle keeps no mortar line-of-fire
// colour; the gun still swings with his aim. The mortar draws its arc as before.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const settle = async () => { const t0 = T.getSimTime(); const w0 = Date.now(); while (T.getSimTime() - t0 < 0.3 && Date.now() - w0 < 6000) await wait(40); };
  try {
    await startMatch(T, 'ArcM240');
    T.unlockAllBuilds();
    const P = T.player.position;
    // The mortar draws its arc.
    const mortar = T.spawnBuild('mortar', P.x + 1.2, P.z);
    ok(T.mountMortar(mortar) === true, 'he mounts the mortar');
    await settle();
    ok(T.mortarArcDbg().visible === true, 'on the mortar the arc is drawn');
    T.dismountMortar && T.dismountMortar();
    await settle();
    ok(T.mortarArcDbg().visible === false && !T.getMortarMounted(), 'off it, the arc is gone');
    // The M240B does not.
    T.setAimTargetDbg && T.setAimTargetDbg(P.x - 20, P.z + 10);
    const gun = T.spawnBuild('m240', P.x - 1.2, P.z);
    ok(T.mountMortar(gun) === true && T.getMortarMounted() === gun, 'he mounts the M240B');
    const yaw0 = gun.mesh.rotation.y;
    for (let i = 0; i < 4; i++) { await settle(); T.updateMortarArc(); }
    ok(T.mortarArcDbg().visible === false, 'on the M240B no arc is drawn');
    ok(T.mortarArcDbg().state === '', 'and the reticle carries no mortar line-of-fire state (' + JSON.stringify(T.mortarArcDbg().state) + ')');
    ok(document.getElementById('reticle') ? !document.getElementById('reticle').classList.contains('los-blocked') && !document.getElementById('reticle').classList.contains('los-clear') : true, 'reticle: no los-clear / los-blocked');
    ok(!gun.mesh.userData.tube, 'the gun has no mortar tube to tilt');
    ok(Number.isFinite(gun.mesh.rotation.y), 'its yaw is a number (' + gun.mesh.rotation.y.toFixed(2) + ' from ' + yaw0.toFixed(2) + ')');
    T.fireMortar();
    ok(gun.belt === 499, 'and it still fires its belt (' + gun.belt + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
