// game/survivor-system.test.mjs — AI-1 unit tests for survivor models, roof clearance,
// procedural animations, combat AI roles, med-drop, dawn maintenance, and fourth-pool dialogue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SURVIVOR_LOOK, SURVIVOR_ROOF_POSTS } from '../studio/survivor-models.js';
import { pickSurvivorRoofLine, bearingLabel, combatCalloutFor, OKAFOR_HEAL_LINES } from './survivor-dialogue.js';
import { pickRoofTarget, threatCalloutKind, computeMedDropSpot, applyPikeDawnMaintenance, SURVIVOR_WEAPON_CFG } from './survivor-behavior.js';
import { createSurvivorAnimState, updateRoofSurvivorAnim, updateWaitingSurvivorAnim } from './survivor-anim.js';

// Obstacle boxes on the HQ roof deck (from index.html L30942-31357)
const ROOF_OBSTACLES = [
  { name: 'whip-antenna', x0: -4.35, x1: -3.95, z0: 3.95, z1: 4.35 },
  { name: 'dish-base',    x0: -3.65, x1: -3.05, z0: 3.55, z1: 4.15 },
  { name: 'stack-1',      x0: -3.60, x1: -2.80, z0: 2.60, z1: 3.40 },
  { name: 'stack-2',      x0: -2.70, x1: -1.90, z0: 3.00, z1: 3.80 },
  { name: 'air-handler',  x0:  1.65, x1:  3.95, z0: 2.55, z1: 4.05 },
  { name: 'fan-SW',       x0: -3.60, x1: -2.40, z0: -3.20, z1: -2.00 },
  { name: 'fan-S',        x0: -0.20, x1:  1.00, z0: -3.80, z1: -2.60 },
  { name: 'klaxon-tower', x0:  0.65, x1:  2.55, z0: -1.75, z1:  0.15 }
];

function toPostWorld(P, lx, lz) {
  const ry = P.yaw;
  return {
    x: P.x + lx * Math.cos(ry) + lz * Math.sin(ry),
    z: P.z - lx * Math.sin(ry) + lz * Math.cos(ry)
  };
}

test('all three roof posts, bedrolls, crates, and M240B are 100% clear of HQ roof obstacles and satisfy t156 bounds', () => {
  const ladderLanding = { x: -4.6, z: 0 };
  const t156Cx = -0.25, t156Cz = 0, half = 5;

  for (const [who, P] of Object.entries(SURVIVOR_ROOF_POSTS)) {
    // t156 bounds: |x - (-0.25)| < 4.5, |z| < 4.5, dist from ladder > 3
    assert(Math.abs(P.x - t156Cx) < half - 0.5, `${who} x out of t156 roof bound: ${P.x}`);
    assert(Math.abs(P.z - t156Cz) < half - 0.5, `${who} z out of t156 roof bound: ${P.z}`);
    const dLad = Math.hypot(P.x - ladderLanding.x, P.z - ladderLanding.z);
    assert(dLad > 3.0, `${who} too close to ladder: ${dLad.toFixed(2)}`);

    // Check standing spot, bedroll, crate, and Brandt's M240B against every roof obstacle
    const checks = [
      ['stand', toPostWorld(P, 0, 0), 0.30],
      ['bedroll', toPostWorld(P, -0.64, -1.62), 0.32],
      ['crate', toPostWorld(P, 0.84, -0.58), 0.28]
    ];
    if (who === 'brandt') checks.push(['m240', toPostWorld(P, 0, 0.36), 0.32]);

    for (const [part, pt, r] of checks) {
      assert(Math.abs(pt.x) < 4.75 && Math.abs(pt.z) < 4.75, `${who} ${part} clipped parapet: (${pt.x.toFixed(2)}, ${pt.z.toFixed(2)})`);
      for (const o of ROOF_OBSTACLES) {
        const hit = pt.x + r > o.x0 && pt.x - r < o.x1 && pt.z + r > o.z0 && pt.z - r < o.z1;
        assert(!hit, `${who} ${part} (${pt.x.toFixed(2)}, ${pt.z.toFixed(2)}) overlaps ${o.name}`);
      }
    }
  }
});

test('SURVIVOR_LOOK preserves canonical identity & t159 invariants', () => {
  assert.equal(SURVIVOR_LOOK.brandt.cap, 'boonie');
  assert.equal(SURVIVOR_LOOK.brandt.eyewear, 'aviators');
  assert.equal(SURVIVOR_LOOK.brandt.sleeves, 'rolled');
  assert.equal(SURVIVOR_LOOK.brandt.rifle, false);
  assert.equal(SURVIVOR_LOOK.pike.cap, 'ballcapBack');
  assert.equal(SURVIVOR_LOOK.pike.gloves, false);
  assert.equal(SURVIVOR_LOOK.pike.rifle, true);
  assert.equal(SURVIVOR_LOOK.okafor.rifle, true);
  assert.equal(new Set(['okafor', 'brandt', 'pike'].map((w) => SURVIVOR_LOOK[w].skin + ':' + SURVIVOR_LOOK[w].hair)).size, 3);
});

