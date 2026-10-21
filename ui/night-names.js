// GP-19926: the on-screen names of nights 1–20, matching tools/day1.py,
// tools/nights.py and tools/fog.py. Briefing and scouting read this table.
import { text } from './strings.js';

export const NIGHT_NAMES = Object.freeze([
  null, 'First Blood', 'Runners', 'The Lake Wakes', 'Two Fronts',
  'The First Nest', 'Chalk', 'Treeline', 'Fuse', 'Eight Packs',
  'Brute Force', 'Every Cave', 'Red Guardian', 'Artillery', 'Fog Night',
  'Brood', 'Demon Night', 'Swarm', 'The Siege', 'The Gauntlet', 'Last Stand'
]);

export function nightTitle(day) {
  if (!Number.isSafeInteger(day) || day < 1) return null;
  const name = NIGHT_NAMES[day];
  return name ? text('night.named', { day, name }) : text('night.number', { day });
}
