// t157 - CU-80: a strongbox pays only if every piece fits, and E opens the one in the warren.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    await startMatch(T, 'Haul');
    while ((T.getMedkits() | 0) < 3) {
      const one = T.grantHaul([{ kind: 'medkit', qty: 1 }]);
      if (!one.ok) break;
    }
    ok((T.getMedkits() | 0) === 3, 'the MedPen pouch fills (' + T.getMedkits() + ')');
    const refused = T.grantHaul([{ kind: 'blueprint', id: 'wall' }, { kind: 'medkit', qty: 1 }]);
    ok(refused.ok === false && !T.getBuildUnlocked().wall, 'a full pouch refuses the whole box, wall included');
    const gun = T.grantHaul([{ kind: 'gun', id: 'uzi' }]);
    ok(gun.ok === true && T.getWeaponOwned().uzi === true, 'a gun he does not own is granted');
    ok(T.grantHaul([{ kind: 'gun', id: 'uzi' }]).ok === false, 'the same gun is not granted twice');
    const built = T.enterHollow({ theme: 'iron', cave: 0 });
    const box = built.points.strongbox;
    T.player.position.set(box.x, box.y, box.z);
    ok(T.actionTarget() === 'hollowHaul', 'E at the strongbox is the haul');
    T.doAction();
    const known = T.getQuestState && T.getQuestState();
    ok(!!known && known.known && known.known.some(Boolean), 'the iron shard is learned (' + JSON.stringify(known && known.known) + ')');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
