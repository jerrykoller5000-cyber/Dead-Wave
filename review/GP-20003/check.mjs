import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import * as THREE from '../../tools/tests/fakethree.mjs';
import { createSkylinePulls } from '../../game/skyline-pulls.js';

const poi = {
  campsites: [{ x: -140, z: 8, style: 'ranger' }, { x: -20, z: 145, style: 'hikers' }, { x: 55, z: -130, style: 'trapper' }],
  sheds: [{ x: 10, z: 10 }, { x: 20, z: 20 }, { x: 150, z: 35 }],
  mast: { x: 175, z: -15 }
};
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
const landmarks = [{ kind: 'campsite', campStyle: 'trapper', x: 55, z: -130, campYaw: 0 }];
const pulls = createSkylinePulls(THREE, { scene, poi, landmarks, height: () => 4, camera });
assert.deepEqual([pulls.sites.trapper.x, pulls.sites.trapper.z], [51.48, -133.15]);
assert.equal(pulls.sites.trapper.y, 6);
assert.deepEqual([pulls.sites.hikers.x, pulls.sites.hikers.z], [-20, 145]);
assert.deepEqual([pulls.sites.fuel.x, pulls.sites.fuel.z], [150, 35]);
const wind = { dirX: 0.8, dirZ: 0.6, strength: 0.7 };
pulls.update(1 / 60, { wind, daylight: true, fuelDone: false, beaconOn: true });
assert.equal(pulls.chimney.visible, true);
assert.equal(pulls.chimney.count, 14);
assert.equal(pulls.fuel.count, 15);
assert.equal(pulls.bodies.visible, true);
assert.equal(pulls.bodies.count, 7);
assert.equal(pulls.wings.count, 14);
assert.equal(pulls.beacon.visible, true);
assert.equal(pulls.beacon.material.fog, false);
pulls.update(1 / 60, { wind, daylight: false, fuelDone: true, beaconOn: false });
assert.equal(pulls.chimney.visible, false);
assert.equal(pulls.fuel.count, 5);
assert.equal(pulls.bodies.visible, false);
assert.equal(pulls.wings.visible, false);
assert.equal(pulls.beacon.visible, false);
const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const inline = html.split('<script type="module">')[1].split('</script>')[0];
const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: inline, encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr);
console.log('GP-20003 skyline pull pipe/POI, day/night, generator, beacon, instancing and inline syntax: 18 pass, 0 fail');
