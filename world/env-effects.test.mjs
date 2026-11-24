import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isOutdoorsForWeather,
  getShelterCeilingY,
  isUnderShelter,
  leafFloorHeight,
  computeWindStrength,
  computeRainTilt,
  computeRainLook,
  computeStormFogTarget,
  computeCloudLook,
  computeWaterEnv,
  computeLightningBoltPaths,
  makeLeafAlphaTexture,
  makeScorchTexture,
  makeRippleTexture,
  makePuddleTextureV2,
  makeCloudNoiseTexture,
} from './env-effects.js';

test('isOutdoorsForWeather blocks rain/lightning in Training Ground and underground Hollows', () => {
  assert.equal(isOutdoorsForWeather({ trainingActive: false, hollowFloor: null }), true);
  assert.equal(isOutdoorsForWeather({ trainingActive: true, hollowFloor: null }), false);
  assert.equal(isOutdoorsForWeather({ trainingActive: false, hollowFloor: () => -400 }), false);
});

test('getShelterCeilingY detects HQ cabin and roofed/platform buildables', () => {
  const house = { active: true, group: { position: { x: 0, y: 0, z: 0 } } };
  const builds = [
    { alive: true, type: 'floor', level: 0, x: 10, z: 10, deck: { deckY: 0.25 } }, // ground floor is NOT a roof
    { alive: true, type: 'floor', level: 1, x: 20, z: 20, deck: { deckY: 3.1 } },  // upper floor IS a roof
    { alive: true, type: 'platform', level: 0, x: 30, z: 30, deck: { deckY: 1.6 } },
  ];
  assert.equal(isUnderShelter(0.5, -0.5, { house, builds }), true);
  assert.equal(getShelterCeilingY(0.5, -0.5, { house, builds }), 3.4);
  assert.equal(isUnderShelter(10, 10, { house, builds }), false, 'ground floor does not shelter from rain');
  assert.equal(isUnderShelter(20.4, 19.6, { house, builds }), true, 'second-storey roof shelters below');
  assert.equal(getShelterCeilingY(20.4, 19.6, { house, builds }), 3.1);
  assert.equal(isUnderShelter(30, 30, { house, builds }), true, 'elevated turret platform shelters below');
  assert.equal(isUnderShelter(50, 50, { house, builds }), false);
});

test('leafFloorHeight floats leaves on water surfaces instead of sinking to lake bed', () => {
  assert.equal(leafFloorHeight(-6.5, -3.4), -3.375);
  assert.equal(leafFloorHeight(2.0, null), 2.0);
  assert.equal(leafFloorHeight(2.0, -3.4), 2.0);
});

test('computeWindStrength preserves calm breeze and prevents gale from collapsing in ambient troughs', () => {
  assert.equal(computeWindStrength(0.62, 0, 0.5, 0.6), 0.62, 'calm wind matches ambient breeze exactly');
  const galeAtTrough = computeWindStrength(0.02, 0.95, 0.2, 0.6);
  assert.ok(galeAtTrough > 1.05, `gale at ambient trough must stay a real gale (>1.05), got ${galeAtTrough}`);
  const galeAtMean = computeWindStrength(0.50, 1.0, 0.5, 0.6);
  assert.ok(galeAtMean > 1.3 && galeAtMean < 1.8, `gale at mean stays realistic, got ${galeAtMean}`);
});

test('computeRainTilt leans top of falling streak upwind and drifts drops downwind', () => {
  // Wind blowing along +X: top of streak (+Y) must rotate toward -X (tiltZ > 0), driftX > 0
  const ex = computeRainTilt(1, 0, 1.0);
  assert.ok(ex.tiltZ > 0, `expected tiltZ > 0 for +X wind, got ${ex.tiltZ}`);
  assert.ok(Math.abs(ex.tiltX) < 1e-9);
  assert.ok(ex.driftX > 0);

  // Wind blowing along +Z: top of streak (+Y) must rotate toward -Z (tiltX < 0), driftZ > 0
  const ez = computeRainTilt(0, 1, 1.0);
  assert.ok(ez.tiltX < 0, `expected tiltX < 0 for +Z wind, got ${ez.tiltX}`);
  assert.ok(Math.abs(ez.tiltZ) < 1e-9);
  assert.ok(ez.driftZ > 0);

  // Stronger gale produces steeper lean and faster horizontal drift
  const calm = computeRainTilt(1, 0, 0.2);
  const gale = computeRainTilt(1, 0, 1.6);
  assert.ok(gale.lean > calm.lean && gale.driftX > calm.driftX);
});

