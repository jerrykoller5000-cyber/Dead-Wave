import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MINIMAP_ZOOMS,
  headingDisplay,
  projectMinimapBearing,
  createMinimapState,
  bakeTopographicMap,
  drawBreadcrumbTrail,
  drawMinimapReticle,
  drawCompassDial,
  drawHqMarker,
  drawKioskMarker,
  drawSupplyDropMarker,
  drawEnemyBlip,
  drawPlayerArrow,
  drawHollowMinimap,
  drawHollowFullMap,
} from './minimap-kit.js';

function makeMockCtx() {
  const calls = [];
  let depth = 0;
  const ctx = {
    calls,
    get depth() { return depth; },
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', lineJoin: 'miter',
    font: '', textAlign: 'start', textBaseline: 'alphabetic', globalAlpha: 1,
    save() { depth++; calls.push('save'); },
    restore() { depth--; calls.push('restore'); },
    beginPath() { calls.push('beginPath'); },
    closePath() { calls.push('closePath'); },
    moveTo(...a) { calls.push(['moveTo', ...a]); },
    lineTo(...a) { calls.push(['lineTo', ...a]); },
    arc(...a) { calls.push(['arc', ...a]); },
    fill() { calls.push('fill'); },
    stroke() { calls.push('stroke'); },
    clip() { calls.push('clip'); },
    fillRect(...a) { calls.push(['fillRect', ...a]); },
    strokeRect(...a) { calls.push(['strokeRect', ...a]); },
    translate(...a) { calls.push(['translate', ...a]); },
    rotate(a) { calls.push(['rotate', a]); },
    scale(...a) { calls.push(['scale', ...a]); },
    setLineDash(a) { calls.push(['setLineDash', a]); },
    strokeText(...a) { calls.push(['strokeText', ...a]); },
    fillText(...a) { calls.push(['fillText', ...a]); },
    createRadialGradient() { return { addColorStop() {} }; },
    createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData(img) { calls.push(['putImageData', img.width, img.height]); ctx.lastImg = img; },
  };
  return ctx;
}

test('headingDisplay matches Grave Shift compass handedness (North +z, East -x)', () => {
  assert.equal(headingDisplay(0).label, 'N 000°');
  assert.equal(headingDisplay(-Math.PI / 2).label, 'E 090°');
  assert.equal(headingDisplay(Math.PI).label, 'S 180°');
  assert.equal(headingDisplay(Math.PI / 2).label, 'W 270°');
  assert.equal(headingDisplay(-Math.PI / 4).cardinal, 'NE');
  assert.equal(headingDisplay(NaN).label, 'N 000°');
});

test('createMinimapState manages smooth zoom transitions, North-Up toggle, and storage persistence', () => {
  const store = new Map();
  const storage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
  };
  const s = createMinimapState({ storage });
  assert.equal(s.targetRadius(), 50);
  assert.equal(s.radius(), 50);
  assert.equal(s.northUp(), false);
  assert.equal(s.isAnimating(), false);

  // Zoom out to wide 85 m and verify smooth interpolation
  s.zoomOut();
  assert.equal(s.targetRadius(), MINIMAP_ZOOMS[2]);
  assert.equal(s.isAnimating(), true);
  assert.equal(s.step(0.05), true);
  assert.ok(s.radius() > 50 && s.radius() < 85);
  for (let i = 0; i < 40; i++) s.step(0.03);
  assert.equal(s.radius(), 85);
  assert.equal(s.isAnimating(), false);

  // Zoom in twice clamps cleanly at 35 m
  s.zoomIn(); s.zoomIn(); s.zoomIn();
  assert.equal(s.targetRadius(), 35);

  // North-Up toggle persists across sessions
  s.toggleNorthUp();
  assert.equal(s.northUp(), true);
  const restored = createMinimapState({ storage });
  assert.equal(restored.targetRadius(), 35);
  assert.equal(restored.northUp(), true);
});

test('breadcrumb trail records spaced footsteps, caps length, and resets cleanly on teleport jumps', () => {
  const s = createMinimapState({ storage: null, maxTrail: 5, trailSpacing: 3, jumpReset: 20 });
  assert.equal(s.pushTrail(0, 0), true);
  assert.equal(s.pushTrail(1, 0), false); // < 3 m spacing ignored
  for (let i = 1; i <= 8; i++) s.pushTrail(i * 4, 0);
  assert.equal(s.trail().length, 5);
  assert.equal(s.trail()[0].x, 16);
  assert.equal(s.trail()[4].x, 32);

  // Teleport jump > 20 m starts a fresh trail without streaking across the valley
  s.pushTrail(150, 150);
  assert.equal(s.trail().length, 1);
  assert.deepEqual(s.trail()[0], { x: 150, z: 150 });
  s.resetTrail();
  assert.equal(s.trail().length, 0);
});

test('projectMinimapBearing clamps far targets to the rim with accurate rotating angles', () => {
  const proj = { x: 0, z: 0, yaw: 0, center: 164, scale: 3, rim: 140 };
  const near = projectMinimapBearing({ x: 0, z: 20 }, proj);
  assert.equal(near.edge, false);
  assert.ok(Math.abs(near.x - 164) < 1e-6 && Math.abs(near.y - 104) < 1e-6);

  const farNorth = projectMinimapBearing({ x: 0, z: 120 }, proj);
  assert.equal(farNorth.edge, true);
  assert.ok(Math.abs(farNorth.x - 164) < 1e-6 && Math.abs(farNorth.y - 24) < 1e-6);
});

