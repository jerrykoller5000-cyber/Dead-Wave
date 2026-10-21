// Same-source A/B: only GP-179 attachment and frame hooks are disabled in the baseline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Engine} from '../../tools/camera.mjs';
const source=fs.readFileSync('index.html','utf8');
const attach='      attachZombieAbilityVisuals(THREE, g, typeKey, s);   // GP-179';
const update='        enemyAbilities.update(dt);   // GP-179: poses after walking, swept shots and walking acid';
assert(source.includes(attach)&&source.includes(update));
fs.writeFileSync('.tmp-zombie-abilities-perf-on.html',source,'utf8');
fs.writeFileSync('.tmp-zombie-abilities-perf-off.html',source.replace(attach,'      // GP-179 baseline: no extra props').replace(update,'        // GP-179 baseline: no extra ability updates'),'utf8');
const proof={at:new Date().toISOString(),sourceHash:createHash('sha256').update(source).digest('hex'),samples:[],comparison:'Same source, same 48 mixed enemies in Training; attachment and frame update disabled in baseline only.'};
let engine;
try{
  for(const enabled of [false,true]){
    engine=new Engine({training:true,warm:'none',size:'1440x900'});
    const load=engine.load.bind(engine);
    engine.load=async()=>{const goto=engine.page.goto.bind(engine.page);engine.page.goto=(url,o)=>goto(url.replace('/index.html?',`/.tmp-zombie-abilities-perf-${enabled?'on':'off'}.html?`),o);let timer;
      const guard=new Promise((_,reject)=>{timer=setInterval(()=>{if(engine.page.errors.length)reject(new Error(engine.page.errors.join(' | ')));},500);});
      try{return await Promise.race([load(),guard]);}finally{engine.page.goto=goto;clearInterval(timer);}};
    await engine.open();const result={enabled,loadSeconds:engine.loadSec,renderer:engine.renderer};
    result.fixture=await engine.ev(`R.release();T.clearZombies();T.skipGrace();T.setHp(10000);T.setArmor(0);T.AudioSys.setMuted(true);
      const tg=T.trainingDbg.tg(),room=tg.zombieRoom,P=T.player.position;P.set(room.minX+6,tg.floorY,(room.minZ+room.maxZ)/2);await wait(150);
      for(let i=0;i<48;i++){const z=T.spawnZombie(P.x+8+(i%6)*1.2,P.z+Math.floor(i/6)*1.1,['demon','spitter','colossus','shambler'][i%4],true,true);z.trainingZ=true;z.speed=z.baseSpeed=0;z.chargeCd=z.spitCd=z.slamCd=z.attackCd=1000;}
      await wait(80);for(const z of T.zombies)if(z.rangedAbility)z.rangedAbility.remaining=1000;await wait(3500);
      return{count:T.trainingDbg.alive(),visible:T.zombies.filter(z=>z.alive&&z.mesh?.visible).length,abilities:T.enemyAbilitiesDbg.read()};`);
    assert.equal(result.fixture.count,48);result.frames=[];
    for(let i=0;i<3;i++)result.frames.push(await engine.ev('T.resetPerf();await wait(2200);return T.perfSnapshot();'));
    result.meanFps=result.frames.reduce((sum,s)=>sum+s.fps,0)/result.frames.length;
    result.errors=engine.page.errors;assert.equal(result.errors.length,0);
    await engine.shoot({live:true,ui:true,out:'review/zombie-abilities/'+(enabled?'after':'before')+'/48-body.png'});
    if(enabled)for(const [type,view]of [['demon','three'],['colossus','rear3']])await engine.shoot({target:'zombie:'+type,view,time:'noon',out:'review/zombie-abilities/after/'+type+'.png'});
    proof.samples.push(result);console.log((enabled?'Enabled':'Disabled')+': '+result.meanFps.toFixed(2)+' FPS; '+result.fixture.visible+' visible; zero errors.');
    await engine.close();engine=null;
  }
  proof.deltaPercent=(proof.samples[1].meanFps/proof.samples[0].meanFps-1)*100;
  console.log('Same-source FPS difference: '+proof.deltaPercent.toFixed(2)+'%');
}catch(e){proof.failure=String(e.stack||e);throw e;}
finally{fs.writeFileSync('review/zombie-abilities/performance-proof.json',JSON.stringify(proof,null,2)+'\n');await engine?.close();}
process.exit(0);
