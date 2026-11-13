// tcc347 - CC-347 (J151 note 8, Jerry 13 Nov; J142's picture 12 Nov): no carry gear on him without its gun. A fresh entry
//  into the Training Ground runs the blackout warm-up, which dresses the carry rig in a stand-in plan (shotgun and launcher
//  slung, both bands, every holster, the akimbo pair and the right-hip pair shell) and then puts his own loadout back. Its
//  visibility restore used to run AFTER that, so the stand-in's straps, bands and empty shells came back on him with no guns
//  in them (the "cage of straps with wheels hanging off his side"). Checks, third person, without re-applying the plan first:
//  (1) after the warm-up every shown sling strap has its gun, and no band, holster, pair, hip pair or harness shows that the
//  plan doesn't call for; (2) the same through loadout x gun-in-hand x vest overrides; (3) when something flips a rig part's
//  visibility behind the plan's back, the next carry refresh (0.2 s) puts it right.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (f()) return true; } catch (_) {} await wait(100); } return false; };
  const sim = async (s) => { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < s && Date.now() - w0 < 60000) await wait(40); };
  try {
    const nameEl = document.getElementById('playerName'); if (nameEl) nameEl.value = 'CC-347';
    document.getElementById('modeTraining').click();
    ok(await until(() => T.trainingDbg.state().active && T.getPhase() === 'prep', 120000), 'the Training Ground starts');
    ok(await until(() => !document.getElementById('trainingBlackout')?.classList.contains('on'), 120000), 'its blackout (the warm-up) lifts');
    await sim(0.6);
    T.setViewFirstDbg(false);
    const M = T.getMarine(), rig = M.userData.carry;
    ok(!!rig, 'the carry rig is built');
    const vis = (o) => { for (let q = o; q && q !== M; q = q.parent) if (!q.visible) return false; return !!o; };
    const strays = (plan) => {
      const s = [];
      rig.slings.forEach((x, i) => { if (vis(x.sling) && !x.gun) s.push('sling strap ' + i + ' without its gun'); if (x.gun && !plan.primary[i]) s.push('sling ' + i + ' holds a ' + x.kind + ' the plan does not'); });
      if (vis(rig.bandolier) && !plan.bandolier) s.push('shell bandolier'); if (vis(rig.belt40) && !plan.belt40) s.push('40 mm belt');
      rig.holsters.forEach((h, i) => { if (vis(h.g) && !plan.holsterOn[i]) s.push('holster ' + i); });
      rig.pairs.forEach((h, i) => { if (vis(h.g) && !plan.pairOn[i]) s.push('pair holster ' + i); });
      if (vis(rig.hipPair.g) && !plan.hipPairOn) s.push('right-hip pair shell');
      if (vis(rig.harness) && !plan.holsterOn.some(Boolean)) s.push('holster harness');
      for (const [k, m] of [['mags', rig.mags], ['grenades', rig.grenades], ['shells', rig.shells], ['rounds40', rig.rounds40], ['boxes', rig.boxes], ['tanks', rig.tanks]])
        if (vis(m) && !(plan[k] > 0)) s.push(k + ' row');
      return s;
    };
    // (1) the fresh entry, as the game left it
    const plan0 = JSON.parse(rig.sig);
    const s0 = strays(plan0);
    ok(s0.length === 0, 'after the warm-up nothing shows on him that his loadout does not carry' + (s0.length ? ': ' + s0.join(', ') : ''));
    // (2) loadouts, gun in hand, vest
    const CONFIGS = [
      { loadout: { primary: ['m4', 'shotgun'], secondary: ['revolver', 'uzi'] }, inHand: 'pistol', akimbo: false, vest: true, grenades: 3 },
      { loadout: { primary: ['minigun', 'flamer'], secondary: ['pistol', 'revolver'] }, inHand: 'm4', akimbo: false, vest: false, grenades: 0 },
      { loadout: { primary: ['sniper', 'launcher'], secondary: ['uzi', null] }, inHand: 'sniper', akimbo: false, vest: false, grenades: 2 },
      { loadout: { primary: ['aa12', 'chainsaw'], secondary: ['pistol', 'uzi'] }, inHand: 'pistol', akimbo: true, vest: true, grenades: 3, dualOwned: { pistol: true, uzi: true } },
      { loadout: { primary: [null, null], secondary: [null, null] }, inHand: null, akimbo: false, vest: false, grenades: 0 },
    ];
    for (const C of CONFIGS) {
      const d = T.carryDbg(C), s = strays(d.plan);
      ok(s.length === 0, 'loadout ' + C.loadout.primary.join('/') + ' + ' + C.loadout.secondary.join('/') + ', ' + (C.inHand || 'unarmed') + (C.vest ? ', vest' : '') + ': every strap with its gun, nothing extra' + (s.length ? ': ' + s.join(', ') : ''));
    }
    // (3) a warm-up (or anything) flipping the rig behind the plan's back is put right at the next refresh
    T.carryDbg(CONFIGS[4]); await sim(0.5);   // the game's own plan back
    const plan1 = JSON.parse(rig.sig);
    rig.bandolier.visible = true; rig.hipPair.g.visible = true; rig.slings[0].sling.visible = true;
    await sim(0.6);
    const s1 = strays(plan1);
    ok(s1.length === 0, 'flipped on behind the plan (bandolier, hip pair shell, a strap), the next refresh hides them again' + (s1.length ? ': ' + s1.join(', ') : ''));
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  return out.join('\n');
})()
