// CU-196: the line of sight, on a made-up field. Two trees, a ridge, one wall.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groundHit, sightLine, treeHit, wallHit } from './sightlines.mjs';

const flat = () => 0;
const eye = { x: 0, y: 1.7, z: 0 };
const far = { id: 'far', x: 40, z: 0 };

test('open ground stays open', () => {
  const hit = groundHit(eye, { x: 40, y: 1.5, z: 0 }, flat);
  assert.equal(hit, null);
  const row = sightLine(eye, far, { sampleHeight: flat, trees: [], walls: [] });
  assert.equal(row.open, true);
  assert.equal(row.by, null);
});

test('a ridge through the line is the ground', () => {
  const ridge = (x) => (x > 12 && x < 22 ? 6 : 0);
  const hit = groundHit(eye, { x: 40, y: 1.5, z: 0 }, ridge);
  assert.equal(hit.by, 'ground');
  const row = sightLine(eye, far, { sampleHeight: ridge, trees: [], walls: [] });
  assert.equal(row.open, false);
  assert.equal(row.by, 'ground');
});

test('two trees: the near canopy blocks, a high canopy does not', () => {
  const trees = [
    { x: 15, z: 0, canopyRadius: 5, canopyBottom: 1, canopyTop: 6 },
    { x: 28, z: 8, canopyRadius: 4, canopyBottom: 8, canopyTop: 12 },
  ];
  const blocked = treeHit(eye, { x: 40, y: 1.5, z: 0 }, trees, flat);
  assert.equal(blocked.by, 'tree');
  const highOnly = treeHit(eye, { x: 40, y: 1.5, z: 0 }, [trees[1]], flat);
  assert.equal(highOnly, null);
  const wide = { x: 15, z: 12, canopyRadius: 4, canopyBottom: 0, canopyTop: 8 };
  // 0.8 of radius 4 is 3.2 m. The line along z=0 passes 12 m from this trunk.
  assert.equal(treeHit(eye, { x: 40, y: 1.5, z: 0 }, [wide], flat), null);
});

test('an HQ wall cylinder blocks, and a wall the line clears does not', () => {
  const wall = { x: 10, z: 0, radius: 1.2, y0: 0, y1: 4 };
  const hit = wallHit(eye, { x: 40, y: 1.5, z: 0 }, [wall]);
  assert.ok(hit);
  assert.equal(hit.by, 'wall');
  const over = wallHit({ x: 0, y: 8, z: 0 }, { x: 40, y: 8, z: 0 }, [wall]);
  assert.equal(over, null);
  const row = sightLine(eye, far, { sampleHeight: flat, trees: [], walls: [wall] });
  assert.equal(row.by, 'wall');
});
