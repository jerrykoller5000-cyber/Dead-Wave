import test from 'node:test';
import assert from 'node:assert/strict';
import { describeDayMissionHud } from './day-mission-hud.js';

test('day-mission HUD stays hidden when inactive or modal is open', () => {
  assert.equal(describeDayMissionHud(null), null);
  assert.equal(describeDayMissionHud({ active: false, convoy: { engaged: true, phase: 'pumping', pumps: 2, total: 8 } }), null);
  assert.equal(describeDayMissionHud({ active: true, modalOpen: true, convoy: { engaged: true, phase: 'pumping', pumps: 2, total: 8 } }), null);
  assert.equal(describeDayMissionHud({ active: true }), null);
});

test('convoy jack shows rhythm strip, pump pips, and escalating cab threat states', () => {
  const calm = describeDayMissionHud({
    active: true,
    convoy: { engaged: true, phase: 'pumping', pumps: 3, total: 8, beat: 0.75, untilBeat: 0.04, beatReady: true, misses: 0, sleeperAlive: true }
  });
  assert.equal(calm.mode, 'convoy');
  assert.equal(calm.tone, 'ready');
  assert.equal(calm.pips.done, 3);
  assert.equal(calm.pips.count, 8);
  assert.equal(calm.rhythm.ready, true);
  assert.equal(calm.tag, 'CAB QUIET');

  const warn = describeDayMissionHud({
    active: true,
    convoy: { engaged: true, phase: 'warning', pumps: 2, total: 8, beat: 0.75, untilBeat: 0, beatReady: false, misses: 2, sleeperAlive: true }
  });
  assert.equal(warn.tone, 'danger');
  assert.match(warn.tag, /BANGING/);

  const open = describeDayMissionHud({
    active: true,
    convoy: { engaged: true, phase: 'open', pumps: 2, total: 8, beat: 0.75, untilBeat: 0, beatReady: false, misses: 2, sleeperAlive: true }
  });
  assert.equal(open.tone, 'danger');
  assert.match(open.sub, /SHOOT/);

  const dead = describeDayMissionHud({
    active: true,
    convoy: { engaged: true, phase: 'pumping', pumps: 5, total: 8, beat: 0.75, untilBeat: 0.5, beatReady: false, misses: 0, sleeperAlive: false }
  });
  assert.equal(dead.tag, 'CAB CLEAR');
  assert.equal(dead.tagTone, 'ok');
});

test('trapper safe path shows row progress and switches to pry-free gauge when clamped', () => {
  const walk = describeDayMissionHud({
    active: true,
    trapper: { inYard: true, unlocked: false, rows: 8, progress: 4, held: false, snaps: 0 }
  });
  assert.equal(walk.mode, 'trapper');
  assert.equal(walk.stat, 'ROW 4 / 8');
  assert.equal(walk.pips.done, 4);

  const clamped = describeDayMissionHud({
    active: true,
    trapper: { inYard: true, unlocked: false, rows: 8, progress: 4, held: true, holdT: 1.5, holdMax: 3.0, snaps: 1 }
  });
  assert.equal(clamped.mode, 'trapper-held');
  assert.equal(clamped.tone, 'danger');
  assert.equal(clamped.bar, 0.5);
  assert.match(clamped.sub, /PRY JAWS/);
});

test('fuel, hikers, truck, winch, boots, and bounties project cleanly with priority', () => {
  const fuelDanger = describeDayMissionHud({
    active: true,
    fuel: { done: false, carried: true, hqDist: 34, drips: 12, hazardNear: true }
  });
  assert.equal(fuelDanger.mode, 'fuel-carry');
  assert.equal(fuelDanger.tone, 'danger');
  assert.match(fuelDanger.tag, /FLAMMABLE/);

  const river = describeDayMissionHud({
    active: true,
    hikers: { done: false, phase: 'floating', untilSnag: 8.2, floatS: 40, dist: 19 }
  });
  assert.equal(river.mode, 'hikers-river');
  assert.equal(river.tone, 'danger');
  assert.match(river.stat, /9s/);

  const truckAlarm = describeDayMissionHud({
    active: true,
    truck: { cutting: false, alarm: 12, alarmTotal: 20 }
  });
  assert.equal(truckAlarm.mode, 'truck-alarm');
  assert.equal(truckAlarm.tone, 'danger');

  const winch = describeDayMissionHud({
    active: true,
    gate: { winching: true, winchT: 0.45 }
  });
  assert.equal(winch.mode, 'gate-winch');
  assert.equal(winch.stat, '45%');

  const boots = describeDayMissionHud({
    active: true,
    boots: { active: true, pulls: 3, need: 6 }
  });
  assert.equal(boots.mode, 'boots-yank');
  assert.equal(boots.pips.done, 3);

  const bounty = describeDayMissionHud({
    active: true,
    bounty: { open: true, label: 'Rangers camp', alive: 2, guards: 5, reward: 60, survivor: true }
  });
  assert.equal(bounty.mode, 'bounty-site');
  assert.equal(bounty.tag, 'SURVIVOR ON SITE');
});
