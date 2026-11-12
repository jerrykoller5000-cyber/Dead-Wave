import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20125');
const backend=await serve(root,0);
let server=backend;
if(phase==='before-proof'){
 const proxy=http.createServer(async(req,res)=>{
  if(req.url.split('?')[0]==='/studio/marine-body.js'){
   const s=fs.readFileSync(path.join(root,'studio/marine-body.js'),'utf8').replace('rmesh(.001,.015,.2,webMat,.00025),side*.1825','rmesh(.008,.015,.2,webMat,.002),side*.185');
   res.writeHead(200,{'content-type':'text/javascript'});res.end(s);return;
  }
  const response=await fetch(backend.origin+req.url);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 });
 await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
 server={origin:'http://127.0.0.1:'+proxy.address().port,close:()=>{proxy.close();backend.close();}};
}
const browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:900});
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{timeout:240000});await page.waitFor('!!window.TT',{timeout:120000});
 await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
 await page.evaluate(fs.readFileSync(path.join(root,'tools/tests/lib.js'),'utf8'));
 let code=fs.readFileSync(path.join(root,'tools/tests/tcc344.js'),'utf8');
 if(phase==='diag'){
  code=code.replace("const label = (o) => (matName(o) || '?')", "const label = (o) => (window.__kitMeshes ||= new Map(), window.__kitMeshes.set(o.uuid,o), (matName(o) || '?'))");
  code=code.replace("[...POSES, ...KIT.map(([n, f]) => [n.replace('kit: ', '') + ' again', f])]",'POSES.slice(0,1)');
 }
 const result=await page.evaluate(code,300000);
 fs.writeFileSync(path.join(out,phase+'-tcc344.txt'),String(result));console.log(result);
 if(phase==='diag'){
  const meshes=await page.evaluate(`(()=>{const T=TT,V=T.THREE.Vector3,target=T.player.position.clone().add(new V(.18,1.03,.07)),a=[];for(const [id,o]of window.__kitMeshes){if(!o.isMesh)continue;o.geometry.computeBoundingBox();const box=new T.THREE.Box3().setFromObject(o);if(box.distanceToPoint(target)>.1)continue;const P=o.geometry.attributes.position,points=[];for(let i=0;i<P.count;i++){const local=new V().fromBufferAttribute(P,i),world=local.clone().applyMatrix4(o.matrixWorld);points.push({i,d:world.distanceTo(target),local:local.toArray(),world:world.sub(T.player.position).toArray()});}points.sort((x,y)=>x.d-y.d);const chain=[];for(let p=o;p&&p!==T.marine;p=p.parent)chain.push({name:p.name,pos:p.position.toArray(),rot:p.rotation.toArray(),scale:p.scale.toArray()});a.push({id,name:o.name,material:o.material.name,count:P.count,box:o.geometry.boundingBox,chain,points:points.slice(0,6)});}return a;})()`);
  fs.writeFileSync(path.join(out,'diag-meshes.json'),JSON.stringify(meshes,null,2));
 }
 await page.evaluate(`(()=>{const T=TT;T.flightHold(true);T.setUnarmedDbg(true);T.flightInput({keys:[],zoom:false});for(let i=0;i<60;i++)T.stepFrame(1/30);const p=T.player.position;T.setShotView({x:p.x+.9,y:p.y+1.2,z:p.z+1.7,tx:p.x,ty:p.y+1.05,tz:p.z,fov:34});return true;})()`);
 for(const light of ['noon','overcast','dusk','night']){
  await page.evaluate(`(async()=>{const T=TT,H=T.inspectHost(),L=(await import('/studio/inspector/stage.js')).LIGHTS[${JSON.stringify(light)}],p=T.player.position;const apply=()=>{H.sun.position.copy(p).addScaledVector(new T.THREE.Vector3(...L.dir).normalize(),75);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;};H.attach({held:()=>false,scale:dt=>dt,frame:apply});for(let i=0;i<4;i++)T.stepFrame(1/30);apply();})()`);
  await page.screenshot(path.join(out,phase+'-'+light+'.png'));
 }
}finally{await browser.close();await server.close();}
