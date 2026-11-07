// game/hq-teleprinter.test.mjs - Unit tests for AG-247 HQ teleprinter and rubber stamp.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as T from '../tools/tests/fakethree.mjs';
import { buildTeleprinter, getTeleprinterMaterials } from './hq-teleprinter.js';

test('getTeleprinterMaterials returns required materials', () => {
  const mats = getTeleprinterMaterials(T);
  assert.ok(mats.olive, 'olive material exists');
  assert.ok(mats.steel, 'steel material exists');
  assert.ok(mats.iron, 'iron material exists');
  assert.ok(mats.brass, 'brass material exists');
  assert.ok(mats.wood, 'wood material exists');
  assert.ok(mats.paper, 'paper material exists');
  assert.ok(mats.lampAmber, 'lampAmber material exists');
  assert.ok(mats.glass, 'glass material exists');
});

test('buildTeleprinter returns controller with group, print, sheetTaken, stamp, update', () => {
  const tp = buildTeleprinter(T);
  assert.ok(tp, 'teleprinter created');
  assert.ok(tp.group, 'has group');
  assert.equal(tp.group.name, 'hq-teleprinter');
  assert.equal(typeof tp.print, 'function', 'has print()');
  assert.equal(typeof tp.sheetTaken, 'function', 'has sheetTaken()');
  assert.equal(typeof tp.stamp, 'function', 'has stamp()');
  assert.equal(typeof tp.update, 'function', 'has update(dt)');

  // Verify group hierarchy
  const paperGroup = tp.group.children.find(c => c.name === 'teleprinter-paper-group');
  const stampGroup = tp.group.children.find(c => c.name === 'duty-board-rubber-stamp');
  const visor = tp.group.children.find(c => c.name === 'teleprinter-visor');
  const lamp = tp.group.children.find(c => c.name === 'teleprinter-lamp');

  assert.ok(paperGroup, 'paper group exists');
  assert.ok(stampGroup, 'rubber stamp group exists');
  assert.ok(visor, 'visor exists');
  assert.ok(lamp, 'indicator lamp exists');

  const sheet = paperGroup.children.find(c => c.name === 'teleprinter-sheet');
  assert.ok(sheet, 'paper sheet mesh exists');
  assert.equal(sheet.visible, false, 'sheet is initially not visible when idle');
});

test('print() feeds out sheet and completes over update cycles', () => {
  const tp = buildTeleprinter(T);
  const paperGroup = tp.group.children.find(c => c.name === 'teleprinter-paper-group');
  const sheet = paperGroup.children.find(c => c.name === 'teleprinter-sheet');

  assert.equal(tp.isPrinting, false);
  assert.equal(tp.hasSheet, false);

  tp.print();
  assert.equal(tp.isPrinting, true);
  assert.equal(tp.hasSheet, true);
  assert.equal(sheet.visible, true);

  // Step 0.5 seconds
  tp.update(0.5);
  assert.equal(tp.isPrinting, true);
  assert.ok(sheet.scale.y > 0.08, 'paper scale increased');

  // Step 2.0 seconds (completing print duration)
  tp.update(2.0);
  assert.equal(tp.isPrinting, false, 'print completed');
  assert.equal(tp.hasSheet, true, 'sheet remains visible until taken');

  // Take sheet
  tp.sheetTaken();
  assert.equal(tp.hasSheet, false);
  assert.equal(sheet.visible, false);
});

test('stamp() triggers stamping motion and returns to rest', () => {
  const tp = buildTeleprinter(T);
  const stampGroup = tp.group.children.find(c => c.name === 'duty-board-rubber-stamp');
  const initialY = stampGroup.position.y;

  assert.equal(tp.isStamping, false);

  tp.stamp();
  assert.equal(tp.isStamping, true);

  // During lift phase
  tp.update(0.15);
  assert.ok(stampGroup.position.y > initialY, 'stamp lifted up');

  // Complete stamp cycle
  tp.update(0.6);
  assert.equal(tp.isStamping, false, 'stamping completed');
  assert.ok(Math.abs(stampGroup.position.y - initialY) < 1e-4, 'stamp returned to rest position');
});
