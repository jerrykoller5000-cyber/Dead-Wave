// every gun x hand: the start (the exported pose), the touch set (the firing hand: the palm and the three lower fingers;
// otherwise every bone within 3 mm of the gun at the start), then gungrip.mjs with SCAN
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadGrid } from './grid.mjs';
import * as M from '../hand/mh-tool.mjs';
const list = process.argv.slice(2);
for (const name of list) {
  const base = 'out/' + name; if (!fs.existsSync(base + '.bin') || fs.existsSync('res/' + name + '.txt')) continue;
  const G = loadGrid(base), pose = G.H.hand.pose, side = name.endsWith('-r') ? 'r' : 'l';
  const P = M.handPosed(pose, M.GLOVE_INFLATE), byB = new Array(16).fill(1);
  for (let v = 0; v < P.n; v++) { const d = G.d(P.p[v * 3], P.p[v * 3 + 1], P.p[v * 3 + 2]); if (d < byB[P.b0[v]]) byB[P.b0[v]] = d; }
  const touch = side === 'r' && !/chainsaw|minigun|flamer|launcher/.test(name) ? [0, 4, 5, 6, 7, 8, 9, 10, 11, 12] : byB.map((d, b) => (d < 0.003 ? b : -1)).filter((b) => b >= 0 && b !== 13);
  let out = '';
  try { out = execFileSync(process.execPath, ['gungrip.mjs', base, JSON.stringify(pose), JSON.stringify(touch), '12'], { env: { ...process.env, SCAN: '1' }, encoding: 'utf8', timeout: 900000 }); } catch (e) { out = 'ERR ' + String(e).slice(0, 300); }
  fs.mkdirSync('res', { recursive: true });
  fs.writeFileSync('res/' + name + '.txt', 'TOUCH ' + JSON.stringify(touch) + '\n' + out.split('\n').filter((l) => !/stale/.test(l)).join('\n'));
}
