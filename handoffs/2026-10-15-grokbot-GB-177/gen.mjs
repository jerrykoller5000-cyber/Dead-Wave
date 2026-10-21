// GB-177 slot: build the after-shot list from GB-175's camera records (same framing), plus close-ups at 1/3 the distance.
import fs from 'node:fs';
const W = 'minigun m4 ak pistol uzi shotgun aa12 revolver sniper launcher flamer chainsaw knife machete katana katana-sheathed m240 m240-folded mortar mortar-collapsed mortar-round frag-grenade holy-grenade med-pen rune-pistol shovel'.split(' ');
const CLOSE = ['pistol', 'revolver', 'minigun', 'shovel', 'knife', 'm4', 'shotgun', 'ak', 'uzi'];
const shots = [];
for (const w of W) for (const v of ['side', 'three']) {
  const j = JSON.parse(fs.readFileSync(`review/gb175/after/${w}-${v}.json`, 'utf8')), c = j.cam;
  shots.push({ target: `weapon:${w}`, view: v, size: '600x450', out: `review/gb176/after/${w}-${v}.png` });
  if (CLOSE.includes(w)) {
    const k = w === 'shovel' ? 0.45 : 0.36;
    shots.push({ cam: { x: c.tx + (c.x - c.tx) * k, y: c.ty + (c.y - c.ty) * k, z: c.tz + (c.z - c.tz) * k, tx: c.tx, ty: c.ty, tz: c.tz, fov: c.fov }, size: '600x450', out: `review/gb176/after/${w}-${v}-close.png` });
  }
}
fs.writeFileSync('review/gb176/shots.json', JSON.stringify(shots, null, 1));
console.log(shots.length, 'shots');
