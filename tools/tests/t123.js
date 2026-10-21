// t123 — CL-205 (story v3, Jerry): the burial detail is the survivors he rescued, as themselves; nobody rescued, nobody
// comes. (Was CL-105's two MARPAT marines.) One figure per survivor, built once and reused; no rifle in their hands.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  try {
    ok(T.ensureCrew([]).length === 0, 'nobody rescued: nobody at the grave');
    const two = T.ensureCrew(['okafor', 'pike']);
    ok(two.length === 2 && two[0].m.userData.survivorWho === 'okafor' && two[1].m.userData.survivorWho === 'pike', 'two rescued: Okafor and Pike, as themselves');
    ok(two.every((c) => c.shovel && c.root.parent), 'each has a shovel and is in the scene');
    let rifles = 0; for (const c of two) c.m.traverse((o) => { if (o.name === 'survivor-rifle' && o.visible) rifles++; });
    ok(rifles === 0, 'no slung rifle while they dig: ' + rifles);
    const again = T.ensureCrew(['pike', 'brandt', 'okafor']);
    ok(again.length === 3 && again[0] === two[1] && again[2] === two[0], 'three, and the figures are reused');
    T.ensureCrew([]);
    ok(two.concat(again).every((c) => !c.root.visible && !c.shovel.visible), 'a new call hides the last crew');
  } catch (e) {
    out.push('FAIL threw: ' + (e && (e.stack || e.message)));
  }
  return out.join('\n');
})()
