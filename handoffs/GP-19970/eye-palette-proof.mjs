import fs from 'node:fs';
import {Engine,jobReq} from '../../tools/camera.mjs';
const phase=process.argv[2]||'after',out=`handoffs/GP-19970/eyes-${phase}-four-lights`;
if(!['before','after'].includes(phase))throw Error('Use before or after');
if(phase==='before'&&fs.existsSync(`${out}/result.json`))throw Error('Archived baseline already exists');
fs.mkdirSync(out,{recursive:true});
const engine=new Engine({inspect:true,warm:'none',size:[1200,900]}),metrics=[];
const shoot=engine.shoot.bind(engine);
engine.shoot=async req=>{
 const r=await shoot(req);
 const d=await engine.page.evaluate(`(async()=>{const png=await DWInspect.shot(),im=new Image();im.src=png;await im.decode();const c=document.createElement('canvas');c.width=400;c.height=300;const g=c.getContext('2d');g.drawImage(im,0,0,400,300);const p=g.getImageData(0,0,400,300).data;let lit=0;for(let i=0;i<p.length;i+=4)if(p[i]+p[i+1]+p[i+2]>12)lit++;if(lit<500)throw Error('blank render');return {png,thumb:c.toDataURL('image/jpeg',.9).split(',')[1],subject:DWInspect.current(),render:TT.renderer.info.render,errors:DWInspect.errors()};})()`);
 fs.writeFileSync(r.file,Buffer.from(d.png.split(',')[1],'base64'));r.thumb=d.thumb;
 metrics.push({file:r.file,subject:d.subject,render:d.render,errors:d.errors});return r;
};
try{
 await engine.open();
 const types=['shambler','feral','leaper','spider','drowned','military','brute','spitter','screamer','bomber','demon','colossus','guardian','caveguard'];
 const results=[];
 for(const light of ['noon','overcast','dusk','night']){
  const pre=`await DWInspect.light('${light}');`;
  const shots=types.map(k=>({target:`zombie.${k}:statue`,view:'three',pre,out:`${out}/${light}/${k}.png`,caption:`${k} / ${light}`}));
  shots.push(...['wet','iron'].map(v=>({target:`person.cave-guardian:${v}`,view:'three',pre,out:`${out}/${light}/cave-guardian-${v}.png`,caption:`Cave guardian ${v} / ${light}`})));
  const r=await engine.run(jobReq({shots,cols:4,tile:400,sheetFile:`${out}/${light}/sheet.jpg`}));
  results.push({light,...r});console.log(`${light}: ${r.ok}, ${r.shots.length} shots`);if(!r.ok)process.exitCode=1;
 }
 fs.writeFileSync(`${out}/result.json`,JSON.stringify({results,metrics,pageErrors:engine.page.errors},null,2));
 if(phase==='after'){
  const source=fs.readFileSync('handoffs/GP-19970/eye-lifecycle-probe.js','utf8');
  const lifecycle=await engine.page.evaluate(`(async()=>{${source};return await eyeLifecycleProbe();})()`);
  fs.writeFileSync(`${out}/lifecycle.json`,JSON.stringify(lifecycle,null,2));
  console.log(JSON.stringify({materialPass:lifecycle.materialPass,pool:lifecycle.pool}));
  if(!lifecycle.materialPass||!lifecycle.pool.restored)process.exitCode=1;
 }
 console.log(JSON.stringify({phase,capturePass:results.every(r=>r.ok)&&!engine.page.errors.length,shots:metrics.length,errors:engine.page.errors}));
 if(engine.page.errors.length)process.exitCode=1;
}finally{await engine.close();}