test('bakeTopographicMap samples height once per in-circle pixel and renders water, contours, trees, and roads', () => {
  const ctx = makeMockCtx();
  const canvas = { getContext: () => ctx };
  let heightCalls = 0;
  const bakePx = 64;
  bakeTopographicMap(canvas, {
    mapR: 100,
    bakePx,
    sampleHeight: (x, z) => { heightCalls++; return (x + z) * 0.15; },
    waterLevelAt: (x, z) => (x * x + z * z < 400 ? 0.5 : null),
    paths: [[{ x: -40, z: 0 }, { x: 40, z: 0 }]],
    trees: [{ x: 20, z: 20, kind: 'pine', canopyRadius: 2.5 }, { x: -20, z: 25, kind: 'autumn', canopyRadius: 2.2 }],
  });
  // Single-pass sampling: strictly fewer calls than total pixels (only inside circle + 2m pad)
  assert.ok(heightCalls > 0 && heightCalls <= bakePx * bakePx, `expected <= ${bakePx * bakePx} height calls, got ${heightCalls}`);
  assert.ok(ctx.lastImg && ctx.lastImg.width === bakePx);
  // Center pixel is water (alpha > 0, blue > green)
  const mid = (32 * bakePx + 32) * 4;
  assert.ok(ctx.lastImg.data[mid + 3] > 200);
  assert.ok(ctx.lastImg.data[mid + 2] > ctx.lastImg.data[mid]);
  assert.equal(ctx.depth, 0);
});

test('tactical icons, reticle, compass dial, and Hollows sonar radar draw cleanly with balanced canvas state', () => {
  const ctx = makeMockCtx();
  const toLocal = (x, z) => (Math.hypot(x, z) <= 50 ? { x: 164 - x * 3, y: 164 - z * 3 } : null);
  const proj = { x: 0, z: 0, yaw: 0, center: 164, scale: 3, rim: 150 };

  drawBreadcrumbTrail(ctx, [{ x: 0, z: 0 }, { x: 5, z: 5 }, { x: 10, z: 10 }], toLocal);
  drawMinimapReticle(ctx, { center: 164, radiusPx: 162, worldRadius: 50 });
  drawHqMarker(ctx, { x: 0, z: 20 }, toLocal, proj);
  drawHqMarker(ctx, { x: 0, z: 120 }, toLocal, proj); // off-screen home rim chevron
  drawKioskMarker(ctx, { x: 5, z: 18 }, toLocal);
  drawSupplyDropMarker(ctx, { x: 10, z: 10, state: 'landed' }, toLocal, proj, { timeMs: 350 });
  drawSupplyDropMarker(ctx, { x: 90, z: 90, state: 'landed' }, toLocal, proj, { timeMs: 350 }); // off-screen rim arrow
  drawEnemyBlip(ctx, { x: 140, y: 120 }, 'shambler', { pulse: 0.6 });
  drawEnemyBlip(ctx, { x: 150, y: 120 }, 'brute', { pulse: 0.6 });
  drawEnemyBlip(ctx, { x: 160, y: 120 }, 'colossus', { pulse: 0.6 });
  drawPlayerArrow(ctx, { x: 164, y: 164 }, 0.3, 1);
  drawCompassDial(ctx, { center: 164, radiusPx: 162, mapYaw: 0.4 });
  drawHollowMinimap(ctx, {
    warren: {
      theme: 'iron',
      cell: 7.5,
      nav: { ox: 0, oz: 0 },
      cells: [
        { i: 0, j: 0, depth: 1, kind: 'tunnel', open: [false, true, false, false] },
        { i: 1, j: 0, depth: 1, kind: 'ramp', open: [false, false, false, true] },
        { i: 1, j: 1, depth: 2, kind: 'chamber', open: [true, false, false, false] },
      ],
      exits: { mouth: { x: 3.75, z: 3.75 } },
    },
    state: { depth: 1, explored: ['0,0', '1,0'], cleared: true },
    px: 4, pz: 4, mapYaw: 0, center: 164, scale: 3.2, radiusPx: 162, rim: 148, timeMs: 500,
    nests: [{ x: 10, z: 10, alive: true }],
    claimed: { box: false, crates: new Set(), tags: new Set() },
    stirPhase: 'warning',
  });
  drawHollowFullMap(ctx, {
    width: 600, height: 600,
    warren: {
      theme: 'iron', cell: 7.5, nav: { ox: 0, oz: 0 },
      cells: [
        { i: 0, j: 0, depth: 1, kind: 'tunnel', open: [false, true, false, false] },
        { i: 1, j: 0, depth: 1, kind: 'ramp', open: [false, false, false, true] },
      ],
      exits: { mouth: { x: 3.75, z: 3.75 }, boltHoles: [{ x: 11, z: 3.75 }], deep: { x: 12, z: 4 } },
      points: { strongbox: { x: 9, z: 4 }, crates: [{ x: 4, z: 4 }], tags: [{ x: 5, z: 4 }] },
      doors: { rune: { x: 12, z: 5 } },
    },
    state: { depth: 1, explored: ['0,0', '1,0'], cleared: true },
    px: 4, pz: 4, yaw: 0.4, timeMs: 500,
    nests: [{ x: 8, z: 4, alive: true }],
    claimed: { box: false, crates: new Set(), tags: new Set() },
    stirPhase: 'warning',
    legend: 'WARREN RADAR', sub: 'LEGEND',
  });

  assert.equal(ctx.depth, 0, 'all save/restore pairs must stay balanced');
  assert.ok(ctx.calls.some((c) => Array.isArray(c) && c[0] === 'fillText' && c[1] === 'WARREN RADAR'));
  assert.ok(ctx.calls.some((c) => Array.isArray(c) && c[0] === 'fillText' && c[1] === 'N'));
  assert.ok(ctx.calls.some((c) => Array.isArray(c) && c[0] === 'fillText' && c[1] === '25m'));
});
