import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';
const [mode,phase]=process.argv.slice(2);
assert(process.env.DW_GAME_TEST_TOKEN&&['native','fixture','isolated-fixture'].includes(mode)&&/^[a-z0-9-]+$/.test(phase));
const root=fileURLToPath(new URL('../../',import.meta.url)),s=await serve(root,0),b=await launch({headless:mode!=='native'});
try {
  const page=await b.newPage(mode==='native'?{width:960,height:540}:{width:1280,height:720});
  if(mode!=='native'){
    const html=await readFile(new URL('../../index.html',import.meta.url),'utf8');
    const map=/<script type="importmap">[\s\S]*?<\/script>/;
    assert(map.test(html));
    const fixture=html.replace(map,'<script type="importmap">'+JSON.stringify({imports:{
      three:'/tools/tests/fakethree.mjs','three/webgpu':'/tools/tests/fakethree.mjs','three/tsl':'/tools/tests/faketsl.mjs','three/addons/':'/tools/tests/addons/'}})+'</script>');
    // Serve only this diagnostic page with the gate's import map. All game modules are the current local files.
    const url=s.origin+'/index.html?debug=1&raf=timer';
    const fakeURL=s.origin+'/tools/tests/fakethree.mjs';
    let isolated;
    if(mode==='isolated-fixture'){
      const source=await readFile(new URL('../../tools/tests/fakethree.mjs',import.meta.url),'utf8');
      const original="clone() { const m = new this.constructor(); for (const k of Object.keys(this)) { const v = this[k]; m[k] = (v && v.isColor) ? v.clone() : v; } return m; }";
      const replacement="clone() { const m = new this.constructor(); for (const k of Object.keys(this)) { const v=this[k]; m[k]=k==='userData'?JSON.parse(JSON.stringify(v)):(v&&v.isColor)?v.clone():v; } return m; }";
      assert(source.split(original).length===2,'Shared fixture changed; rerun the unmodified gate');
      isolated=source.replace(original,replacement);
    }
    page.conn.onEvent(msg=>{
      if(msg.sessionId!==page.sessionId||msg.method!=='Fetch.requestPaused')return;
      const requested=new URL(msg.params.request.url);
      if(isolated && requested.href===fakeURL){
        page.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body:Buffer.from(isolated).toString('base64')}).catch(e=>page.errors.push(e.message));
        return;
      }
      const token=requested.searchParams.get('__gameTestToken');
      requested.searchParams.delete('__gameTestToken');
      if(requested.href!==url||token!==process.env.DW_GAME_TEST_TOKEN){
        page.errors.push('Unexpected diagnostic page or crew lease');
        page.send('Fetch.failRequest',{requestId:msg.params.requestId,errorReason:'BlockedByClient'}).catch(e=>page.errors.push(e.message));
        return;
      }
      page.send('Fetch.fulfillRequest',{requestId:msg.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html; charset=utf-8'}],body:Buffer.from(fixture).toString('base64')}).catch(e=>page.errors.push(e.message));
    });
    const patterns=[{urlPattern:s.origin+'/index.html*',resourceType:'Document'}];
    if(isolated)patterns.push({urlPattern:fakeURL});
    await page.send('Fetch.enable',{patterns});
  }
  await page.goto(s.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('!!window.TT',{timeout:120000}));
  await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
  const results=await page.evaluate(`(()=>{
    const T=TT,G=T.THREE;T.getGunFurniture();T.dressGuns({guns:{m4:'multicam',ak:'multicam'}});
    return ['m4','ak'].map(id=>{
      const gun=T.weaponMeshes[id];T.setGunSuppressor(gun,true);
      gun.updateWorldMatrix(true,true);const inv=gun.matrixWorld.clone().invert(),scale=Math.abs(gun.scale.x)||1;
      const paths=new Map(),painted=[];
      function walk(o,path){paths.set(o,path);if(o.isMesh&&o.material.userData.gunPaintId===id)painted.push(o);o.children.forEach((c,i)=>walk(c,path+'/'+(c.name||c.type)+'['+i+']'));}
      walk(gun,'root');
      function axis(x,y,z){return x>=y&&x>=z?0:y>=z?1:2;}
      const rows=painted.map((o,ordinal)=>{
        const p=o.geometry.attributes.position,uv=o.geometry.attributes.uv,m=new G.Matrix4().multiplyMatrices(inv,o.matrixWorld);
        const xyz=[0,1,2].map(i=>new G.Vector3().fromBufferAttribute(p,i).applyMatrix4(m));
        const cross=pts=>{const ab=pts[1].clone().sub(pts[0]),ac=pts[2].clone().sub(pts[0]);return ab.cross(ac).toArray().map(Math.abs);};
        const n=cross(xyz),rounded=xyz.map(v=>new G.Vector3(...v.toArray().map(Math.fround))),nf=cross(rounded);
        const ax=axis(...n),af=axis(...nf);
        const actual=xyz.map((_,i)=>[uv.getX(i),uv.getY(i)]),pairs=v=>[[v.z,v.y],[v.x,v.z],[v.x,v.y]];
        const expected=xyz.map(v=>pairs(v)[ax].map(k=>k*scale/.42));
        const bad=actual.filter((v,i)=>v.some((k,j)=>!(Math.abs(k-expected[i][j])<.0005))).length;
        return {ordinal,path:paths.get(o),role:o.material.userData.weaponFinishRole,tag:o.userData.gunPaintUV,triangles:p.count/3,ax,af,bad,
          data:bad?{firstPositions:xyz.map(v=>v.toArray()),relative:m.elements,scale,n,nf,actual,expected}:undefined};
      });
      const carrier=(gun.userData.recoilBoltParts||[]).map(m=>({path:paths.get(m),role:m.material.userData.weaponFinishRole||null,
        paint:m.material.userData.gunPaintId||null,map:!!m.material.map,colour:m.material.color.getHex()}));
      return {id,gateBad:rows.slice(0,24).reduce((n,r)=>n+r.bad,0),gateCount:3*Math.min(24,rows.length),carrier,rows};
    });
  })()`);
  const dir=new URL('./uv-investigation/',import.meta.url);await mkdir(dir,{recursive:true});
  await save(new URL(phase+'-'+mode+'.json',dir),JSON.stringify(results,null,2)+'\n');
  console.log(mode,JSON.stringify(results.map(r=>({id:r.id,bad:r.gateBad,samples:r.gateCount,affected:r.rows.filter(s=>s.bad).map(x=>[x.ordinal,x.path,x.role,x.ax,x.af])}))));
  if(mode==='native'&&['before','after'].includes(phase)){
    const target=new URL(phase+'/',dir);await mkdir(target,{recursive:true});
    await page.evaluate("document.getElementById('playerName').value='Paint comparison';document.getElementById('modeTraining').click()");
    assert(await page.waitFor("TT.trainingDbg.state().active && !TT.trainingDbg.state().warming && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
    await page.evaluate("import('/review/GT-20076/visibility-camera.mjs').then(m=>{window.v=m.makeViews(TT,"+JSON.stringify(phase==='before'?'record':'replay')+",true);return true})");
    if(phase==='after')await page.evaluate("fetch('/review/GT-20079/uv-investigation/before/cameras.json').then(r=>r.json()).then(c=>{window.recordedArtViews=c;return true})");
    await page.evaluate("v.equip('m4').then(()=>{TT.setGunSuppressor(TT.weaponMeshes.m4,true);TT.dressGuns({guns:{m4:'multicam'}});return true})");
    const cameras={};
    for(const view of ['hip','held-right-open']){
      cameras[view]=await page.evaluate('v.pose('+JSON.stringify(view)+')');
      for(const light of ['noon','overcast','dusk','night']){
        await page.evaluate('v.light('+JSON.stringify(light)+')');
        const shot=await page.send('Page.captureScreenshot',{format:'png'});
        await save(new URL(view+'-'+light+'.png',target),Buffer.from(shot.data,'base64'));
      }
    }
    await save(new URL('cameras.json',target),JSON.stringify(cameras,null,2)+'\n');
    if(phase==='after'){
      await page.evaluate("v.pose('hip')");
      const proof=await page.evaluate("import('/review/GT-20079/guard-paint-proof.mjs').then(m=>m.verifyGuardAndCarrier(TT))",120000);
      await save(new URL('guard-and-carrier.json',target),JSON.stringify(proof,null,2)+'\n');console.log('Native painted exterior and carrier',JSON.stringify(proof));
    }
  }
  if(mode==='isolated-fixture'){
    await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
    const originalTest=await readFile(new URL('../../tools/tests/t334.js',import.meta.url),'utf8');
    const lines=await page.evaluate(originalTest,300000);
    await save(new URL(phase+'-isolated-t334.txt',dir),lines+'\n');
    const all=lines.split('\n');console.log('Unmodified t334 in cloned registry',all.filter(l=>l.startsWith('PASS')).length,'pass',all.filter(l=>l.startsWith('FAIL')).length,'fail');
    assert(!all.some(l=>l.startsWith('FAIL')));
  }
  assert.deepEqual(page.errors,[]);
}finally{await b.close();await s.close();}
