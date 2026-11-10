import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20079/probe');fs.mkdirSync(out,{recursive:true});
const server=await serve(root,0),browser=await launch({headless:false,args:['--disable-features=CalculateNativeWinOcclusion','--window-size=1000,1000']});
try{
 const page=await browser.newPage({width:1000,height:1000});
 await page.goto(`${server.origin}/index.html?inspect&raf=timer`);
 if(!await page.waitFor('(window.DWInspect && window.DWInspect.ready) || !!window.DWInspectError',{timeout:180000}))throw Error('inspector not ready');
 const rows=[];
 for(const kind of ['shambler','feral','leaper','spider','drowned','military','brute','spitter','screamer','bomber','demon','colossus','guardian','caveguard']){
  const data=await page.evaluate(`(async()=>{await DWInspect.show('zombie.${kind}',{mode:'walk'});await DWInspect.stepAsync(6);const z=DWInspect.zombie.get(),T=TT,box=new T.THREE.Box3().setFromObject(z.mesh),center=box.getCenter(new T.THREE.Vector3()),size=box.getSize(new T.THREE.Vector3()),d=Math.max(4,size.y*2.8,size.z*2.5);T.setShotView({x:center.x+d,y:center.y+size.y*.1,z:center.z,tx:center.x,ty:center.y,tz:center.z,fov:40});let n=0;const names=[],sources=[];z.mesh.traverse(o=>{if(o.isMesh){n++;if(names.length<25)names.push({name:o.name,parent:o.parent?.name,verts:o.geometry?.attributes?.position?.count});if(o.userData.skinSrc){let p=o.parent,chain=[];while(p&&p!==z.mesh){if(p.name)chain.unshift(p.name);p=p.parent;}const b=new T.THREE.Box3().setFromObject(o);sources.push({name:o.name,chain:chain.join('/'),surface:o.material?.userData?.surface,center:b.getCenter(new T.THREE.Vector3()).toArray(),size:b.getSize(new T.THREE.Vector3()).toArray()});}}});return {kind:'${kind}',center:center.toArray(),size:size.toArray(),meshes:n,names,sources,alive:z.alive};})()`);
  await new Promise(r=>setTimeout(r,500));
  await page.screenshot(path.join(out,`${kind}.png`));rows.push(data);
 }
 fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify({rows,errors:page.errors},null,2));
 console.log('ZOMBIE PROBE',JSON.stringify({rows:rows.map(x=>({kind:x.kind,meshes:x.meshes,size:x.size})),errors:page.errors.length}));
}finally{await browser.close();await server.close();}
