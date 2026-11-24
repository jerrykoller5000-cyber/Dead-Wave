// tcc366 - CC-366 (Jerry D-237 #7, 21 Nov 2026: "fighting a bunch of clones"): each zombie its own look. makeZombieMesh
//  gives every body a 32-bit g.userData.lookSeed (Claude 5's CE-24 walk traits read it too) and studio/zombie-look.js
//  paints the shambler from it, on the body's own merged skin: shirt/trousers/skin/hair colours, cut-outs (no shirt, rips,
//  teeth, rarely the jaw), wounds, build. Checks, in the Training Ground:
//  (1) every body (any kind) gets a lookSeed; 12 shamblers get 12 different seeds and a look each;
//  (2) the looks differ: at least 5 shirt colours, 3 hair styles or colours, 4 skin tones in 12 bodies; colour buffers differ;
//  (3) still ONE skinned draw per shambler body and the same vertex count on every body (nothing added);
//  (4) every cut-out triangle draws nothing (its 3 corners at one point, the same skin indices/weights: no stretching);
//  (5) the other kinds are not repainted (no zombieLook); (6) no page errors.
//  s50 (ChatGPT GP-20226 found 1920 mismatched natively): (4) again after the bodies go back to the pool and come out (the
//  pool reset writes the joins' bind copy back) and after an arm comes off (the joins re-own the lost bone's corners).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await wait(100); } return false; };
  try {
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'CC-366';
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active, 120000), 'the Training Ground starts');
    await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 120000);
    const tg = T.trainingDbg.tg(), O = tg.origin;
    T.clearZombies && T.clearZombies();
    const skinOf = (m) => { const s = []; m.traverse((o) => { if (o.isSkinnedMesh && o.userData.zombieSkin && o.visible) s.push(o); }); return s; };
    const spawn = (kind, n) => { const a = []; for (let i = 0; i < n * 3 && a.length < n; i++) { const z = T.spawnZombie(O.x - 12 + (a.length % 6) * 1.6, O.z + 20 + ((a.length / 6) | 0) * 1.6, kind, true, true); if (z && !a.includes(z)) a.push(z); } return a; };
    const zs = spawn('shambler', 12);
    await wait(300);
    // (1)
    const seeds = zs.map((z) => z.mesh.userData.lookSeed);
    ok(zs.length === 12 && seeds.every((s) => Number.isInteger(s) && s >= 0 && s < 2 ** 32), '12 shamblers, each with a 32-bit lookSeed');
    ok(new Set(seeds).size === zs.length, 'every shambler has its own seed (' + new Set(seeds).size + '/' + zs.length + ')');
    const looks = zs.map((z) => z.mesh.userData.zombieLook);
    ok(looks.every((l) => l && l.seed === (l.seed >>> 0)), 'every shambler wears a look');
    // (2)
    const shirts = new Set(looks.map((l) => String(l && l.shirt))), hair = new Set(looks.map((l) => l && (l.hairStyle + (l.hairCol || '')))), skins = new Set(looks.map((l) => l && l.skin.map((v) => v.toFixed(2)).join()));
    ok(shirts.size >= 5 && hair.size >= 3 && skins.size >= 4, 'the looks differ: ' + shirts.size + ' shirts, ' + hair.size + ' hair, ' + skins.size + ' skin tones in 12');
    const sk = zs.map((z) => skinOf(z.mesh));
    const cols = sk.map((s) => s[0] && s[0].geometry.attributes.color.array);
    let diff = 0; for (let i = 1; i < cols.length; i++) if (cols[i] !== cols[0]) { let d = 0; for (let k = 0; k < cols[0].length; k += 97) d = Math.max(d, Math.abs(cols[i][k] - cols[0][k])); if (d > 0.01) diff++; }
    ok(diff === cols.length - 1, 'each body has its own colours (' + diff + '/' + (cols.length - 1) + ' differ from the first)');
    // (3)
    const counts = sk.map((s) => s.length), verts = sk.map((s) => s[0] ? s[0].geometry.attributes.position.count : 0);
    ok(counts.every((c) => c === 1), 'one skinned draw per shambler body (' + [...new Set(counts)].join('/') + ')');
    ok(new Set(verts).size === 1 && verts[0] > 0, 'the same vertex count on every body (' + [...new Set(verts)].join('/') + ')');
    // (4) cut-outs are points with one skinning
    const cutCheck = (sks) => { let bad = 0, cut = 0;
    for (const s of sks) {
      const A = s[0].geometry.attributes, P = A.position.array, SI = A.skinIndex.array, SW = A.skinWeight.array, n = A.position.count;
      for (let t = 0; t < n / 3; t++) {
        const a = t * 3; let same = true;
        for (let j = 1; j < 3 && same; j++) for (let q = 0; q < 3; q++) if (P[(a + j) * 3 + q] !== P[a * 3 + q]) { same = false; break; }
        if (!same) continue;
        cut++;
        for (let j = 1; j < 3; j++) for (let q = 0; q < 4; q++) if (SI[(a + j) * 4 + q] !== SI[a * 4 + q] || SW[(a + j) * 4 + q] !== SW[a * 4 + q]) bad++;
      }
    }
    return { cut, bad }; };
    const c1 = cutCheck(sk);
    ok(c1.cut > 0 && c1.bad === 0, 'every cut-out triangle is one point with one skinning (' + c1.cut + ' cut-outs, ' + c1.bad + ' mismatched)');
    T.clearZombies && T.clearZombies();
    await wait(200);
    const back = spawn('shambler', 12); await wait(300);
    const c2 = cutCheck(back.map((z) => skinOf(z.mesh)).filter((x) => x.length));
    ok(c2.cut > 0 && c2.bad === 0, 'still so after the pool (' + c2.cut + ' cut-outs, ' + c2.bad + ' mismatched)');
    if (T.dismemberDbg && back[0]) { T.dismemberDbg(back[0], 'armL'); await wait(100); }
    const c3 = cutCheck([skinOf(back[0].mesh)]);
    ok(c3.bad === 0, 'and after an arm comes off (' + c3.cut + ' cut-outs, ' + c3.bad + ' mismatched)');
    T.clearZombies && T.clearZombies();
    // (5)
    const others = [...spawn('feral', 2), ...spawn('military', 2), ...spawn('brute', 1)];
    await wait(200);
    ok(others.length >= 3 && others.every((z) => Number.isInteger(z.mesh.userData.lookSeed)), 'other kinds get a seed too (' + others.length + ')');
    ok(others.every((z) => !z.mesh.userData.zombieLook), 'other kinds are not repainted yet');
    T.clearZombies && T.clearZombies();
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
