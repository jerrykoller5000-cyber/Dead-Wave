import test from 'node:test';
import assert from 'node:assert/strict';
import { getFobPBR, _TEST_FOB_SYNTH } from './fob-textures.js';
import * as FakeThree from '../tools/tests/fakethree.mjs';

test('FOB Threshold pixel synthesizers are deterministic, non-flat, and physically valid', () => {
  const t0 = performance.now();
  const conc = _TEST_FOB_SYNTH.buildBunkerConcretePixels(512, 'wall');
  const concBase = _TEST_FOB_SYNTH.buildBunkerConcretePixels(512, 'base');
  const roof = _TEST_FOB_SYNTH.buildRoofDeckPixels(512);
  const steel = _TEST_FOB_SYNTH.buildBunkerSteelPixels(512, 'steel');
  const armor = _TEST_FOB_SYNTH.buildBunkerSteelPixels(512, 'armor');
  const galv = _TEST_FOB_SYNTH.buildGalvSteelPixels(256);
  const haz = _TEST_FOB_SYNTH.buildHazardEnamelPixels(256);
  const chev = _TEST_FOB_SYNTH.buildHazardChevronPixels(512, 128);
  const olive = _TEST_FOB_SYNTH.buildWrinkleOlivePixels(256);
  const wood = _TEST_FOB_SYNTH.buildDeskWoodPixels(256);
  const pcb = _TEST_FOB_SYNTH.buildEtchedPCBPixels(256);
  const ms = performance.now() - t0;
  console.log(`FOB Threshold full PBR synthesis: ${ms.toFixed(1)} ms`);
  assert.ok(ms < 1200, `FOB texture synthesis stayed fast (${ms.toFixed(1)} ms)`);

  for (const [name, p] of [
    ['conc', conc], ['concBase', concBase], ['roof', roof], ['steel', steel],
    ['armor', armor], ['galv', galv], ['haz', haz], ['chev', chev],
    ['olive', olive], ['wood', wood], ['pcb', pcb],
  ]) {
    assert.equal(p.albedo.length, p.w * p.h * 4, `${name} albedo length`);
    assert.equal(p.orm.length, p.w * p.h * 4, `${name} orm length`);
    assert.equal(p.height.length, p.w * p.h, `${name} height length`);
    let hMin = 1, hMax = 0, rMin = 255, rMax = 0;
    for (let i = 0; i < p.height.length; i++) {
      const h = p.height[i];
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
      const r = p.orm[i * 4 + 1];
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
    }
    assert.ok(hMax - hMin > 0.15, `${name} has genuine surface relief (${(hMax - hMin).toFixed(3)})`);
    assert.ok(rMax - rMin >= 18, `${name} has roughness variation (${rMin}..${rMax})`);
  }

  // Determinism check
  const conc2 = _TEST_FOB_SYNTH.buildBunkerConcretePixels(128, 'wall');
  const conc3 = _TEST_FOB_SYNTH.buildBunkerConcretePixels(128, 'wall');
  assert.deepEqual(conc2.albedo, conc3.albedo, 'concrete synthesis is deterministic');
});

test('Lockdown door and signage relief maps carry claw gouges and valid ranges', () => {
  const door = _TEST_FOB_SYNTH.buildLockdownDoorRelief(384, 640);
  let maxClaw = 0, minRgh = 255, maxMet = 0;
  for (let i = 0; i < door.claw.length; i++) {
    if (door.claw[i] > maxClaw) maxClaw = door.claw[i];
    if (door.orm[i * 4 + 1] < minRgh) minRgh = door.orm[i * 4 + 1];
    if (door.orm[i * 4 + 2] > maxMet) maxMet = door.orm[i * 4 + 2];
  }
  assert.ok(maxClaw > 0.8, 'lockdown door carries deep claw gouges');
  assert.ok(minRgh < 70 && maxMet > 180, 'exposed steel inside claw marks is glossy & metallic');

  const plate = _TEST_FOB_SYNTH.buildPlateRelief(256, 48);
  const duty = _TEST_FOB_SYNTH.buildDutyBoardRelief(128, 120);
  const radio = _TEST_FOB_SYNTH.buildRadioFaceRelief(128, 80);
  assert.equal(plate.orm.length, 256 * 48 * 4);
  assert.equal(duty.orm.length, 128 * 120 * 4);
  assert.equal(radio.orm.length, 128 * 80 * 4);
});

test('getFobPBR degrades gracefully on stand-in THREE and caches with DataTexture', () => {
  assert.equal(getFobPBR(FakeThree), null, 'returns null on stand-in THREE');
  class MockDataTexture {
    constructor(data, w, h) { this.data = data; this.width = w; this.height = h; }
  }
  class MockVec2 { constructor(x, y) { this.x = x; this.y = y; } }
  const mockT = {
    DataTexture: MockDataTexture,
    Vector2: MockVec2,
    RGBAFormat: 1, UnsignedByteType: 2, SRGBColorSpace: 'srgb', NoColorSpace: 'lin',
    RepeatWrapping: 10, ClampToEdgeWrapping: 11, LinearFilter: 20, LinearMipmapLinearFilter: 21,
  };
  const a = getFobPBR(mockT);
  const b = getFobPBR(mockT);
  assert.ok(a && a === b, 'caches PBR pack per THREE instance');
  assert.ok(a.bunkerConcrete.map && a.bunkerConcrete.normalMap && a.bunkerConcrete.ormMap);
  assert.ok(a.armorPlate.map && a.bunkerRoofDeck.map && a.hazardChevron.map);
  assert.ok(a.lockdownDoorRelief.normalMap && a.designationRelief.normalMap);
  const opts = a.bunkerConcrete.opts({ color: 0x999999, normalScale: 1.1 });
  assert.equal(opts.map, a.bunkerConcrete.map);
  assert.equal(opts.normalScale.x, 1.1);
});
