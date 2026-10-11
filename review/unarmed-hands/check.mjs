import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const clockSource = fs.readFileSync('tools/posesheet.mjs', 'utf8');
const clock = clockSource.match(/const PAGE = String\.raw`([\s\S]*?)`;/)[1]
  .replace('=> window.dispatchEvent(new KeyboardEvent', '=> document.body.dispatchEvent(new KeyboardEvent');
const live=process.argv.includes('--live');
const proof = {at: new Date().toISOString(), isolated: !live, cases: live ? {before:JSON.parse(fs.readFileSync('review/unarmed-hands/proof.json','utf8')).cases.before} : {}};
const states = [
  ['idle', []], ['walk', ['KeyW']], ['run', ['KeyW', 'ShiftLeft']],
  ['crouch-walk', ['KeyW', 'KeyC']], ['backward', ['KeyS']], ['strafe', ['KeyA']]
];
let E;
try {
  for (const tag of (live ? ['after'] : ['before', 'after'])) {
    E = new Engine({training: true, warm: 'none', size: '1100x800'});
    const load = E.load.bind(E);
    E.load = async () => {
      const goto = E.page.goto.bind(E.page);
      E.page.goto = (url, opts) => goto(live ? url : url.replace('/index.html?', '/review/unarmed-hands/' + tag + '.html?'), opts);
      try { return await load(); } finally { E.page.goto = goto; }
    };
    await E.open();
    const capture = E.page.screenshot.bind(E.page);
    E.page.screenshot = async file => { await E.ev('__step(1);return true;'); return capture(file); };
    await E.ev(`R.release();T.clearZombies();T.setHp(10000);T.grantAllWeapons();T.AudioSys.setMuted(true);
      const tg=T.trainingDbg.tg(),O=tg.origin;window.__S={x:O.x,y:tg.floorY,z:O.z+4};
      T.player.position.set(__S.x,__S.y,__S.z);T.renderer.domElement.dispatchEvent(new PointerEvent('pointerleave',{bubbles:true}));
      return true;`);
    await E.page.evaluate(clock);
    await new Promise(r => setTimeout(r, 150));
    await E.ev(`window.handSample=()=>{
      const u=T.getMarine().userData,V=T.THREE.Vector3;T.player.updateMatrixWorld(true);
      const hands=['L','R'].map(side=>{
        const e=u['elbow'+side+'G'],w=e.userData.wrist,h=w.userData.hand;
        const palm=h.point('palm',new V()),tips=['index','middle','ring','little'].map(name=>h.point(name+'Tip',new V()));
        const world=w.localToWorld(palm.clone().sub(w.position));
        return {side,pose:structuredClone(h.pose),wrist:w.rotation.toArray().slice(0,3),
          tipDistance:tips.map(p=>p.distanceTo(palm)),sideOffset:world.x-T.player.position.x,
          height:world.y-T.player.position.y,arm:u['arm'+side+'G'].rotation.toArray().slice(0,3),elbow:e.rotation.x};
      });return {unarmed:T.isUnarmed(),relax:T.smoothDbg.pose().relax,run:T.gaitDbg.run(),hands};
    };__weapon('pistol');__step(90);window.initialArmed=handSample();
    if(!T.isUnarmed())T.toggleHolster();__step(100);return true;`);
    const shotTag=live?'live':tag;
    const entry = proof.cases[tag] = {renderer: E.renderer, loadSeconds: E.loadSec, states: {}};
    fs.mkdirSync(`review/unarmed-hands/${shotTag}`, {recursive: true});
    for (const [name, keys] of states) {
      const samples = await E.ev(`for(const k of ${JSON.stringify(keys)})__key(k,true);__step(75);
        const samples=[];for(let i=0;i<50;i++){__step(1);samples.push(handSample());}return samples;`);
      entry.states[name] = samples;
      await E.shoot({target: 'player', view: 'three', dist: 4.4, out: `review/unarmed-hands/${shotTag}/${name}.png`});
      if (name === 'idle' || name === 'run') {
        await E.shoot({target: 'player', view: 'front', dist: 3.3, lookY: -0.1,
          out: `review/unarmed-hands/${shotTag}/${name}-hands.png`});
      }
      await E.ev(`for(const k of ${JSON.stringify(keys)})__key(k,false);__step(110);return true;`);
    }
    entry.shiftTransition = await E.ev(`__key('KeyW',true);__step(90);__key('ShiftLeft',true);
      const samples=[];for(let i=0;i<35;i++){__step(1);samples.push(handSample());}
      __key('ShiftLeft',false);for(let i=0;i<35;i++){__step(1);samples.push(handSample());}
      __key('KeyW',false);__step(90);return samples;`);
    entry.drawTransition = await E.ev(`T.toggleHolster();const samples=[];
      for(let i=0;i<120;i++){__step(1);samples.push(handSample());}return {samples,initialArmed,finalArmed:handSample()};`);
    entry.errors = E.page.errors;
    await E.close(); E = null;
    console.log(tag + ': photographed idle/walk/run/crouch/backward/strafe; errors=' + entry.errors.length);
  }
  fs.writeFileSync('review/unarmed-hands/'+(live?'live-proof.json':'proof.json'), JSON.stringify(proof, null, 2) + '\n');
  const after = proof.cases.after;
  assert.equal(after.errors.length, 0, 'preview runtime errors');
  for (const [name, samples] of Object.entries(after.states)) {
    for (const sample of samples) for (const hand of sample.hands) {
      assert(sample.unarmed && sample.relax > 0.95, name + ' must settle unarmed');
      assert(hand.pose.f.every(f => f[0] > 0.98 && f[1] > 1.18), name + ' fingers must form a loose fist');
      assert(hand.tipDistance.every(d => d < 0.045), name + ' tips must curl back near the palm');
    }
  }
  const shiftDelta = samples => Math.max(...samples.slice(1).map((s,i) => Math.abs(s.hands[0].elbow-samples[i].hands[0].elbow)));
  const beforeDelta = shiftDelta(proof.cases.before.shiftTransition), afterDelta = shiftDelta(after.shiftTransition);
  assert(afterDelta < beforeDelta * 0.75, 'eased run must reduce the elbow jump');
  for (const side of [0,1]) assert.deepEqual(after.drawTransition.finalArmed.hands[side].pose,
    proof.cases.before.drawTransition.finalArmed.hands[side].pose, 'pistol grip restored unchanged');
  console.log(JSON.stringify({states: states.length, maximumShiftElbowDeltaBefore: beforeDelta,
    maximumShiftElbowDeltaAfter: afterDelta, errors: after.errors.length}));
} finally { if (E) await E.close(); }
process.exit(0);
