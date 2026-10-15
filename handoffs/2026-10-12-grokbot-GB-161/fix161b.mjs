import fs from 'node:fs';
const f = 'world/training.js', before = fs.readFileSync(f); let s = before.toString('utf8');
const a = "const dl = x - (b.minX - r), dr = b.maxX + r - x, dn = z - (b.minZ - r), df = b.maxZ + r - z, m = Math.min(dl, dr, dn, df);\n      if (m === dl) x = b.minX - r; else if (m === dr) x = b.maxX + r; else if (m === dn) z = b.minZ - r; else z = b.maxZ + r;";
const b = "const dl = x - (b.minX - r), dr = b.maxX + r - x, df = b.maxZ + r - z, m = Math.min(dl, dr, df);   // never back into the wall behind it\n      if (m === dl) x = b.minX - r; else if (m === dr) x = b.maxX + r; else z = b.maxZ + r;";
if (s.split(a).length !== 2) throw new Error('anchor'); s = s.replace(a, b);
if (!fs.readFileSync(f).equals(before)) throw new Error('changed'); fs.writeFileSync(f, s, 'utf8'); console.log('ok');
