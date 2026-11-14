// CB-335 review sheet (t222 follow-up): the cursor on the ground at a still zombie's feet and just off its edge, from the
// game camera, on the real renderer. Draws where the round goes (muzzle -> along the aim, to its first zombie hit or the
// ground): red line, yellow end; the cursor's ground point cyan. Stage 'before' serves index.html with the CB-335
// footprint line taken out (in memory only); 'after' serves the live file. The Training Ground's build room (as
// tools/aimsheet.mjs), headless software rendering in Claude 2's cloud (~6 min a load):
//   node review/CB-335/footaim-native.mjs before|after
import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

const stage = process.argv[2] || 'after', out = 'review/CB-335/' + stage;
fs.mkdirSync(out, {recursive: true});
let index = fs.readFileSync('index.html', 'utf8');
const LINE = /\r?\n *\/\/ CB-335: a ground point inside a body's footprint[^\n]*\r?\n *if \(!assistZ && !scoped && !_otsCentre && !trainingHit\) \{\r?\n[^\n]*\r?\n[^\n]*\r?\n *\}/;
if (stage === 'before') { assert(LINE.test(index), 'footprint line not found'); index = index.replace(LINE, ''); }
const back = await serve(process.cwd(), 0);
const proxy = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://x').pathname;
  if (pathname === '/index.html') { res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}); return res.end(index); }
  const h = http.request(new URL(req.url, back.origin), {headers: req.headers}, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  h.on('error', (e) => res.end(String(e))); req.pipe(h);
});
await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
let browser, page; const report = {stage, rows: []};
const setup = `(async()=>{const T=window.TT,D=T.trainingDbg,wait=ms=>new Promise(r=>setTimeout(r,ms));
  document.getElementById('playerName').value='CB-335';document.getElementById('modeTraining').click();
  const t0=Date.now();while((!D.state().active||document.getElementById('trainingBlackout')?.classList.contains('on'))&&Date.now()-t0<300000)await wait(250);
  await wait(3500);const pf=document.getElementById('perf');if(pf)pf.style.display='none';
  const tg=D.tg(),O=tg.origin,P=T.localPlayer?T.localPlayer.position:T.player.position;
  P.set(O.x-17,tg.floorY,O.z-7);T.setAimYawDbg(0);T.runDevCommand&&T.runDevCommand('godmode');await wait(1500);return{active:D.state().active,origin:[O.x,O.z]};})()`;
const probe = (kind, type) => `(async()=>{const T=window.TT,THREE=T.THREE,cam=T.camera,canvas=T.renderer.domElement,wait=ms=>new Promise(r=>setTimeout(r,ms));
  const P=T.localPlayer?T.localPlayer.position:T.player.position;T.clearZombies();
  for(const o of (window._cb335||[]))o.parent&&o.parent.remove(o);window._cb335=[];
  const z=T.spawnZombie(P.x,P.z+7,${JSON.stringify(type)},true,true);z.trainingZ=true;z.riseT=0;z.hp=z.maxHp=1e6;z.speed=z.baseSpeed=0;await wait(1600);
  const zp=z.mesh.position,H=z.hitH||1.45,toP=new THREE.Vector3(P.x-zp.x,0,P.z-zp.z).normalize();
  const g=${kind==='feet'?'zp.clone()':'zp.clone().addScaledVector(toP,(z.radius||0.4)+0.2)'};g.y=T.sampleHeight(g.x,g.z);
  const project=wp=>{const f=cam.getWorldDirection(new THREE.Vector3()),right=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,f).normalize(),w=wp.clone().sub(cam.position),t=Math.tan((cam.fov||50)*Math.PI/360),fz=w.dot(f);return{x:w.dot(right)/fz/(t*(cam.aspect||1)),y:w.dot(up)/fz/t};};
  const r=canvas.getBoundingClientRect(),pt=wp=>{const v=project(wp);return[r.left+(v.x+1)/2*r.width,r.top+(1-v.y)/2*r.height];};
  for(let i=0;i<8;i++){cam.updateMatrixWorld(true);const[x,y]=pt(g);canvas.dispatchEvent(new PointerEvent('pointermove',{clientX:x,clientY:y,bubbles:true}));await wait(110);}
  const M=T.getMuzzleWorld().clone(),d=T.aimTarget.clone().sub(M).normalize();let far=70;
  for(let s=0.5;s<70;s+=0.02){const x=M.x+d.x*s,y=M.y+d.y*s,w=M.z+d.z*s;if(y<T.sampleHeight(x,w)-0.02){far=s;break;}}
  const E=M.clone().addScaledVector(d,far),h=T.zombieRoundHit(z,M.clone(),E);const end=h?new THREE.Vector3(h.point.x,h.point.y,h.point.z):E;
  const res=h?((h.point.y-zp.y)/H<0.4?'legs':'body'):(far<70?'ground':'miss');
  const mat=c=>new THREE.MeshBasicMaterial({color:c,depthTest:false,transparent:true,opacity:0.95,toneMapped:false});
  const L=end.distanceTo(M),line=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,L,6),mat(0xff2020));line.position.copy(M).add(end).multiplyScalar(0.5);
  line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.clone().sub(M).normalize());line.renderOrder=999;
  const ball=(p,c,s)=>{const b=new THREE.Mesh(new THREE.SphereGeometry(s,12,8),mat(c));b.position.copy(p);b.renderOrder=999;return b;};
  for(const o of[line,ball(end,0xffe000,0.05),ball(g,0x00e5ff,0.04)]){o.frustumCulled=false;T.scene.add(o);window._cb335.push(o);}
  await wait(300);const zs=pt(new THREE.Vector3(zp.x,zp.y+H*0.5,zp.z));
  return{kind:${JSON.stringify(kind)},type:${JSON.stringify(type)},res,hitFrac:h?+((h.point.y-zp.y)/H).toFixed(2):null,aimKind:T.aimKindDbg?T.aimKindDbg():null,ground:g.toArray().map(v=>+v.toFixed(3)),aim:T.aimTarget.toArray().map(v=>+v.toFixed(3)),zScreen:zs.map(Math.round),dpr:devicePixelRatio};})()`;
try {
  browser = await launch({headless: process.platform === 'linux'});
  page = await browser.newPage({width: 1280, height: 720});
  await page.goto('http://127.0.0.1:' + proxy.address().port + '/index.html?debug=1&raf=timer', {waitUntil: 'none'});
  assert(await page.waitFor('!!window.DWOpening', {timeout: 60000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"', {timeout: 600000}));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active', {timeout: 300000}));
  await pause(800);
  report.spot = await page.evaluate(setup, 400000);
  for (const type of ['shambler', 'brute']) for (const kind of ['feet', 'edge']) {
    const row = await page.evaluate(probe(kind, type), 300000);
    const file = `${type}-${kind}.png`; await page.screenshot(out + '/' + file);
    report.rows.push({...row, file}); console.log(stage, type, kind, row.res, row.hitFrac, row.aimKind);
  }
  report.errors = page.errors;
} catch (e) { report.failure = String(e.stack || e); console.error(report.failure); process.exitCode = 1; }
finally {
  if (page) report.console = (page.console || []).filter((c) => c.type === 'error' || /Grave Shift: a render target/.test(c.text)).slice(0, 40);
  fs.writeFileSync(out + '/records.json', JSON.stringify(report, null, 2));
  await browser?.close(); await new Promise((r) => proxy.close(r)); await back.close();
}
