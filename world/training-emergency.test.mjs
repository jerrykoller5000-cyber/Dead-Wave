// world/training-emergency.test.mjs — CJ-5 (CH-3 #20): the EXIT signs and battery emergency lamps for Training's dark.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import { TRAINING } from './training.js';
import { dressEmergency, EMERGENCY } from './training-emergency.js';
import { containmentMounts } from '../game/training-containment.js';

const R = TRAINING.RANGE, B = TRAINING.BUILD, D = TRAINING.DOOR, POCKET = 0.186;
function build() {
  const root = new T.Group(), mats = [];
  const std = (o) => { const m = new T.MeshStandardMaterial(o); mats.push(m); return m; };
  const add = (geo, mat, x, y, z, parent = root) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const steelLight = new T.MeshStandardMaterial({ color: 0x9aa2a8 });
  const basics = [];
  const em = dressEmergency(T, { R, B, D, POCKET, add, std, keep: (x) => x, onBasic: (m) => basics.push(m), steelLight, root, document: null });
  return { root, mats, basics, em, steelLight };
}

test('four new materials only (the bake merges each to one draw); housings on the room steel', () => {
  const { root, mats, basics, em, steelLight } = build();
  assert.equal(mats.length, 2, 'lit: the EXIT face and the lenses');
  assert.equal(basics.length, 2, 'unlit washes: warm and green');
  for (const m of basics) assert.ok(m.transparent && m.depthWrite === false, 'a wash never writes depth');
  const used = new Set(); root.traverse((o) => { if (o.isMesh) used.add(o.material); });
  const want = [steelLight, em.exitMat, em.lensMat, em.glowMat, em.exitGlowMat];
  assert.equal(used.size, want.length); for (const m of want) assert.ok(used.has(m));
  root.traverse((o) => { if (o.isMesh) assert.equal(o.castShadow, false, 'no shadow caster added'); });
  root.traverse((o) => { if (o !== root) assert.ok(!o.name, 'unnamed: the bake takes it'); });
});

test('lights: the EXIT faces always lit, brighter in the dark; the emergency lenses only in the dark', () => {
  const { em } = build();
  assert.equal(em.exitMat.emissiveIntensity, EMERGENCY.exitOn);
  assert.equal(em.lensMat.emissiveIntensity, 0);
  assert.equal(em.glowMat.visible, false); assert.equal(em.exitGlowMat.visible, false);
  em.setLit(false);
  assert.equal(em.glowMat.visible, true); assert.equal(em.exitGlowMat.visible, true);
  assert.equal(em.exitMat.emissiveIntensity, EMERGENCY.exitOff);
  assert.equal(em.lensMat.emissiveIntensity, EMERGENCY.lensOff);
  em.setLit(true);
  assert.equal(em.lensMat.emissiveIntensity, 0);
});

test('every fitting on a wall face of its own room, clear of pillars, guns, stencil, terminals and the door signs', () => {
  const { em } = build();
  const guns = containmentMounts(B, 0);
  const PILLAR_Z = [-6, 0, 6, 12, 18, 24];
  assert.equal(em.parts.filter((p) => p.kind === 'exit').length, 2);
  assert.ok(em.parts.length >= 12);
  for (const p of em.parts) {
    const room = p.room === 'range' ? R : B, tag = `${p.kind} ${p.room} ${p.x},${p.z}`;
    // seated: on the wall line it faces off (the hangar's east faces stand 4 mm in, CJ-1), or the doorway pocket's face
    const onPocket = Math.abs(Math.abs(p.x - D.x) - POCKET) < 0.002 && p.z > D.minZ && p.z < D.maxZ;
    const face = p.nx === 1 ? room.minX : p.nx === -1 ? room.maxX - (p.room === 'build' ? 0.004 : 0) : p.nz === 1 ? room.minZ : room.maxZ;
    const along = p.nx ? p.x : p.z;
    const off = (along - face) * (p.nx || p.nz);   // + = into the room
    if (!onPocket) assert.ok(off >= 0 && off <= 0.0006, tag + ' seated within 0.5 mm off its wall face: ' + off);
    // inside the room's span along the wall, 0.6 m from the corners
    const run = p.nx ? p.z : p.x, lo = p.nx ? room.minZ : room.minX, hi = p.nx ? room.maxZ : room.maxX;
    assert.ok(run > lo + 0.6 && run < hi - 0.6, tag + ' inside its wall');
    assert.ok(p.y > 3 && p.y < 4.6, tag + ' above the fences and hands, under the lamp strips');
    if (p.room === 'build' && p.nx) for (const z of PILLAR_Z) assert.ok(Math.abs(p.z - z) > 0.9, tag + ' clear of the pillar at ' + z);
    if (p.room === 'build') for (const g of guns) {
      const sameWall = (g.wall === 'west' && p.nx === 1) || (g.wall === 'east' && p.nx === -1) || (g.wall === 'south' && p.nz === 1) || (g.wall === 'north' && p.nz === -1);
      if (sameWall) assert.ok(Math.hypot(p.x - g.x, p.z - g.z) > 2.5, tag + ' clear of the ' + g.wall + ' gun');
    }
    if (p.room === 'build' && p.nz === -1) assert.ok(Math.abs(p.x - (B.minX + B.maxX) / 2) > 6, tag + ' clear of the gate');
    if (p.room === 'range' && p.nz === 1) assert.ok(Math.abs(p.x) > 3.9, tag + ' clear of the PGB RANGE stencil');
    if (p.room === 'range' && p.nx === -1) assert.ok(p.z > -1.5, tag + ' clear of the terminals (z -11..-2)');
    if (p.room === 'range' && p.nx === 1 && !onPocket) assert.ok(p.z > D.maxZ + 1, tag + ' clear of the doorway');
    if (onPocket) assert.ok(p.kind === 'exit' && p.y > (p.nx === 1 ? 4.03 + 0.11 : 3.84 + 0.11), tag + ' above the door sign');
  }
});
