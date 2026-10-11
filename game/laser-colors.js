// Laser colours for the armory. Red comes with the sight. The rest open on later
// nights of a real run, the last of them on day 18. Training does not skip that.
export const LASER_COLORS = Object.freeze([
  { id: 'red', hex: 0xff2b2b, night: 1 },
  { id: 'green', hex: 0x3dff62, night: 4 },
  { id: 'blue', hex: 0x3aa6ff, night: 7 },
  { id: 'amber', hex: 0xffc14a, night: 10 },
  { id: 'purple', hex: 0xc45bff, night: 13 },
  { id: 'pink', hex: 0xff5ad0, night: 16 },
  { id: 'white', hex: 0xf7f8ff, night: 18 }
]);

export function laserColorById(id) {
  return LASER_COLORS.find((c) => c.id === id) || null;
}

// `night` is the furthest day reached. Night 1 (and any earlier) has red only.
export function laserColorOpen(id, night) {
  const c = laserColorById(id);
  if (!c) return false;
  return c.night <= 1 || (night | 0) >= c.night;
}

export function laserColorsOpen(night) {
  return LASER_COLORS.filter((c) => laserColorOpen(c.id, night));
}