test('fourth-pool dialogue prioritizes tags > milestones > named nights > camaraderie, respects once-per-run seen set', () => {
  const seen = new Set();
  // Active combat overrides everything
  const alert = pickSurvivorRoofLine('brandt', { awake: true, day: 7, seen });
  assert.equal(alert.mood, 'combat');

  // Price's tag (Pike's bunkmate) takes priority over Night 6 on day 7 (heavy suppresses light!)
  const priceLine = pickSurvivorRoofLine('pike', { day: 7, recentTags: ['iron:1'], seen });
  assert.match(priceLine.line, /Jonah/);
  assert.equal(priceLine.mood, 'heavy');

  // Calling again on day 7 advances to Night 6 milestone (since Price tag already marked seen)
  const night6 = pickSurvivorRoofLine('pike', { day: 7, recentTags: ['iron:1'], seen });
  assert.match(night6.line, /record/);

  // All 9 tags takes top priority
  const all9 = pickSurvivorRoofLine('okafor', { day: 12, tagCount: 9, seen });
  assert.match(all9.line, /Nine/);

  // Siege survived (day 19)
  const siege = pickSurvivorRoofLine('brandt', { day: 19, seen });
  assert.match(siege.line, /Heron/);

  // Fallback with no context returns null so caller uses canonical story.survivor.<who>.roof
  assert.equal(pickSurvivorRoofLine('okafor', { day: 4, talkCount: 0, crewWhos: ['okafor'] }), null);
  assert(OKAFOR_HEAL_LINES.length >= 3);
  assert.equal(bearingLabel(10, 2), 'east');
  assert.equal(bearingLabel(-2, 12), 'north');
  assert.match(combatCalloutFor('brandt', 'boss', 'east'), /240/);
});

test('role-specific roof targeting differentiates Brandt (heavies), Okafor (near player), and Pike (wall attackers)', () => {
  const hqPos = { x: 0, y: 0, z: 0 };
  const playerPos = { x: 2, y: 0, z: 10 };
  const builds = [{ x: 10, z: -8, hp: 60, maxHp: 100 }];
  const zombies = [
    { alive: true, type: 'shambler', hitH: 1.5, mesh: { position: { x: 0, y: 0, z: 9 } } },        // right beside player (Okafor!)
    { alive: true, type: 'brute',    hitH: 2.2, mesh: { position: { x: 14, y: 0, z: 2 } } },       // heavy threat (Brandt!)
    { alive: true, type: 'bomber',   hitH: 1.6, mesh: { position: { x: 10, y: 0, z: -7.5 } }, target: builds[0] } // hitting build (Pike!)
  ];
  const baseCtx = { zombies, hqPos, hqHeight: 5.4, fireRadius: 26, lineClear: () => true, playerPos, builds };

  assert.equal(pickRoofTarget('okafor', -0.4, 6.75, 4.1, baseCtx), zombies[0], 'Okafor prioritizes zombie near player');
  assert.equal(pickRoofTarget('brandt', 4.0, 6.5, 1.2, baseCtx), zombies[1], 'Brandt prioritizes Brute heavy');
  assert.equal(pickRoofTarget('pike', 4.0, 6.75, -4.0, baseCtx), zombies[2], 'Pike prioritizes Bomber attacking build');
  assert.equal(threatCalloutKind(zombies[1]), 'boss');
  assert.equal(threatCalloutKind(zombies[2]), 'bomber');
  assert.equal(threatCalloutKind(zombies[0]), null);
  assert(SURVIVOR_WEAPON_CFG.brandt.burst >= 4);
});

test('Okafor combat med-drop lands outside HQ footprint on dry ground', () => {
  const hqPos = { x: 0, y: 0, z: 0 };
  const spot = computeMedDropSpot({ x: 8, y: 0, z: 12 }, hqPos, 5, () => 0.2, () => 0);
  assert(spot && Number.isFinite(spot.x) && Number.isFinite(spot.z));
  assert(Math.abs(spot.x) >= 6.5 || Math.abs(spot.z) >= 6.5, 'must clear HQ walls');
  // Too far from HQ returns null
  assert.equal(computeMedDropSpot({ x: 40, y: 0, z: 40 }, hqPos, 5, () => 0, () => 0), null);
  // Deep water returns null
  assert.equal(computeMedDropSpot({ x: 8, y: 0, z: 10 }, hqPos, 5, () => 0, () => 1.5), null);
});

