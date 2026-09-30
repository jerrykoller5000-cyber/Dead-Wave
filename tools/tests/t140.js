// t140 — CL-90 (P-116, D-61): what he carries shows on him. The loadout's two primaries hang slung on his
// back and its two secondaries sit in the cross-draw holsters; the base pistol is in the hip holster unless
// it is in his hand; the gun in his hands never also shows on him (akimbo takes two); what is left shows in
// stages: magazine tops (2 on the belt, 5 with the carrier), grenades, the shotgun's shells on the bandolier,
// the launcher's 40 mm belt, the minigun's belt boxes and the flamer's tanks, full down to empty.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    T.grantAllWeapons();
    const load = { primary: ['shotgun', 'launcher'], secondary: ['uzi', 'revolver'] };
    let d = T.carryDbg({ loadout: load, inHand: null, akimbo: false, grenades: 3, vest: true });
    ok(d.slung.join() === 'shotgun,launcher', 'both primaries slung on his back: ' + d.slung.join());
    ok(d.holstered.join() === 'uzi,revolver', 'both secondaries in the cross-draw holsters: ' + d.holstered.join());
    ok(d.hip === 'pistol', 'the pistol in the hip holster while his hands are empty: ' + d.hip);
    ok(d.counts.mags === 5 && d.counts.grenades === 3, 'full: 5 magazine tops with the carrier, 3 grenades: ' + JSON.stringify(d.counts));
    ok(d.counts.shells === T.CARRY_SLOTS.shells && d.bands.bandolier, 'the shotgun\'s bandolier full: ' + d.counts.shells + ' shells');
    ok(d.counts.rounds40 === T.CARRY_SLOTS.rounds40 && d.bands.belt40, 'the launcher\'s 40 mm belt full: ' + d.counts.rounds40);
    ok(d.counts.boxes === 0 && d.counts.tanks === 0, 'no minigun or flamer carried, nothing on the pack: ' + d.counts.boxes + ', ' + d.counts.tanks);

    d = T.carryDbg({ loadout: load, inHand: 'shotgun', akimbo: false, grenades: 3, vest: true });
    ok(d.slung.join() === ',launcher', 'the shotgun in his hands is off his back: ' + d.slung.join());
    d = T.carryDbg({ loadout: load, inHand: 'pistol', akimbo: false, grenades: 3, vest: true });
    ok(d.hip === null, 'the pistol in his hand leaves the hip holster empty');
    d = T.carryDbg({ loadout: { primary: [null, null], secondary: ['uzi', 'uzi'] }, inHand: 'uzi', akimbo: true, grenades: 0, vest: false });
    ok(d.holstered.join() === ',', 'akimbo Uzis take both holsters: ' + d.holstered.join());

    // Empty it out: no spare magazines, no shells or grenades left.
    for (const w of ['pistol', 'uzi', 'revolver', 'm4', 'ak', 'sniper', 'aa12', 'minigun', 'flamer']) T.setSpareMags(w, 0);
    const res = T.getReserve(); res['12ga'] = 0; res['40mm'] = 0;
    d = T.carryDbg({ loadout: load, inHand: null, akimbo: false, grenades: 0, vest: true });
    ok(d.counts.mags === 0 && d.counts.grenades === 0 && d.counts.shells === 0 && d.counts.rounds40 === 0, 'empty: no tops, grenades, shells or rounds: ' + JSON.stringify(d.counts));
    ok(d.bands.bandolier && d.bands.belt40, 'the empty bandolier and belt still worn while the guns are carried');
    // Half: the stages step down, not straight from full to empty.
    res['12ga'] = Math.round(T.reserveCap('12ga') / 2);
    d = T.carryDbg({ loadout: load, inHand: null, akimbo: false, grenades: 1, vest: false });
    ok(d.counts.shells > 1 && d.counts.shells < T.CARRY_SLOTS.shells, 'half the shells, half the loops: ' + d.counts.shells + ' of ' + T.CARRY_SLOTS.shells);
    ok(d.counts.grenades === 1, 'one grenade left, one on the hip: ' + d.counts.grenades);
    d = T.carryDbg({ loadout: { primary: ['minigun', 'flamer'], secondary: [null, null] }, inHand: null, akimbo: false, grenades: 0, vest: false });
    ok(d.counts.boxes === 0 && d.counts.tanks === 0 && d.holstered.join() === ',', 'minigun and flamer carried dry: no boxes or tanks, no holsters: ' + JSON.stringify(d.counts));
    T.setSpareMags('minigun', 99); T.setSpareMags('flamer', 99);
    d = T.carryDbg({ loadout: { primary: ['minigun', 'flamer'], secondary: [null, null] }, inHand: null, akimbo: false, grenades: 0, vest: false });
    ok(d.counts.boxes === T.CARRY_SLOTS.boxes && d.counts.tanks === T.CARRY_SLOTS.tanks, 'full belt boxes and tanks on the pack: ' + d.counts.boxes + ', ' + d.counts.tanks);

    // The game's own frame keeps it: back to the real loadout without overrides, nothing throws.
    const live = T.carryDbg();
    ok(Array.isArray(live.slung) && live.slung.length === 2, 'the live rig answers for the real loadout: ' + live.slung.join());
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
