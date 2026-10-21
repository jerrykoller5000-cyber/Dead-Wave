import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraw, drawSourceOf, reachPoint, DRAW_TIMES } from './marine-draw.js';

const load = { primary: ['m4', 'shotgun'], secondary: ['uzi', 'revolver'] };

test('each gun is drawn from where it lives', () => {
  assert.deepEqual(drawSourceOf('pistol', load), { at: 'hip', slot: 0 });
  assert.deepEqual(drawSourceOf('uzi', load), { at: 'chest', slot: 0 });
  assert.deepEqual(drawSourceOf('revolver', load), { at: 'chest', slot: 1 });
  assert.deepEqual(drawSourceOf('m4', load), { at: 'back', slot: 0 });
  assert.deepEqual(drawSourceOf('shotgun', load), { at: 'back', slot: 1 });
  assert.equal(drawSourceOf('minigun', load).at, null);   // not carried (a debug grant): no move
  assert.equal(drawSourceOf(null, load).at, null);
  for (const at of ['hip', 'chest', 'back']) assert.ok(reachPoint(at, 0) && reachPoint(at, 1));
  assert.ok(reachPoint('back', 0).y > 1.2 && reachPoint('hip', 0).y < 0.8 && reachPoint('hip', 0).x < 0);
});

test('a switch puts the old gun away, then takes the new one and brings it up', () => {
  const d = createDraw();
  assert.ok(d.start('m4', 'pistol', load));
  const seen = [];
  let f = d.frame();
  assert.equal(f.inHand, 'm4'); assert.equal(f.w, 0);
  let peak = 0;
  for (let i = 0; i < 200 && d.state.active; i++) {
    seen.push(...d.step(1 / 60));
    f = d.frame();
    if (d.state.active) peak = Math.max(peak, f.w);
    if (seen.includes('release') && !seen.includes('grab')) assert.equal(f.inHand, null, 'between the two, nothing in hand');
  }
  assert.deepEqual(seen, ['release', 'grab']);
  assert.ok(peak > 0.99, 'the arm reaches the slots');
  assert.equal(d.frame().inHand, 'pistol');
  assert.equal(d.frame().w, 0, 'and ends back in the hold');
  const total = DRAW_TIMES.stow + DRAW_TIMES.reach.hip + DRAW_TIMES.raise;
  assert.ok(Math.abs(d.state.total - total) < 1e-9);
});

test('the hand travels from the back to the hip between release and grab', () => {
  const d = createDraw(); d.start('m4', 'pistol', load);
  d.step(DRAW_TIMES.stow - 0.001);
  const atBack = d.frame().target;
  assert.ok(atBack.y > 1.2);
  d.step(0.002 + DRAW_TIMES.reach.hip - 0.004);
  const nearHip = d.frame().target;
  assert.ok(nearHip.y < 0.8, 'at the hip before the grab: ' + nearHip.y);
  assert.ok(d.frame().twistY > 0.3, 'he turns into the hip draw');
});

test('going unarmed is a stow alone; drawing from unarmed is a draw alone; nothing to reach is no move', () => {
  const a = createDraw(); a.start('uzi', null, load);
  const ev = []; for (let i = 0; i < 100 && a.state.active; i++) ev.push(...a.step(1 / 60));
  assert.deepEqual(ev, ['release']); assert.equal(a.frame().inHand, null);
  const b = createDraw(); b.start(null, 'shotgun', load);
  assert.equal(b.frame().inHand, null);
  const ev2 = []; for (let i = 0; i < 100 && b.state.active; i++) ev2.push(...b.step(1 / 60));
  assert.deepEqual(ev2, ['grab']); assert.equal(b.frame().inHand, 'shotgun');
  const c = createDraw();
  assert.equal(c.start('minigun', 'flamer', load), false);
  assert.equal(c.state.active, false);
});

test('one big step fires both events once, and a cancel ends it', () => {
  const d = createDraw(); d.start('revolver', 'm4', load);
  assert.deepEqual(d.step(5), ['release', 'grab']);
  assert.equal(d.state.active, false);
  assert.deepEqual(d.step(1), []);
  d.start('pistol', 'uzi', load); d.step(0.05); d.cancel();
  assert.equal(d.state.active, false); assert.equal(d.frame().w, 0);
});

test('CL-122: with a place lookup the hand goes to where the gun really is, keeping the table\'s twist', () => {
  const asked = [];
  const place = (kind, at, slot) => { asked.push(kind + '@' + at + slot); return kind === 'uzi' ? { x: 0.05, y: 1.1, z: -0.3 } : null; };
  const d = createDraw({ place }); d.start('m4', 'uzi', load);
  d.step(DRAW_TIMES.stow - 0.001);
  const stow = d.frame().target;
  assert.deepEqual([stow.x, stow.y, stow.z], [reachPoint('back', 0).x, reachPoint('back', 0).y, reachPoint('back', 0).z], 'no place for the m4: the table');
  d.step(0.002 + DRAW_TIMES.reach.chest - 0.002);
  const grab = d.frame().target;
  assert.ok(Math.abs(grab.x - 0.05) < 1e-3 && Math.abs(grab.y - 1.1) < 1e-3 && Math.abs(grab.z + 0.3) < 1e-3, 'at the Uzi itself: ' + JSON.stringify(grab));
  assert.ok(Math.abs(grab.twistY - reachPoint('chest', 0).twistY) < 0.02, 'the table\'s twist: ' + grab.twistY);
  assert.ok(asked.includes('m4@back0') && asked.includes('uzi@chest0'));
});
