// t209 - CL-129 (Jerry's playthrough 1, D-77): the maimed dead move like it.
//  - One leg off (GB-136: z.hopping): it hops on the leg it has: the body leaves the ground, the good leg tucks in the
//    air and takes the landing, the arms go out for balance.
//  - Both legs off (z.crawling): it hauls itself along on its arms, one then the other, reaching out ahead and dragging
//    back, head tipped back to look at him.
//  - The look: the new face (a hanging jaw, teeth, the mouth's dark), the rags and the ribs fold into the joints' merged
//    meshes (the head's and the chest's): nothing new is drawn on its own. And a walker closing on him reaches for him with both arms.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Maimed');
    T.clearZombies(); T.setHp(100000); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    const P = T.player.position;
    const watch = async (z, ms, f) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { f(z); await wait(30); } };
    // The hopper.
    const h = T.spawnZombie(P.x + 24, P.z, 'shambler', true, true);
    T.dismemberDbg(h, 'legL');
    ok(h && h.hopping && !h.crawling, 'one leg off: it hops (z.hopping)');
    await wait(300);
    let hy = [], shin = [], armOut = [];
    const ud = h.mesh.userData;
    await watch(h, 2500, () => { if (!h.alive) return; hy.push(ud.hips.position.y); if (ud.legRG.userData.shinG) shin.push(ud.legRG.userData.shinG.rotation.x); if (ud.armLG && ud.armRG && !(h.attackWindup > 0) && !(h.swingT > 0) && !(h.hitReact > 0) && !(h.riseT > 0)) armOut.push(ud.armLG.rotation.z - ud.armRG.rotation.z); });
    const span = (a) => a.length ? Math.max(...a) - Math.min(...a) : 0;
    ok(span(hy) > 0.1, 'it leaves the ground: the hips rise and fall ' + (span(hy) * 100).toFixed(0) + ' cm');
    ok(span(shin) > 0.5, 'the good leg tucks and takes the landing (its knee moves ' + span(shin).toFixed(2) + ' rad)');
    ok(armOut.length && Math.min(...armOut) > 0.8, 'its arms are out for balance (spread ' + (armOut.length ? Math.min(...armOut).toFixed(2) : '-') + ' rad at the least)');
    // The crawler.
    T.clearZombies();
    const c = T.spawnZombie(P.x + 24, P.z, 'shambler', true, true);
    T.dismemberDbg(c, 'legL'); T.dismemberDbg(c, 'legR');
    ok(c && c.crawling && !c.hopping && c.alive, 'both legs off: it crawls (z.crawling)');
    const cu = c.mesh.userData; let al = [], ar = [], head = [];
    const x0 = c.mesh.position.x;
    await watch(c, 3500, () => { if (!c.alive) return; al.push(cu.armLG.rotation.x); ar.push(cu.armRG.rotation.x); head.push(cu.head.rotation.x); });
    ok(span(al) > 1.2 && span(ar) > 1.2, 'it hauls itself on its arms: each reaches out and drags back (' + span(al).toFixed(2) + ', ' + span(ar).toFixed(2) + ' rad)');
    // one then the other: the two arms are out of step
    let apart = 0; for (let i = 0; i < al.length; i++) apart = Math.max(apart, Math.abs(al[i] - ar[i]));
    ok(apart > 1.0, 'one arm then the other (up to ' + apart.toFixed(2) + ' rad apart)');
    ok(head.length && head.reduce((a, b) => a + b, 0) / head.length < -0.5, 'its head is tipped back to look ahead (' + (head.reduce((a, b) => a + b, 0) / head.length).toFixed(2) + ')');
    ok(Math.abs(c.mesh.position.x - x0) > 0.3, 'and it gets somewhere (' + Math.abs(c.mesh.position.x - x0).toFixed(1) + ' m)');
    // The look costs no draws: every mesh on a shambler is a merged joint mesh, an eye or a glowing wound.
    T.clearZombies();
    const w = T.spawnZombie(P.x + 4.5, P.z, 'shambler', true, true);
    const wu = w.mesh.userData, loose = [];
    for (const g of [wu.head, wu.torso]) for (const o of g.children) if (o.isMesh && !o.userData.compacted && !(o.material.emissive && o.material.emissive.getHex() !== 0) && !wu.eyeMats.includes(o.material)) loose.push(o);
    ok(loose.length === 0, 'the new face, rags and ribs on the head and chest are folded into their merged meshes (' + loose.length + ' loose)');
    let headParts = 0; w.mesh.userData.head.traverse((o) => { if (o.isMesh && o.userData.compacted) headParts += o.geometry.attributes.position.count; });
    ok(headParts > 200, 'the head carries the jaw and teeth (' + headParts + ' vertices merged)');
    // The reach: closing on him, both arms come up at him.
    let reach = 0, armX = 0;
    // Arms read only off its swing (the attack's own arm pose overrides the reach), the most raised seen while reaching.
    await watch(w, 2500, () => { if (!w.alive) return; reach = Math.max(reach, w.reachK || 0); if ((w.reachK || 0) > 0.5 && !(w.attackWindup > 0) && !(w.swingT > 0) && !(w.hitReact > 0) && !(w.riseT > 0)) armX = Math.min(armX, (w.mesh.userData.armLG.rotation.x + w.mesh.userData.armRG.rotation.x) / 2); });
    ok(reach > 0.5 && armX < -0.9, 'closing on him it reaches for him (reach ' + reach.toFixed(2) + ', arms at ' + armX.toFixed(2) + ' rad)');
    T.clearZombies(); T.runDevCommand('godmode off');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e)); }
  return out.join('\n');
})()
