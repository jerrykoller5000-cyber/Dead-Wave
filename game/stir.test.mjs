// GB-108: the stir (game/stir.js), hollows.md 5 and P-139's test column.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STIR, createStir } from './stir.js';

const play = (s, secs, see, each, step = 0.05) => { const ev = []; for (let t = 0; t < secs - 1e-9; t += step) { if (each) each(t, step); ev.push(...s.tick(step, see)); } return ev; };

test('30 unsuppressed rifle shots in 20 s fill it; 30 suppressed ones do not come close', () => {
  const s = createStir();
  let n = 0;
  const ev = play(s, 20, { hush: true }, (t) => { if (n < 30 && t >= n * (20 / 30)) { s.shot(45, false); n++; } });
  assert.equal(n, 30);
  assert.ok(ev.some((e) => e.kind === 'warning'), 'it filled (' + s.read().stir.toFixed(1) + ')');
  const q = createStir(); let m = 0;
  play(q, 20, { hush: true }, (t) => { if (m < 30 && t >= m * (20 / 30)) { q.shot(45, true); m++; } });
  assert.ok(q.read().stir < 30 && q.read().phase === 'calm', 'suppressed: ' + q.read().stir.toFixed(1));
});

test("a shot counts by its gun's hearing radius against the rifle's; a blast is 10, a dead waking 1.5", () => {
  const s = createStir();
  s.shot(70, false); assert.ok(Math.abs(s.read().stir - 3.5 * 70 / 45) < 1e-9);   // the sniper
  const p = createStir(); p.shot(35, false); assert.ok(Math.abs(p.read().stir - 3.5 * 35 / 45) < 1e-9);   // the pistol
  const b = createStir(); b.blast(); b.wake(2); assert.equal(b.read().stir, 13);
});

test('quiet for 3 s, the Hush lets it settle 2 a second; flat, it climbs 1.5 a second on its own', () => {
  const t = createStir(); for (let i = 0; i < 6; i++) t.blast();
  play(t, 3, { hush: true });
  assert.equal(t.read().stir, 60, 'nothing comes off in the first 3 s');
  play(t, 5, { hush: true });
  assert.ok(Math.abs(t.read().stir - 50) < 0.2, 'then 2 a second (' + t.read().stir.toFixed(2) + ')');
  const f = createStir(); for (let i = 0; i < 4; i++) f.blast();
  play(f, 10, { hush: false });
  assert.ok(Math.abs(f.read().stir - 55) < 0.2, 'flat: +1.5 a second (' + f.read().stir.toFixed(2) + ')');
  const g = createStir();
  const ev = play(g, 70, { hush: false });
  assert.ok(ev.some((e) => e.kind === 'warning'), 'flat from empty, about a minute fills it');
});

test('running adds 0.3 a second and is not quiet', () => {
  const s = createStir(); s.blast();
  play(s, 10, { hush: true, running: true });
  assert.ok(Math.abs(s.read().stir - 13) < 0.05, s.read().stir.toFixed(2));
});

test('full: ten seconds of warning, then the guardian arrives; a kick-free drops it to 50', () => {
  const s = createStir(); for (let i = 0; i < 10; i++) s.blast();
  let ev = s.tick(0.05, { hush: true });
  assert.deepEqual(ev.map((e) => e.kind), ['warning']);
  ev = play(s, 9.9, { hush: true }, () => s.blast());
  assert.equal(ev.length, 0, 'nothing for 9.9 s, and noise changes nothing now');
  ev = play(s, 0.2, { hush: true });
  assert.deepEqual(ev.map((e) => e.kind), ['arrive']);
  assert.equal(s.read().phase, 'grab');
  assert.equal(play(s, 5, { hush: true }).length, 0, 'while it has him, nothing more');
  s.kicked();
  assert.equal(s.read().stir, STIR.AFTER_KICK); assert.equal(s.read().phase, 'calm');
  s.over(); assert.equal(play(s, 5, { hush: false }).length, 0); assert.equal(s.read().phase, 'done');
});