test('computeStormFogTarget never brightens midnight to daytime grey and never widens Fog Night', () => {
  // Night storm without NVG: must tighten (<= 65m) and stay dark stormy blue (low luminance!)
  const nightStorm = computeStormFogTarget({
    isNight: true, nvgActive: false, bloodMoon: false,
    baseFogNear: 18, baseFogFar: 65, fogNightK: 0, intensity: 1,
  });
  assert.ok(nightStorm.far <= 65, `night rain must not widen fog beyond 65m, got ${nightStorm.far}`);
  assert.ok(nightStorm.r < 0.12 && nightStorm.g < 0.15 && nightStorm.b < 0.20, 'night rain fog stays dark');

  // Fog Night (32m) + full rain: must NEVER widen past 32m!
  const fogNightRain = computeStormFogTarget({
    isNight: true, nvgActive: false, bloodMoon: false,
    baseFogNear: 6, baseFogFar: 32, fogNightK: 1, intensity: 1,
  });
  assert.ok(fogNightRain.far <= 32.01, `rain must never widen Fog Night 32m far, got ${fogNightRain.far}`);
  assert.ok(fogNightRain.near <= 6.01, `rain must never widen Fog Night 6m near, got ${fogNightRain.near}`);

  // Blood Moon storm: red channel dominates blue
  const bmStorm = computeStormFogTarget({
    isNight: true, nvgActive: false, bloodMoon: true,
    baseFogNear: 18, baseFogFar: 65, fogNightK: 0, intensity: 1,
  });
  assert.ok(bmStorm.r > bmStorm.b * 2, 'blood moon storm fog keeps crimson hue');

  // NVG storm: green channel dominates
  const nvgStorm = computeStormFogTarget({
    isNight: true, nvgActive: true, bloodMoon: false,
    baseFogNear: 50, baseFogFar: 160, fogNightK: 0, intensity: 1,
  });
  assert.ok(nvgStorm.g > nvgStorm.r && nvgStorm.g > nvgStorm.b, 'NVG storm fog stays green-tinted');
});

test('computeCloudLook, computeRainLook, and computeWaterEnv respond coherently across all moods', () => {
  const dayCloud = computeCloudLook({ nightMix: 0, storm: 0, flash: 0 });
  const nightStormCloud = computeCloudLook({ nightMix: 1, storm: 1, flash: 0 });
  const flashCloud = computeCloudLook({ nightMix: 1, storm: 1, flash: 1 });
  assert.ok(nightStormCloud.r < 0.15 && nightStormCloud.b < 0.25, 'night storm clouds are brooding dark, not bright grey');
  assert.ok(flashCloud.emissiveIntensity > nightStormCloud.emissiveIntensity + 0.5, 'lightning flashes clouds bright');
  assert.ok(dayCloud.r > 0.9);

  const dayRain = computeRainLook({ nightMix: 0, intensity: 1 });
  const nightRain = computeRainLook({ nightMix: 1, intensity: 1 });
  const flashRain = computeRainLook({ nightMix: 1, flash: 1, intensity: 1 });
  assert.ok(nightRain.b < dayRain.b * 0.7, 'night rain is significantly dimmer than daytime rain');
  assert.ok(flashRain.r > 0.8 && flashRain.opacity > nightRain.opacity, 'lightning illuminates rain streaks');

  const dayWater = computeWaterEnv({
    skyMid: { r: 0.53, g: 0.72, b: 1.0 }, skyHorizon: { r: 0.85, g: 0.91, b: 1.0 },
    nightMix: 0, dusk: 0, storm: 0, windStrength: 0.5,
  });
  const bloodWater = computeWaterEnv({
    skyMid: { r: 0.16, g: 0.03, b: 0.04 }, skyHorizon: { r: 0.28, g: 0.05, b: 0.06 },
    nightMix: 1, dusk: 0, storm: 0, bloodMoon: true, windStrength: 0.5,
  });
  const stormWater = computeWaterEnv({
    skyMid: { r: 0.53, g: 0.72, b: 1.0 }, skyHorizon: { r: 0.85, g: 0.91, b: 1.0 },
    nightMix: 0, dusk: 0, storm: 1, windStrength: 1.5,
  });
  assert.ok(bloodWater.skyR > bloodWater.skyB * 2, 'Blood Moon water reflects crimson sky, not midday blue');
  assert.ok(bloodWater.bodyLight < dayWater.bodyLight * 0.5, 'Night water dims naturally');
  assert.ok(stormWater.chop > dayWater.chop * 1.5, 'Storm & gale whip up water chop');
  assert.ok(stormWater.spec < dayWater.spec * 0.4, 'Heavy storm overcast damps direct sun glare');
});

test('computeLightningBoltPaths generates detailed branching geometry pinned to exact impact spot', () => {
  let s = 42;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  const from = { x: 0, y: 72, z: 0 };
  const to = { x: 12, y: 2, z: -8 };
  const paths = computeLightningBoltPaths(from, to, rnd);
  assert.ok(paths.length >= 4, `expected main trunk + >=2 forks + sub-twig, got ${paths.length}`);
  assert.equal(paths[0].length, 23, '22 segments -> 23 points on main bolt');
  assert.equal(paths[1].length, 11, '10 segments -> 11 points on jagged primary fork');
  assert.equal(paths[paths.length - 1].length, 6, '5 segments -> 6 points on secondary twig');
  assert.deepEqual(paths[0][0], from);
  assert.deepEqual(paths[0][paths[0].length - 1], to);
});

test('procedural canvas texture helpers fail safely in Node / fakethree environments', () => {
  const standIn = { STAND_IN: true, CanvasTexture() {} };
  assert.equal(makeLeafAlphaTexture(standIn), null);
  assert.equal(makeScorchTexture(standIn), null);
  assert.equal(makeRippleTexture(standIn), null);
  assert.equal(makePuddleTextureV2(standIn, 123), null);
  assert.equal(makeCloudNoiseTexture(standIn), null);
});
