import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const common = ['--agent', 'chatgpt', '--task', 'GP-20003'];
function camera(...args) {
  const p = spawnSync(process.execPath, ['tools/camera.mjs', ...args, ...common],
    { cwd: root, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  const output = (p.stdout || '') + (p.stderr || '');
  process.stdout.write(output);
  if (p.status !== 0) throw new Error(`camera ${args[0]} exited ${p.status}`);
  return p.stdout.trim();
}

try {
  camera('start', '--size', '1280x720');
  const siteText = camera('eval', `
    const yard = p => { const d = Math.hypot(p.x,p.z) || 1, x = 14*p.x/d, z = 14*p.z/d;
      return {x,y:T.sampleHeight(x,z)+1.7,z}; };
    return {
    hq:T.sampleHeight(0,0),
    trapper:{x:T.POI.campsites[2].x,z:T.POI.campsites[2].z},
    hikers:{x:T.POI.campsites[1].x,z:T.POI.campsites[1].z},
    fuel:{x:T.POI.sheds[2].x,z:T.POI.sheds[2].z},
    mast:{x:T.POI.mast.x,z:T.POI.mast.z},
    yards:{trapper:yard(T.POI.campsites[2]),hikers:yard(T.POI.campsites[1]),
      fuel:yard(T.POI.sheds[2])},
    heights:{trapper:T.sampleHeight(T.POI.campsites[2].x,T.POI.campsites[2].z),
      hikers:T.sampleHeight(T.POI.campsites[1].x,T.POI.campsites[1].z),
      fuel:T.sampleHeight(T.POI.sheds[2].x,T.POI.sheds[2].z),
      mast:T.sampleHeight(T.POI.mast.x,T.POI.mast.z)}
  }`);
  const site = JSON.parse(siteText.slice(0, siteText.lastIndexOf('}') + 1));
  fs.writeFileSync(path.join(here, 'sites.json'), JSON.stringify(site, null, 2) + '\n');
  const cam = (height, point, top, fov = 55) => ({
    x: height === 1.7 ? site.yards[top].x : 0,
    y: height === 1.7 ? site.yards[top].y : site.hq + height,
    z: height === 1.7 ? site.yards[top].z : 0,
    tx: point.x, ty: site.heights[top] + (top === 'hikers' ? 28 : top === 'mast' ? 16 : 20), tz: point.z, fov
  });
  const out = name => `review/GP-20003/${name}.png`;
  const shots = [
    { cam: cam(1.7, site.trapper, 'trapper'), time: 'noon', out: out('trapper-yard-noon') },
    { cam: cam(8, site.trapper, 'trapper'), time: 'dusk', out: out('trapper-roof-dusk') },
    { cam: cam(1.7, site.fuel, 'fuel'), time: 'noon', out: out('fuel-yard-noon') },
    { cam: cam(8, site.fuel, 'fuel'), time: 'dusk', out: out('fuel-roof-dusk') },
    { cam: cam(1.7, site.hikers, 'hikers'), time: 'noon', out: out('hikers-yard-noon') },
    { cam: cam(8, site.hikers, 'hikers'), time: 'night', out: out('hikers-roof-night') },
    { cam: cam(8, site.mast, 'mast'), time: 'dusk', out: out('mast-roof-dusk'),
      pre: `T.setRelayUpDbg(true); await wait(1100);` },
    { cam: cam(8, site.mast, 'mast'), time: 'night', out: out('mast-roof-night'),
      pre: `T.setRelayUpDbg(true); await wait(1100);` }
  ];
  fs.writeFileSync(path.join(here, 'yard-shots.json'), JSON.stringify(shots, null, 2) + '\n');
  camera('batch', 'review/GP-20003/yard-shots.json', '--out', 'review/GP-20003');
} finally {
  try { camera('stop'); } catch (e) { process.stderr.write(`${e.message}\n`); }
}
