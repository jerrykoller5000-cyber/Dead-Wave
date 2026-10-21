// CU-127: Jerry's New-Hit.xlsx (12 Oct 2026). Each number is the percent of that
// zombie's listed health one shot removes. 100 is the whole bar. 1 is one percent.
// A body hit, a Military chest shot, a Brute that still has its plates, a whole
// shotgun or breacher shell, the centre of a blast, one flamethrower tick, one
// chainsaw bite, one knife or machete swing. Rows he left alone (Watchman, launcher,
// grenade, mortar, both turrets) are not in here, so they keep the weakness table.
const KINDS = ['shambler', 'feral', 'leaper', 'spider', 'drowned', 'military', 'brute', 'spitter', 'screamer', 'bomber', 'demon', 'colossus', 'guardian'];

export const ZOMBIE_HP = Object.freeze({
  shambler: 24, feral: 15, leaper: 30, spider: 44, drowned: 40, military: 50,
  brute: 85, spitter: 34, screamer: 28, bomber: 34, demon: 130, colossus: 520, guardian: 420
});

const row = (values) => Object.freeze(Object.fromEntries(KINDS.map((kind, i) => [kind, values[i]])));

export const HIT_PERCENT = Object.freeze({
  pistol:   row([80, 100, 90, 50, 50, 20, 10, 60, 70, 70, 20, 2, 4]),
  uzi:       row([45, 70, 50, 15, 25, 10, 5, 35, 30, 30, 12, 1, 2]),
  m4:        row([85, 120, 95, 60, 60, 25, 15, 70, 80, 80, 25, 3, 5]),
  ak:        row([110, 180, 120, 65, 70, 28, 17, 80, 90, 90, 26, 4, 6]),
  revolver:  row([220, 350, 250, 90, 125, 50, 25, 200, 170, 170, 30, 5, 7]),
  sniper:    row([400, 600, 500, 150, 200, 90, 45, 350, 150, 150, 50, 8, 15]),
  minigun:   row([40, 70, 60, 13, 30, 10, 4, 35, 35, 35, 6, 1, 2]),
  shotgun:   row([270, 580, 280, 150, 205, 55, 30, 200, 140, 220, 75, 8, 10]),
  aa12:      row([150, 330, 170, 88, 115, 35, 15, 102.9, 75, 102.9, 40, 4, 6]),
  knife:     row([90.5, 173.3, 88, 45, 62.5, 36, 8.2, 47.1, 92.9, 38.2, 7, 1, 1.5]),
  machete:   row([100.3, 460, 136.7, 115.9, 165, 98, 16, 120.6, 246.4, 102.9, 14, 3.1, 4]),
  chainsaw:  row([80.5, 100, 95, 22.7, 32.5, 19.8, 4.5, 24.7, 50, 20.6, 20, 0.6, 0.8]),
  flamer:    row([16.7, 26.7, 20, 14.5, 1, 10, 4.2, 11.8, 17, 40, 0.6, 2, 3])
});

// The sheet's shotgun and breacher cells are the whole shell.
export const HIT_SHELL = Object.freeze({ shotgun: 7, aa12: 5 });

// Damage of one application (one round, one pellet, one tick, one swing).
export function listedBodyDamage(weapon, typeKey, parts) {
  const pct = HIT_PERCENT[weapon] && HIT_PERCENT[weapon][typeKey];
  const hp = ZOMBIE_HP[typeKey];
  if (pct == null || hp == null) return null;
  const n = parts > 1 ? parts : (HIT_SHELL[weapon] || 1);
  return hp * pct / 100 / n;
}
