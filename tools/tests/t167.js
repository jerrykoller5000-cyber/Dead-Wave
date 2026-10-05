// t167 - CL-108, CL-109 (updated CL-119 for Jerry's GP-104 and GP-122) (D-70, docs/story.md §6, §7): the valley's history in things. The PGB survey board at each
// warren cave, the old mine (timbers, the bars cut and bent aside, IRON BELOW, the hikers' packs), FOB Threshold's
// lockdown door and motto on the HQ, the Cordon's gate on the wall with the trailhead's missing posters, the rangers'
// truck at their camp, the trapper's cellar hatch, Coldwater by the cemetery (church, footings, chimney), the iron-
// banded graves and the open one, brass and drag marks at the sandbags. E by a board reads its field note.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const H = T.historyProps, P = H.parts, POI = T.POI;
    const boards = Object.keys(P).filter((k) => k.startsWith('survey-board:'));
    ok(boards.length === 5, 'a survey board at each of the five warren caves (' + boards.sort().join(', ') + ')');
    for (const k of boards) {
      const c = POI.caves.find((cv) => 'survey-board:' + cv.theme === k), b = P[k];
      ok(Math.hypot(b.position.x - c.x, b.position.z - c.z) < 12 && T.waterDepthAt(b.position.x, b.position.z) <= 0, k + ' by its cave, on dry ground');
    }
    ok(P['mine-timbers'] && P['mine-bars-cut'] && P['iron-below'] && P['hikers-cache'], 'the old mine: timbers, cut bars, IRON BELOW, the hikers\' packs');
    // GP-104 (Jerry, 2026-10-02): the motto came off the HQ's back wall; the mural carries it now (GP-100).
    ok(P['fob-lockdown-door'] && !(P['pgb-motto'] && P['pgb-motto'].parent), 'FOB Threshold\'s lockdown door, and no motto on the back wall (GP-104)');
    const gate = P['cordon-gate'];
    ok(!!gate && Math.abs(Math.hypot(gate.position.x, gate.position.z) - Math.hypot(gate.position.x, gate.position.z)) < 1 && Math.hypot(gate.position.x, gate.position.z) > 150, 'the Cordon\'s gate on the wall (' + (gate ? Math.hypot(gate.position.x, gate.position.z).toFixed(0) : '-') + ' m out)');
    ok(P['trailhead-board'] && P['trailhead-board'].children.filter((c) => c.name === 'missing-poster').length === 3, 'the trailhead board with three missing posters');
    const ranger = POI.campsites.find((c) => c.style === 'ranger'), trapper = POI.campsites.find((c) => c.style === 'trapper');
    ok(!ranger || (P['ranger-truck'] && Math.hypot(P['ranger-truck'].position.x - ranger.x, P['ranger-truck'].position.z - ranger.z) < 16), 'the rangers\' truck at their camp');
    ok(!trapper || (P['cellar-hatch'] && Math.hypot(P['cellar-hatch'].position.x - trapper.x, P['cellar-hatch'].position.z - trapper.z) < 12), 'the trapper\'s cellar hatch at his camp');
    const gy = POI.graveyard;
    // GP-122 (Jerry, 2026-10-02): the church moved back out of the burial yard, about 23 m from the graveyard's centre.
    const churchD = P['coldwater-church'] ? Math.hypot(P['coldwater-church'].position.x - gy.x, P['coldwater-church'].position.z - gy.z) : -1;
    ok(churchD > 12 && churchD < 30, 'Coldwater\'s church by the old cemetery, behind the burial yard (' + churchD.toFixed(1) + ' m)');
    ok(P['coldwater-foundation'] && P['coldwater-chimney'], 'its footings and a chimney');
    ok(P['open-grave'] && P['iron-banded-grave'], 'the iron-banded graves and the one open from below');
    ok(P['drag-marks'] && P['dropped-helmet'], 'the fall at the sandbags: drag marks, a helmet');
    // Nothing of it in water.
    const wet = Object.entries(P).filter(([k, o]) => !k.startsWith('fob') && k !== 'pgb-motto' && k !== 'drag-marks' && T.waterDepthAt(o.position.x, o.position.z) > 0.05).map(([k]) => k);
    ok(wet.length === 0, 'nothing stands in water (' + wet.join(', ') + ')');
    // E by the iron board reads the iron warren's note.
    const ib = P['survey-board:iron'];
    ok(T.storyPropInReach({ x: ib.position.x + 0.5, z: ib.position.z }) === 'warren:iron', 'E by the iron warren\'s board reads its note');
    const og = P['open-grave'];
    ok(T.storyPropInReach({ x: og.position.x, z: og.position.z + 1 }) === 'graveyard', 'and by the open grave, the graveyard\'s');
    ok(errs.length === 0, 'no errors' + (errs.length ? ': ' + errs[0] : ''));
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  return out.join('\n');
})();
