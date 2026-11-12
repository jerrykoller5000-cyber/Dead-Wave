// GP-20122: count actual WebGPU draw submissions at the idle CIF station.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20122');
const label = process.argv[2] || 'draws';
const result = { at: new Date().toISOString(), label, errors: [] };
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(server.origin + '/index.html?debug=1', { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 })) throw Error('Load not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active===false', { timeout: 500000 });
  await page.evaluate('(()=>{document.getElementById("playerName").value="GP-20122 draw audit";document.getElementById("modeTraining").click()})()');
  if (!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 400000 })) throw Error('Training entry not ready');
  await page.evaluate('(()=>{const t=TT.trainingDbg.tg(),f=t.stations.cif.front;TT.player.position.set(f.x,t.floorY,f.z)})()');
  await new Promise(r => setTimeout(r, 2000));
  if (label.includes('churn')) await page.evaluate(`(()=>{
    const r=TT.renderer,o=r._objects,n=r._nodes;
    const q=window.__gpChurn={created:0,cacheKeyCalls:0,cacheHits:0,cacheMisses:0,missReasons:{},lights:new Set(),groups:new Set(),uniformGroups:new Set(),nullValues:0,draws:0,oldCreate:o.createRenderObject,oldCache:n.getCacheKey,oldDraw:r.backend.draw};
    o.createRenderObject=function(...a){q.created++;return q.oldCreate.apply(this,a)};
    r.backend.draw=function(renderObject,...rest){
      q.draws++;
      for(const group of renderObject.getBindings()){q.groups.add(group);for(const binding of group.bindings)if(binding.isUniformsGroup){q.uniformGroups.add(binding);if(binding._values===null)q.nullValues++}}
      return q.oldDraw.call(this,renderObject,...rest);
    };
    n.getCacheKey=function(...a){
      q.cacheKeyCalls++;const l=a[1];q.lights.add(l);const c=l?._steadyCacheKey;
      let reason='initial';
      if(c&&l){reason='other';if(c.version!==l.version)reason='version';
        else if(c.diffuse!==l.totalDiffuseNode||c.diffuseVersion!==l.totalDiffuseNode.version||c.specular!==l.totalSpecularNode||c.specularVersion!==l.totalSpecularNode.version||c.outgoing!==l.outgoingLightNode||c.outgoingVersion!==l.outgoingLightNode.version)reason='child';
        else if(c.lights.length!==l._lights.length)reason='light-count';
        else for(let i=0;i<l._lights.length;i++){const x=l._lights[i],p=c.lights[i];if(p.light!==x||p.castShadow!==x.castShadow||p.shadow!==x.shadow||p.shadowMap!==x.shadow?.map||p.map!==x.map||p.version!==x.version){reason='light-state';break}}
      }
      const result=q.oldCache.apply(this,a);
      if(l?._steadyCacheKey===c)q.cacheHits++;else {q.cacheMisses++;q.missReasons[reason]=(q.missReasons[reason]||0)+1}
      return result;
    };
  })()`);
  result.containmentVisibility = await page.evaluate(`(()=>{const T=TT.THREE,c=TT.camera;c.updateMatrixWorld();const f=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse));return {eye:c.position.toArray(),player:TT.player.position.toArray(),turrets:TT.trainingDbg.state().containment.read().turrets.map(t=>({wall:t.wall,x:t.x,y:t.y,z:t.z,inFrustum:f.intersectsSphere(new T.Sphere(new T.Vector3(t.x,t.y,t.z),3.5))}))}})()`);
  if (label.includes('shot')) await page.screenshot(path.join(out, `${label}.png`));
  await page.evaluate(`(()=>{
    const r=TT.renderer, old=r._handleObjectFunction, counts=new Map(), audit={frames:0,counts,old};
    window.__gpDrawAudit=audit;
    r._handleObjectFunction=function(...args){
      const o=args[0];let rec=counts.get(o);
      if(!rec){rec={object:o,calls:0,main:0,other:0,passIds:new Set()};counts.set(o,rec)}
      rec.calls++;if(args[3]===TT.camera)rec.main++;else rec.other++;
      if(args[7])rec.passIds.add(args[7]);
      return old.apply(this,args);
    };
    const frame=()=>{if(!audit.active)return;audit.frames++;requestAnimationFrame(frame)};
    audit.active=true;requestAnimationFrame(frame);
  })()`);
  await new Promise(r => setTimeout(r, 1200));
  result.audit = await page.evaluate(`(()=>{
    const a=window.__gpDrawAudit;a.active=false;TT.renderer._handleObjectFunction=a.old;
    function lineage(o){const names=[];for(let p=o;p&&p!==TT.scene;p=p.parent)names.unshift(p.name||p.type+'#'+p.id);return names}
    const rows=[...a.counts.values()].map(v=>{const o=v.object,l=lineage(o),ud=o.userData||{};return {path:l.join('/'),root:l[0]||'',branch:l.slice(0,3).join('/'),name:o.name||'',type:o.type,geometry:o.geometry?.type||'',material:Array.isArray(o.material)?o.material.map(m=>m?.type).join(','):o.material?.type||'',userData:Object.keys(ud).slice(0,15),calls:v.calls,main:v.main,other:v.other,passIds:[...v.passIds]}});
    const sum=(key)=>{const m=new Map();for(const row of rows){const k=row[key],v=m.get(k)||{key:k,objects:0,calls:0,main:0,other:0};v.objects++;v.calls+=row.calls;v.main+=row.main;v.other+=row.other;m.set(k,v)}return [...m.values()].sort((a,b)=>b.calls-a.calls)};
    return {frames:a.frames,objects:rows.length,totalCalls:rows.reduce((n,r)=>n+r.calls,0),byRoot:sum('root'),byBranch:sum('branch'),rows:rows.sort((a,b)=>b.calls-a.calls)};
  })()`);
  if (label.includes('churn')) result.churn=await page.evaluate(`(()=>{
    const q=__gpChurn,r=TT.renderer;r._objects.createRenderObject=q.oldCreate;r._nodes.getCacheKey=q.oldCache;r.backend.draw=q.oldDraw;
    return {created:q.created,cacheKeyCalls:q.cacheKeyCalls,cacheHits:q.cacheHits,cacheMisses:q.cacheMisses,missReasons:q.missReasons,uniqueLightsNodes:q.lights.size,draws:q.draws,groups:q.groups.size,uniformGroups:q.uniformGroups.size,nullValues:q.nullValues,lights:[...q.lights].map(l=>({type:l?.constructor?.name,isNode:l?.isNode,lightCount:l?._lights?.length,cachePresent:!!l?._steadyCacheKey,version:l?.version}))};
  })()`);
  result.errors = page.errors.slice();
  console.log(JSON.stringify({ frames:result.audit.frames,objects:result.audit.objects,totalCalls:result.audit.totalCalls,byRoot:result.audit.byRoot.slice(0,30),byBranch:result.audit.byBranch.slice(0,30),errors:result.errors }).slice(0,16000));
} catch (error) {
  result.failure = String(error?.stack || error);
  console.error(result.failure);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(result, null, 2) + '\n', 'utf8');
  await browser.close();
  await server.close();
}