test('Pike dawn field-maintenance patches up to 3 most-damaged structures near HQ without exceeding maxHp', () => {
  const builds = [
    { x: 6, z: 6, hp: 20, maxHp: 100 },
    { x: -7, z: 5, hp: 50, maxHp: 100 },
    { x: 5, z: -8, hp: 90, maxHp: 100 },
    { x: 9, z: 0, hp: 95, maxHp: 100 },
    { x: 50, z: 50, hp: 10, maxHp: 100 } // too far from HQ
  ];
  const res = applyPikeDawnMaintenance(builds, { x: 0, z: 0 });
  assert.equal(res.repairedCount, 3);
  assert.equal(builds[0].hp, 40);
  assert.equal(builds[1].hp, 70);
  assert.equal(builds[2].hp, 100); // capped at maxHp
  assert.equal(builds[3].hp, 95);  // 4th untouched
  assert.equal(builds[4].hp, 10);  // out of radius untouched
});

test('procedural survivor anim updates grounded joints safely across combat, daytime resting, and rescue waiting', () => {
  const mkNode = () => ({
    position: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    visible: true,
    userData: {}
  });
  const mkFig = () => {
    const m = mkNode();
    m.userData = {
      legLG: mkNode(), legRG: mkNode(), kneeLG: mkNode(), kneeRG: mkNode(),
      ankleLG: mkNode(), ankleRG: mkNode(), lowerBody: mkNode(),
      torsoG: mkNode(), headG: mkNode(), armLG: mkNode(), armRG: mkNode(),
      elbowLG: mkNode(), elbowRG: mkNode(),
      survivorHeldRifle: mkNode(), survivorSlungRifle: mkNode(), torsoPivotY: 0.865
    };
    return m;
  };
  // Okafor daytime -> alert -> reload transitions
  const fig = mkFig();
  const r = { who: 'okafor', figure: fig, root: mkNode(), pivot: mkNode(), awake: false, anim: createSurvivorAnimState('okafor', 1) };
  updateRoofSurvivorAnim(r, 0.03, { onHqRoof: true, playerPos: { x: 0, z: 2 }, postPos: { x: -0.4, z: 4.1 } });
  assert.equal(fig.userData.survivorHeldRifle.visible, false, 'daytime: M4 stays slung');
  assert.equal(fig.userData.survivorSlungRifle.visible, true);
  assert.equal(r.pivot.rotation.x, 0, 'daytime: never tipped -90 deg flat on back');

  r.awake = true; r.hasTarget = true; r.aimLocalYaw = 0.3; r.aimPitch = -0.25;
  updateRoofSurvivorAnim(r, 0.03, { onHqRoof: false, playerPos: { x: 0, z: 12 }, postPos: { x: -0.4, z: 4.1 } });
  assert.equal(fig.userData.survivorHeldRifle.visible, true, 'alert: M4 unslung into hands');
  assert.equal(fig.userData.survivorSlungRifle.visible, false);

  // Brandt orbiting behind M240B
  const bFig = mkFig();
  const gun = mkNode(); gun.position.set(0, 0, 0.36); gun.userData.feedCover = mkNode();
  const br = { who: 'brandt', figure: bFig, root: mkNode(), pivot: mkNode(), gun, awake: true, hasTarget: true, aimLocalYaw: 0.6, aimPitch: -0.2 };
  for (let i = 0; i < 30; i++) updateRoofSurvivorAnim(br, 0.05, {});
  assert(Math.hypot(br.pivot.position.x - gun.position.x, br.pivot.position.z - gun.position.z) > 0.45, 'Brandt orbits behind M240B');

  // Waiting survivor in valley: crouched with guards, rising when safe & player close
  const wFig = mkFig();
  const ws = { who: 'pike', figure: wFig, root: mkNode(), x: 10, z: 10, camp: 1 };
  for (let i = 0; i < 40; i++) updateWaitingSurvivorAnim(ws, 0.05, { guardsAlive: true, playerPos: { x: 30, z: 30 } });
  assert(ws.anim.crouchBlend > 0.75, 'hunkers down while guards live');
  for (let i = 0; i < 50; i++) updateWaitingSurvivorAnim(ws, 0.05, { guardsAlive: false, playerPos: { x: 12, z: 15 } });
  assert(ws.anim.crouchBlend < 0.25, 'rises and beckons when guards clear and player nears');
});
