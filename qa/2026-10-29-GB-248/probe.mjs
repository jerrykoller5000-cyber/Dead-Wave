// GB-248: live-match motion evidence for the feral's horde lunge and the colossus's ground slam.
// Based on handoffs/GP-19970/live-specials/probe.mjs. Run only through crew.mjs slot run.
// Usage: node qa/2026-10-29-GB-248/probe.mjs <before|after>
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, process.argv[2] || 'after');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await fs.mkdir(dir, { recursive: true });
const engine = new Engine({ match: true, warm: 'none', size: [1280, 720] });
const result = { at: new Date().toISOString(), subjects: {}, errors: [] };
try {
  await engine.open();
  result.renderer = engine.renderer;
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
    return { jumped, phase: T.getPhase(), grace: T.graceActiveDbg() };
  `);
  result.setup = setup;
  if (!setup.jumped || setup.grace || setup.phase !== 'wave') throw new Error('live-match setup failed: ' + JSON.stringify(setup));

  for (const spec of [
    { key: 'feral', distance: 4.0, duration: 2600, act: '(z.hzCoilT>0?z.hzCoilT:0)+(z.hzLungeT>0?z.hzLungeT:0)+(z.hzLungeRec>0?z.hzLungeRec:0)', cd: 'hzLungeCd', cdValue: 0.15, gap: 60, max: 12 },
    { key: 'colossus', distance: 3.0, duration: 3300, act: '(z.slamWind>0?z.slamWind:0)+(z.slamFollowT>0?z.slamFollowT:0)', cd: 'slamCd', cdValue: 0.8, gap: 90, max: 14 },
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
      return {type:z.typeKey,horde:!!z.hz};
    `);
    subject.spawned = spawned;
    if (!spawned) throw new Error(`${spec.key} did not spawn`);
    const start = Date.now();
    let lastShotAt = -Infinity, shotN = 0;
    while (Date.now() - start < spec.duration) {
      const state = await engine.ev(`
        const z=window.__motionZ,p=T.player.position,u=z?.mesh.userData||{};
        const r=(v)=>v==null?null:+v.toFixed(3);
        return {t:+((performance.now())/1000).toFixed(3),alive:!!z?.alive,
          action:+(${spec.act}).toFixed(3), coil:r(z?.hzCoilT||0), lunge:r(z?.hzLungeT||0), rec:r(z?.hzLungeRec||0),
          wind:r(z?.slamWind||0), follow:r(z?.slamFollowT||0), cd:r(z?.${spec.cd}||0),
          distance:z?+Math.hypot(z.mesh.position.x-p.x,z.mesh.position.z-p.z).toFixed(3):null,
          arms:[r(u.armLG?.rotation.x),r(u.armRG?.rotation.x)], elbows:[r(u.armLG?.userData.elbowG?.rotation.x),r(u.armRG?.userData.elbowG?.rotation.x)],
          torso:r(u.torso?.rotation.x), head:r(u.head?.rotation.x), hipsY:r(u.hips?.position.y), hipsZ:r(u.hips?.position.z)};
      `);
      subject.samples.push(state);
      subject.peak = Math.max(subject.peak, state.action);
      const elapsed = Date.now() - start;
      if (state.action > 0 && elapsed - lastShotAt > spec.gap && shotN < spec.max) {
        const file = `${spec.key}-${String(++shotN).padStart(2,'0')}.png`;
        await engine.page.screenshot(path.join(dir,file));
        subject.shots.push({ file, elapsed, state });
        lastShotAt = Date.now() - start;
      }
      await sleep(25);
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
