// world/history-props.test.mjs — CL-108, CL-109: every piece of the valley's history builds (no canvas in node: the
// painted boards fall back to plain colour), names itself, and stands on its own ground (nothing below y = -0.1).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as H from './history-props.js';
import { mulberry } from './first-people.js';

test('every builder makes its piece', () => {
  const rnd = mulberry(5);
  const pieces = [
    ['survey-board:iron', H.buildSurveyBoard(THREE, null, { n: 3, theme: 'iron' })],
    ['fob-lockdown-door', H.buildLockdownDoor(THREE, null)],
    ['cordon-gate', H.buildCordonGate(THREE, null)],
    ['trailhead-board', H.buildTrailheadBoard(THREE, null)],
    ['hikers-cache', H.buildHikersCache(THREE)],
    ['ranger-truck', H.buildRangerTruck(THREE, null)],
    ['brass', H.buildBrass(THREE, 20, rnd)],
    ['dropped-helmet', H.buildDroppedHelmet(THREE)],
    ['iron-below', H.buildIronBelowBoards(THREE, null)],
    ['mine-timbers', H.buildMineTimbers(THREE)],
    ['mine-bars-cut', H.buildCutBars(THREE, 3, 2.9, true)],
    ['coldwater-foundation', H.buildRuinedFoundation(THREE, rnd)],
    ['coldwater-chimney', H.buildChimney(THREE, rnd)],
    ['coldwater-church', H.buildChurchShell(THREE, rnd)],
    ['iron-banded-grave', H.buildIronBandedGrave(THREE, rnd)],
    ['open-grave', H.buildOpenGrave(THREE, rnd)],
    ['leghold-traps', H.buildTraps(THREE)],
    ['cellar-hatch', H.buildCellarHatch(THREE)],
  ];
  const wp = new THREE.Vector3();
  for (const [name, g] of pieces) {
    assert.equal(g.name, name);
    g.updateMatrixWorld(true);
    let n = 0, low = Infinity;
    g.traverse((o) => { if (o.isMesh) { n++; o.getWorldPosition(wp); low = Math.min(low, wp.y); } });
    assert.ok(n > 0, name + ' has meshes');
    assert.ok(low > -0.15, name + ' stands on its ground (' + low.toFixed(2) + ')');
  }
  assert.ok(H.buildRangerTruck(THREE, null).getObjectByName('ranger-radio'));
  assert.ok(H.buildCellarHatch(THREE).getObjectByName('cellar-ring'));
  assert.equal(H.buildTrailheadBoard(THREE, null).children.filter((c) => c.name === 'missing-poster').length, 3);
  // The mine's bars, all cut: nothing standing across the middle of the way.
  const bars = H.buildCutBars(THREE, 3, 2.9, true);
  bars.updateMatrixWorld(true);
  bars.traverse((o) => { if (o.isMesh && o.geometry.parameters && o.geometry.parameters.height > 2) { o.getWorldPosition(wp); assert.ok(Math.abs(wp.x) > 1.3 || wp.y < 1.2, 'a long bar left standing across the way at ' + wp.x.toFixed(2)); } });
  const dm = H.buildDragMarks(THREE, [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0.3 }], () => 0);
  assert.equal(dm.geometry.index.count, 2 * 2 * 6);
});
