// Live-match motion evidence for GP-19970. Run only through crew.mjs slot run.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../../tools/camera.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await fs.mkdir(dir, { recursive: true });
const engine = new Engine({ match: true, warm: 'none', size: [1280, 720] });
const result = { at: new Date().toISOString(), subjects: {}, errors: [] };
try {
  await engine.open();
  result.renderer = engine.renderer;
  result.loadSec = engine.loadSec;
  const setup = await engine.ev(`
    T.runDevCommand('godmode');
    T.player.position.set(16, T.sampleHeight(16, 0), 0);
    const jumped = T.devJumpToNight(2, true);
    T.skipGrace();
    T.clearZombies();
    T.setWorldTime(0.5);
    const canvas=T.renderer.domElement, keep=new Set();
    for(let el=canvas;el&&el!==document.body;el=el.parentElement) keep.add(el);
    for(const child of document.body.children) if(!keep.has(child)) child.style.setProperty('display','none','important');
    return { jumped, phase: T.getPhase(), grace: T.graceActiveDbg(), player: T.player.position.toArray() };
  `);
  result.setup = setup;
  if (!setup.jumped || setup.grace || setup.phase !== 'wave') throw new Error('live-match setup failed: ' + JSON.stringify(setup));

  for (const spec of [
    { key: 'feral', distance: 4.0, duration: 2600, field: 'hzLungeT', cd: 'hzLungeCd', cdValue: 0.15 },
    { key: 'colossus', distance: 3.0, duration: 3300, field: 'slamWind', cd: 'slamCd', cdValue: 0.8 },
  ]) {
    const subject = { samples: [], shots: [], peak: 0 };
    result.subjects[spec.key] = subject;
    const spawned = await engine.ev(`
      T.clearZombies();
      const p=T.player.position;
      p.set(16,T.sampleHeight(16,0),0);
      const z=T.spawnZombie(p.x-${spec.distance},p.z,${JSON.stringify(spec.key)},true,true);
      if(!z) return null;
      ${spec.key === 'feral' ? 'T.hordeDbg.join(z);' : ''}
      z.${spec.cd}=${spec.cdValue};
      window.__motionZ=z;
      T.setShotView({x:p.x+5,y:p.y+4.3,z:p.z+7.2,tx:p.x-1.5,ty:p.y+1.4,tz:p.z,fov:48});
      return {type:z.typeKey,position:z.mesh.position.toArray(),initialCd:z.${spec.cd},horde:!!z.hz};
    `);
    subject.spawned = spawned;
    if (!spawned) throw new Error(`${spec.key} did not spawn`);
    const start = Date.now();
    let lastShotAt = -Infinity;
    let shotN = 0;
    while (Date.now() - start < spec.duration) {
      const state = await engine.ev(`
        const z=window.__motionZ,p=T.player.position;
        return {t:+((performance.now())/1000).toFixed(3),phase:T.getPhase(),grace:T.graceActiveDbg(),
          alive:!!z?.alive, action:+(z?.${spec.field}||0).toFixed(3), cd:+(z?.${spec.cd}||0).toFixed(3),
          distance:z?+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3):null,
          xyz:z?.mesh.position.toArray(),arms:z?[z.mesh.userData.armLG?.rotation.x,z.mesh.userData.armRG?.rotation.x]:null,
          torso:z?.mesh.userData.torso?.rotation.x};
      `);
      subject.samples.push(state);
      subject.peak = Math.max(subject.peak, state.action);
      const elapsed = Date.now() - start;
      if (state.action > 0 && elapsed-lastShotAt > (spec.key === 'feral' ? 95 : 130) && shotN < 9) {
        const file = `${spec.key}-${String(++shotN).padStart(2,'0')}.png`;
        await engine.page.screenshot(path.join(dir,file));
        subject.shots.push({ file, elapsed, state });
        lastShotAt = Date.now() - start;
      }
      await sleep(35);
    }
    console.log(`${spec.key}: peak ${subject.peak.toFixed(3)}s, shots ${subject.shots.length}, samples ${subject.samples.length}`);
    await engine.ev('T.clearZombies(); T.setShotView(null); return true;');
  }
  result.errors = engine.page.errors || [];
  console.log('page errors:', result.errors.length);
} finally {
  await fs.writeFile(path.join(dir,'run.json'),JSON.stringify(result,null,2));
  await engine.close();
}
if (Object.values(result.subjects).some(s=>s.peak<=0 || s.shots.length===0) || result.errors.length) process.exitCode=1;
