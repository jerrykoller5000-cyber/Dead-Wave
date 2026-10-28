// GP-19968 asset review in the native renderer; runtime preview until owners wire consumers.
import fs from 'node:fs';
import {Engine} from '../../tools/camera.mjs';
const out='handoffs/GP-19968/preview-v3';fs.mkdirSync(out,{recursive:true});
const e=new Engine({match:true,warm:'none',size:[1280,720]}),frames=[];
try {
 await e.open();
 await e.page.evaluate(`(async()=>{
  TT.runDevCommand('godmode');TT.clearZombies();
  TT.setGearDbg('flashlight');TT.applyGearVisibility();
  window.gpBoard=TT.historyProps.parts['trailhead-board'];if(!gpBoard)throw Error('trailhead board missing');
  window.gpHikersSetup=async(light,view)=>{
   const T=TT,V=T.player.position.constructor,b=gpBoard;
   const at=b.localToWorld(new V(0,1.45,0)),standing=b.localToWorld(new V(view==='front'||view==='angle'?2.6:0,0,view==='fp'?2.5:3.0));
   T.setShotView(null);T.player.position.set(standing.x,T.sampleHeight(standing.x,standing.z),standing.z);
   T.weather.raining=light==='overcast';T.weather.intensity=light==='overcast'?.85:0;
   T.setWorldTime({noon:.5,overcast:.46,dusk:.715,night:.92}[light]);
   T.setViewFirstDbg(view==='fp');
   const lightOn=T.flashlight.intensity>0;
   if(lightOn!==(light==='night'))for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code:'Digit2',key:'2',bubbles:true}));
   const yaw=Math.atan2(standing.x-at.x,standing.z-at.z)+Math.PI;
   T.player.rotation.y=yaw;T.setAimYawDbg(yaw);
   await new Promise(r=>setTimeout(r,300));
   if(view==='fp'){
    const cur=T.otsDbg();let dyaw=yaw-cur.yaw;while(dyaw>Math.PI)dyaw-=Math.PI*2;while(dyaw<-Math.PI)dyaw+=Math.PI*2;
    T.otsLook(-dyaw/.0022,(cur.pitch+.12)/.0022);
   }else if(view==='front'||view==='angle'){
    const eye=b.localToWorld(new V(view==='angle'?1.2:0,1.52,view==='angle'?2.6:2.9));
    T.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:at.x,ty:at.y,tz:at.z,fov:45});
   }
   await new Promise(r=>setTimeout(r,400));
  };await gpHikersSetup('noon','front');
 })()`);
 if(!fs.existsSync(`${out}/before-noon-front.png`))await e.page.screenshot(`${out}/before-noon-front.png`);
 const painted=await e.page.evaluate(`(async()=>{
  const h=await import('/ui/hikers.js'),images=await h.loadHikerPortraits();
  const count=await h.paintHikerPosters(gpBoard.userData.posters);
  const sheets={};for(const person of h.HIKERS){const c=document.createElement('canvas');c.width=384;c.height=512;h.drawHikerPoster(c.getContext('2d'),person.id,{w:384,h:512},images);sheets[person.id]=c.toDataURL('image/png').split(',')[1];}
  const c=document.createElement('canvas');c.width=1152;c.height=1120;h.drawHikerRoster(c.getContext('2d'),{w:c.width,h:c.height},images);sheets.roster=c.toDataURL('image/png').split(',')[1];
  return {count,sheets,textureInfo:gpBoard.userData.posters.map(p=>({id:p.userData.hiker.id,sameTexture:p.material.map===p.userData.tex,sameCanvas:p.material.map.image===p.userData.canvas,liveSize:[p.material.map.image?.width,p.material.map.image?.height],canvasSize:[p.userData.canvas.width,p.userData.canvas.height],version:p.material.map.version,sourceVersion:p.material.map.source.version,visible:p.visible,parent:p.parent?.name}))};
 })()`);
 for(const [id,png]of Object.entries(painted.sheets))fs.writeFileSync(`${out}/${id}.png`,Buffer.from(png,'base64'));
 if(painted.count!==6)throw Error('Expected six painted posters');
 for(const light of ['noon','overcast','dusk','night'])for(const view of ['front','angle','fp','tp']){
  const state=await e.page.evaluate(`(async()=>{await gpHikersSetup(${JSON.stringify(light)},${JSON.stringify(view)});return {first:TT.fpDbg().first,position:TT.player.position.toArray(),flashlight:TT.flashlight.visible,render:{...TT.renderer.info.render}};})()`);
  await e.page.screenshot(`${out}/${light}-${view}.png`);frames.push({light,view,...state});
 }
 const result={scope:'Runtime painter preview; not production consumer wiring',painted:painted.count,textureInfo:painted.textureInfo,frames,errors:e.page.errors,warnings:e.page.console.filter(c=>c.type==='warning'||c.type==='warn'),renderer:e.renderer,loadSec:e.loadSec};
 fs.writeFileSync(`${out}/result.json`,JSON.stringify(result,null,2));console.log(JSON.stringify({...result,frames:frames.length}));
 if(result.errors.length)process.exitCode=1;
}finally{await e.close();}
