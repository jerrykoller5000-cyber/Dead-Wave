import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const root=new URL('./',import.meta.url);await mkdir(root,{recursive:true});
let code=await readFile(new URL('../../tools/tests/tce4.js',root),'utf8');
function replace(a,b){assert.equal(code.split(a).length,2,'Unique diagnostic seam: '+a.slice(0,80));code=code.replace(a,b);}
replace("parts.push({ name: mm.name || (mm.parent && mm.parent.name) || '?', P, box });","parts.push({ name: mm.name || (mm.parent && mm.parent.name) || '?', P, box, mesh: mm });");
replace("let worst = 0, where = '';","let worst = 0, where = '', detail = null;");
replace("worst = d; where = mk + ' in ' + pt.name;","worst = d; where = mk + ' in ' + pt.name; const skin=A.rig.skins.find(s=>s.mesh===mm),bone=skin?.seg[i],bone1=skin?.b1[i];let ancestor=pt.mesh,path=[];while(ancestor&&ancestor!==V.gun.root){path.unshift({index:ancestor.parent?.children.indexOf(ancestor),name:ancestor.name,type:ancestor.type});ancestor=ancestor.parent;}detail={mesh:mk,vertex:i,bone,bone1,weight1:skin?.w1[i],digit:bone===0?'palm':bone>=13?'thumb':['index','middle','ring','little'][Math.floor((bone-1)/3)],point:v.toArray(),handLocal:new THREE.Vector3().fromBufferAttribute(pa,i).toArray(),part:pt.name,path,partBox:{min:pt.box.min.toArray(),max:pt.box.max.toArray()},triangles:Array.from(pt.P),gunScale:gs,depthMm:d*1000};");
replace("return { worst, where };","return { worst, where, detail };");
replace("fullPress = { gapMm:","if(['pistol','revolver'].includes(k))await window.captureLightContact(k,V,A,g,E,lp);fullPress = { gapMm:");
const setup=async function(){
 const H=TT.inspectHost(),G=TT.THREE;window.diagResults=[];window.diagDone=false;
 let lighting=null;const {LIGHTS}=await import('/studio/inspector/stage.js');
 H.attach({held:()=>!!window.diagPending,scale:dt=>dt,frame:()=>{if(!lighting)return;const p=TT.player.position;H.sun.position.copy(p).addScaledVector(new G.Vector3(...lighting.dir).normalize(),85);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(lighting.sunColor);H.sun.intensity=lighting.sun;H.hemi.color.setHex(lighting.skyColor);H.hemi.groundColor.setHex(lighting.ground);H.hemi.intensity=lighting.sky;H.ambientFill.intensity=lighting.fill;H.moon.intensity=0;}});
 window.diagLight=key=>{lighting=LIGHTS[key];if(!lighting)throw Error(key);};
 window.captureLightContact=async(k,V,A,g,E,lp)=>{
  const record={gun:k,detail:g.detail,where:g.where,pose:JSON.parse(JSON.stringify(A.rig.pose)),lightRow:E,pressTimes:lp,info:JSON.parse(JSON.stringify(V.info.light)),frame:{p:V.frame.p.toArray(),q:V.frame.q.toArray(),s:V.frame.s},wrist:{p:V.wrists.l.p.toArray(),q:V.wrists.l.q.toArray()}};
  window.diagResults.push(record);window.diagPending=k;
  await new Promise(resolve=>window.diagContinue=resolve);
  window.diagPending=null;
 };
};
const server=await serve(fileURLToPath(new URL('../../',root)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');
 assert(await page.waitFor('!!window.TT',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',root),'utf8'));
 await page.evaluate('('+setup.toString()+')()');
 await page.evaluate('window.diagRun=('+code+').then(result=>{window.diagText=result;window.diagDone=true}).catch(e=>{window.diagError=e.stack;window.diagDone=true});true');
 for(let n=0;n<800;n++){
  const state=await page.evaluate('({pending:window.diagPending,done:window.diagDone,error:window.diagError})');
  if(state.error)throw Error(state.error);if(state.done)break;
  if(state.pending){
   const k=state.pending,dir=new URL(k+'/',root);await mkdir(dir,{recursive:true});
   for(const light of ['noon','overcast','dusk','night']){
    await page.evaluate('diagLight('+JSON.stringify(light)+');TT.stepFrame(0);new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
    const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('press-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
   }
   const record=await page.evaluate('window.diagResults.at(-1)');await writeFile(new URL('contact.json',dir),JSON.stringify(record,null,2));
   console.log('CONTACT',k,record.where,record.detail?.digit,record.detail?.depthMm,record.detail?.point,record.detail?.partBox);
   await page.evaluate("(()=>{diagLight('noon');const G=TT.THREE,V=TT.viewmodelDbg(),d=diagResults.at(-1).detail;const geo=new G.BufferGeometry();geo.setAttribute('position',new G.Float32BufferAttribute(d.triangles,3));window.diagOverlay=new G.Mesh(geo,new G.MeshBasicMaterial({color:0xffa02b,transparent:true,opacity:.6,depthTest:false,depthWrite:false,side:G.DoubleSide}));V.gun.root.add(diagOverlay);window.diagDot=new G.Mesh(new G.SphereGeometry(.0018,12,8),new G.MeshBasicMaterial({color:0xff2644,depthTest:false}));diagDot.position.fromArray(d.point);V.gun.root.add(diagDot);TT.stepFrame(0);return true})()");
   const highlight=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('press-contact-noon.png',dir),Buffer.from(highlight.data,'base64'));
   await page.evaluate('diagOverlay.removeFromParent();diagDot.removeFromParent();true');
   await page.evaluate('window.diagContinue();true');
  }else await new Promise(r=>setTimeout(r,100));
 }
 assert(await page.evaluate('window.diagDone'),'Diagnostic completed');
 const result=await page.evaluate('window.diagText');await writeFile(new URL('tce4-diagnostic.txt',root),result);console.log(result);
 assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close();}
