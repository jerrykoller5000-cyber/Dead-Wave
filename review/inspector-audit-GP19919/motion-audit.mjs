import fs from 'node:fs';
import path from 'node:path';
import { Engine } from '../../tools/camera.mjs';
const dir = path.resolve('review/inspector-audit-GP19919/motion'); fs.mkdirSync(dir, {recursive:true});
const E = new Engine({inspect:true,warm:'none',size:'1440x1000'});
try {
  await E.open();
  const result = await E.page.evaluate(`(async()=>{
    const api=DWInspect, results=[], images=[], wait=ms=>new Promise(r=>setTimeout(r,ms));
    for(const move of api.marine.moves()) {
      await api.show('marine');api.speed(1);let timer;
      try {
        await Promise.race([api.marine.play(move.id,{loop:false}),new Promise((_,j)=>{timer=setTimeout(()=>j(new Error('move deadline exceeded')),10000)})]);
        clearTimeout(timer);await wait(160);
        const state=api.marine.state();api.pause();api.view('three',{instant:true});
        const image=await api.shot({type:'image/jpeg',quality:.78});images.push({image,label:move.id});
        const root=TT.player;let nonfinite=0;root.traverse(o=>{for(const v of [o.position.x,o.position.y,o.position.z,o.quaternion.x,o.quaternion.y,o.quaternion.z,o.quaternion.w,o.scale.x,o.scale.y,o.scale.z])if(!Number.isFinite(v))nonfinite++;});
        results.push({id:move.id,ok:state.move===move.id&&!state.error&&!nonfinite,state,nonfinite});
      } catch(e){results.push({id:move.id,ok:false,error:e.message});}finally{clearTimeout(timer);api.marine.stop();api.marine.home();api.play();}
    }
    const cols=6,tile=240,th=167,c=document.createElement('canvas');c.width=cols*tile;c.height=Math.ceil(images.length/cols)*th;const g=c.getContext('2d');g.fillStyle='#111';g.fillRect(0,0,c.width,c.height);
    for(let k=0;k<images.length;k++){const item=images[k],im=await new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.src=item.image;});const x=k%cols*tile,y=Math.floor(k/cols)*th;g.drawImage(im,x,y,tile,th);g.fillStyle='#000b';g.fillRect(x,y+th-20,tile,20);g.fillStyle='#f2c418';g.font='12px Arial';g.fillText(item.label,x+6,y+th-5);}
    return {results,image:c.toDataURL('image/jpeg',.9),errors:api.errors()};
  })()`,240000);
  fs.writeFileSync(path.join(dir,'moves.jpg'),Buffer.from(result.image.split(',')[1],'base64'));
  fs.writeFileSync(path.join(dir,'moves.json'),JSON.stringify({loadSec:E.loadSec,renderer:E.renderer,...result,image:undefined},null,2)+'\n');
  console.log('MOVES '+result.results.filter(r=>r.ok).length+'/'+result.results.length+'; errors '+result.errors.length);
  for(const r of result.results.filter(r=>!r.ok))console.log('FAIL '+r.id+': '+r.error);
  for(const [w,h]of [[1000,800],[800,650]]) {
    await E.page.setViewport(w,h);await E.page.evaluate('DWInspect.show("marine")');
    await E.run({cmd:'shot',target:'marine',ui:true,size:[w,h],out:path.join(dir,'ui-'+w+'.png')});
  }
  await E.page.setViewport(1440,1000);
  const persisted=await E.page.evaluate(`(async()=>{localStorage.setItem('dwi.collapsed','{broken');localStorage.setItem('dwi.marineTab','removed-tab');return true;})()`);
  await E.load();
  const storage=await E.page.evaluate('({ok:DWInspect.ready&&!!document.querySelector("[data-move=walk]"),errors:DWInspect.errors()})');
  fs.writeFileSync(path.join(dir,'settings-reload.json'),JSON.stringify(storage,null,2));console.log('CORRUPT SETTINGS '+JSON.stringify(storage));
  if(result.results.some(r=>!r.ok)||result.errors.length||!storage.ok)process.exitCode=1;
} finally {await E.close();}
