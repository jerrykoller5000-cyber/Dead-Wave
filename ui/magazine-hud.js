// GP-79: HUD projection of the per-gun magazine inventory.
export function ammoReserveUnit(weapon, hasMagazine) {
  if (weapon === 'revolver') return 'loaders';
  if (weapon === 'shotgun') return 'shells';
  if (weapon === 'launcher') return 'rounds';
  return hasMagazine ? 'mags' : 'rounds';
}

export function magazineHudItems(snapshot) {
  if (!snapshot) return [];
  return snapshot.spare.map(rounds => ({
    rounds,
    size: snapshot.size,
    fullness: Math.max(0, Math.min(100, Math.round(rounds / snapshot.size * 100)))
  }));
}
