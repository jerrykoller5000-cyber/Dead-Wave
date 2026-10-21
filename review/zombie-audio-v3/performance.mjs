import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Engine} from '../../tools/camera.mjs';

// Two short, sequential real-GPU runs. No production files are replaced on disk.
const baseline={
  '/core/audio.js':fs.readFileSync('review/zombie-audio-v3/before-core.txt','utf8'),
  '/ui/zombie-audio.js':fs.readFileSync('review/zombie-audio-v3/before-profiles.txt','utf8')
};
const productionFiles=['core/audio.js','ui/zombie-audio.js','ui/zombie-vocal-phrases.js'];
const hash=source=>createHash('sha256').update(source).digest('hex');
const productionHashes=()=>Object.fromEntries(productionFiles.map(path=>[path,hash(fs.readFileSync(path))]));
const types=['shambler','feral','leaper','drowned','military','brute','spitter','screamer','bomber','spider','demon','colossus','guardian','caveguard'];

class Compare extends Engine {
  constructor(version){super({training:true,warm:'none',size:'1440x900'});this.version=version;this.fulfilled=[];this.fetchErrors=[];}
  async load(){
    if(!this.intercept){
      this.intercept=true;
      this.page.conn.onEvent(msg=>{
        if(msg.sessionId!==this.page.sessionId||msg.method!=='Fetch.requestPaused')return;
        const {requestId,request}=msg.params,route=new URL(request.url).pathname;
        const source=this.version==='baseline-v2'?baseline[route]:null;
        if(source){
          this.fulfilled.push(route);
          this.page.send('Fetch.fulfillRequest',{requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript'},{name:'Cache-Control',value:'no-store'}],body:Buffer.from(source).toString('base64')}).catch(e=>this.fetchErrors.push(String(e)));
        }else this.page.send('Fetch.continueRequest',{requestId}).catch(e=>this.fetchErrors.push(String(e)));
      });
      await this.page.send('Network.enable');
      await this.page.send('Network.setCacheDisabled',{cacheDisabled:true});
      await this.page.send('Fetch.enable',{patterns:[{urlPattern:'*/core/audio.js*',requestStage:'Request'},{urlPattern:'*/ui/zombie-audio.js*',requestStage:'Request'}]});
    }
    await super.load();
  }
}

const proof={
  startedAt:new Date().toISOString(),
  method:'Two fresh offscreen real-GPU Engine Training browsers, baseline v2 then revised v3; 1440x900, warm:none, browser resource cache disabled. Forty-eight stationary mixed-type bodies on the same build-room grid. Two seconds settling, 1.5 seconds of voice warm-up, then one four-second RAF sample per version. Same manually scheduled calls at 320 ms intervals and the actual zombie objects supplied as actor tokens.',
  limitations:'One brief sample per version is a regression probe, not a sustained 60 FPS certification. OS and GPU caches may favor the second run even though each browser is fresh. Engine load time includes title dismissal, entering Training and fixed waits; it is not a cold title-screen measurement. Gameplay AI attacks and incidental groans are suppressed only in this comparison fixture.',
  baselineHashes:Object.fromEntries(Object.entries(baseline).map(([route,source])=>[route,hash(source)])),
  productionHashesBefore:productionHashes(),
  runs:[]
};

try{
  for(const version of ['baseline-v2','revised-v3']){
    const E=new Compare(version),run={version};proof.runs.push(run);
    try{
      await E.open();
      run.engineTrainingLoadSeconds=E.loadSec;run.renderer=E.renderer;run.headless=E.headless;
      assert.equal(E.headless,false,'real-GPU comparison must not use the software/headless fallback');
      assert(!/swiftshader|software rasterizer/i.test(String(E.renderer)),'software renderer is not a real-GPU comparison');
      if(version==='baseline-v2')assert.deepEqual([...new Set(E.fulfilled)].sort(),Object.keys(baseline).sort(),'both v2 modules must be intercepted');
      await E.page.send('Input.dispatchMouseEvent',{type:'mousePressed',x:1000,y:450,button:'left',clickCount:1});
      await E.page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:1000,y:450,button:'left',clickCount:1});
      run.sample=await E.ev(`
        R.release();T.clearZombies();T.skipGrace();T.setHp(100000);
        const A=T.AudioSys;A.setMusicVolume(0);A.setMuted(false);A.unlock();
        const tg=T.trainingDbg.tg(),room=tg.zombieRoom,P=T.player.position,types=${JSON.stringify(types)};
        P.set((room.minX+room.maxX)/2,tg.floorY,(room.minZ+room.maxZ)/2);
        const actors=[],grid=[];
        for(let i=0;i<48;i++){
          const type=types[i%types.length],x=P.x-8+(i%8)*2,z=P.z-8+Math.floor(i/8)*2;
          const actor=T.spawnZombie(x,z,type,true,true);
          if(!actor)throw new Error('Missing performance actor '+type);
          actor.trainingZ=true;actor.tactics='direct';actor.speed=actor.baseSpeed=0;actor.groanCd=100;
          actor.attackCd=actor.spitCd=actor.chargeCd=actor.slamCd=actor.screamCd=actor.leapCd=100;
          actor.attackWindup=actor.swingT=0;actor.hp=actor.maxHp=100000;
          actor.mesh.rotation.y=0;
          actors.push(actor);grid.push({type,x,z});
        }
        await wait(2000);
        const matching=/^[a-z]+:(idle|chase|attack|hurt|death|charge|move|step)$/;
        const counts=()=>Object.fromEntries(Object.entries(A.voiceCount).filter(([key])=>matching.test(key)));
        const diff=(after,before)=>Object.fromEntries(Object.entries(after).map(([key,value])=>[key,value-(before[key]||0)]).filter(([,value])=>value));
        const emit=(type,state)=>A.zombieVoice(type,state,.65,0,actors[types.indexOf(type)]);
        const warmTypes=['shambler','feral','brute','bomber','screamer'],warmBefore=counts();
        const timers=[];
        try{
          warmTypes.forEach((type,i)=>timers.push(setTimeout(()=>emit(type,'attack'),i*320)));
          await wait(1500);
          const warmEvents=diff(counts(),warmBefore),before=counts(),attempts=[];
          const sampleStart=performance.now();
          for(let i=0;i<13;i++){
            const type=types[(i*5)%types.length],state=['idle','chase','attack'][i%3],delay=100+i*320;
            timers.push(setTimeout(()=>{const at=performance.now()-sampleStart;emit(type,state);attempts.push({type,state,scheduledMs:delay,actualMs:at});},delay));
          }
          let previous=sampleStart;const frameTimes=[];
          await new Promise(resolve=>{
            const tick=now=>{frameTimes.push(now-previous);previous=now;if(now-sampleStart>=4000)resolve();else requestAnimationFrame(tick);};
            requestAnimationFrame(tick);
          });
          const elapsedMs=performance.now()-sampleStart,events=diff(counts(),before),sorted=[...frameTimes].sort((a,b)=>a-b);
          const result={training:T.trainingDbg.state().active,context:A.mixState().ctx,bodies:actors.filter(a=>a.alive).length,grid,
            requestedCries:attempts.length,actualCries:Object.values(events).reduce((sum,n)=>sum+n,0),events,warmEvents,attempts,
            frames:frameTimes.length,elapsedMs,fps:frameTimes.length*1000/elapsedMs,medianFrameMs:sorted[Math.floor(sorted.length*.5)],p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:Math.max(...frameTimes)};
          return result;
        }finally{timers.forEach(clearTimeout);T.clearZombies();}
      `,30000);
      run.fulfilledRoutes=E.fulfilled;run.errors=E.page.errors;run.fetchErrors=E.fetchErrors;
      assert(run.sample.training,'Training must remain active');assert.equal(run.sample.context,'running','audio context must be running');
      assert.equal(run.sample.bodies,48,'all comparison bodies must survive');
      assert.equal(run.sample.requestedCries,13,'all scheduled voice calls must occur within the sample');
      assert.equal(run.sample.actualCries,13,'every scheduled call must render exactly one typed voice, with no incidental AI cries');
      assert.equal(run.errors.length,0);assert.equal(run.fetchErrors.length,0);
      console.log(version+': '+run.sample.fps.toFixed(2)+' FPS, '+run.sample.actualCries+' actual cries, '+run.engineTrainingLoadSeconds.toFixed(3)+' s Engine Training load');
    }finally{await E.close();}
  }
  const [before,after]=proof.runs;
  assert.deepEqual(after.sample.grid,before.sample.grid,'both versions must use the same body grid');
  assert.deepEqual(after.sample.events,before.sample.events,'both versions must emit identical type/state counts');
  proof.fpsRatio=after.sample.fps/before.sample.fps;
  proof.fpsDifference=after.sample.fps-before.sample.fps;
  proof.engineTrainingLoadDifferenceSeconds=after.engineTrainingLoadSeconds-before.engineTrainingLoadSeconds;
  proof.observedNoMaterialFrameRegression=proof.fpsRatio>=.95;
  proof.productionHashesAfter=productionHashes();
  assert.deepEqual(proof.productionHashesAfter,proof.productionHashesBefore,'production changed during the comparison');
  console.log('Comparison: '+(100*(proof.fpsRatio-1)).toFixed(2)+'% FPS; '+(proof.observedNoMaterialFrameRegression?'no greater-than-5% regression in this short sample':'greater-than-5% regression observed; investigate'));
}catch(error){proof.failure=String(error.stack||error);throw error;}
finally{proof.completedAt=new Date().toISOString();fs.writeFileSync('review/zombie-audio-v3/performance-proof.json',JSON.stringify(proof,null,2)+'\n');}
process.exit(0);
