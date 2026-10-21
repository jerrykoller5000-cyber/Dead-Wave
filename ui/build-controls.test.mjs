import test from 'node:test';
import assert from 'node:assert/strict';
import { buildControlGroups } from './build-controls.js';

test('build actions keep their key, including mouse drag continuations', () => {
  for (const options of [{}, { drag: true }, { upgrade: true }]) {
    const groups = buildControlGroups(options);
    assert(groups.every(group => group.some(part => part.key)));
    assert(groups.every(group => group.some(part => !part.key && part.text.trim())));
    const lines = groups.map(group => group.map(part => part.text).join(''));
    assert(!lines.join(' ').includes('Reload'));
    if (options.drag) assert(lines.includes('LMB place · drag for a line'));
    if (options.upgrade) assert(lines.includes('LMB click one · drag for a box'));
  }
});
test('bearing and remapped key labels remain literal data', () => {
  const groups = buildControlGroups({ bearing: 'W', labels: { rotate: '<R>' } });
  assert.deepEqual(groups[0], [{ key: true, text: '<R>' }, { key: false, text: ' rotate (W)' }]);
});
