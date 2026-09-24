// GP-7 adapter. Production repair helpers approved by Claude in D-11.
// Inject the owner's local helpers; never use debug window.TT in game UI.
import { hasText } from './strings.js';

function valid(row) {
  return row && typeof row.id === 'string' && row.id.length > 0 && hasText(`build.${row.type}.name`) &&
    Number.isFinite(row.hp) && row.hp >= 0 && Number.isFinite(row.maxHp) && row.maxHp > 0 &&
    Number.isFinite(row.cost) && row.cost >= 0;
}

export function createPrepRepairReader({ getTarget, getSnapshot }) {
  let key = null, selectedId = null, gone = false;
  return function read({ runId, day, phase } = {}) {
    if (runId == null || !Number.isSafeInteger(day) || day < 1 || phase !== 'prep') return [];
    const nextKey = JSON.stringify([runId, day]);
    let row;
    if (key !== nextKey) {
      key = nextKey; selectedId = null; gone = false;
      row = getTarget();
      if (valid(row) && row.reachable === true && row.affordable === true && row.hp < row.maxHp - 0.5) selectedId = row.id;
    } else if (selectedId && !gone) row = getSnapshot(selectedId);
    if (!selectedId || gone) return [];
    if (!valid(row) || row.id !== selectedId) { gone = true; return []; }
    return [{ id: row.id, buildId: row.type, exists: true, reachable: row.reachable === true,
      hp: row.hp, requiredHp: row.maxHp - 0.5, cost: row.cost }];
  };
}
