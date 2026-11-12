// GP-20122: sample allocations while standing at Training's CIF station.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20122');
const label = process.argv[2] || 'baseline';
const duration = Math.max(1000, Number(process.argv[3]) || 15000);
const noCamera = label.startsWith('nocamera');
const noCifWarm = label.startsWith('nocifwarm');
const sampleAllocations = !label.startsWith('plain');
const liveHtml = path.join(out, 'profile-live.html');
const liveCamera = path.join(out, 'camera-noop.js');
if (noCamera || noCifWarm) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  html = html.replace('<head>', '<head><base href="/">');
  if (noCifWarm) html = html.replace('setTimeout(warmDressView, 0);', '').replace('setTimeout(warmCifSwatches, 0);', '');
  if (noCamera) {
  const camera = fs.readFileSync(path.join(root, 'game/training-camera-collision.js'), 'utf8');
  const importPath = './game/training-camera-collision.js';
  const cameraCall = 'const hit=trainingCameraContact(from,eye,candidates);';
  if (!html.includes(importPath) || !camera.includes(cameraCall)) throw Error('Camera probe anchor missing');
  html = html.replace(importPath, '/review/GP-20122/camera-noop.js');
  fs.writeFileSync(liveCamera, camera.replace(cameraCall, 'const hit=null;'), 'utf8');
  }
  fs.writeFileSync(liveHtml, html, 'utf8');
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const result = { at: new Date().toISOString(), label, duration, errors: [] };
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(server.origin + (noCamera || noCifWarm ? '/review/GP-20122/profile-live.html?debug=1' : '/index.html?debug=1'), { timeout: 400000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 })) throw Error('Load not ready');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('!window.DWOpening || window.DWOpening.active===false', { timeout: 500000 });
  await page.evaluate('(()=>{document.getElementById("playerName").value="GP-20122 memory";document.getElementById("modeTraining").click()})()');
  if (!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 400000 })) throw Error('Training entry not ready');
  await page.evaluate('(()=>{const t=TT.trainingDbg.tg(),f=t.stations.cif.front;TT.player.position.set(f.x,t.floorY,f.z)})()');
  await pause(2000);
  result.context = await page.evaluate('({solids:TT.trainingDbg.tg().solids.length,hiddenWorld:TT.getHidWorld()?.length??-1,children:TT.scene?.children?.length??-1,renderCalls:TT.renderer.info.render.calls})');
  if (label.startsWith('cachelights')) await page.evaluate(`(()=>{
    // Diagnostic only: freeze the environment/light cache key at this idle station.
    const nodes=TT.renderer._nodes,old=nodes.getCacheKey,keys=new Map();
    nodes.getCacheKey=function(scene,lights){
      let byScene=keys.get(scene);if(!byScene){byScene=new Map();keys.set(scene,byScene)}
      if(!byScene.has(lights))byScene.set(lights,old.call(this,scene,lights));
      return byScene.get(lights);
    };
  })()`);
  if (label.startsWith('cacherender')) await page.evaluate(`(()=>{
    // Diagnostic upper bound only: the scene is stationary, so bypass the
    // render-object lookup and refresh checks after the first known lookup.
    const objects=TT.renderer._objects,old=objects.get,cache=new WeakMap();
    objects.get=function(object,material,scene,camera,lights,context,clip,pass){
      let entries=cache.get(object);
      if(entries)for(const e of entries)if(e.material===material&&e.lights===lights&&e.context===context&&e.pass===pass)return e.result;
      const result=old.call(this,object,material,scene,camera,lights,context,clip,pass);
      if(!entries){entries=[];cache.set(object,entries)}
      entries.push({material,lights,context,pass,result});
      return result;
    };
  })()`);
  if (label.startsWith('cachecountnode')) await page.evaluate(`(()=>{
    const counts=window.__cb315={};
    const nodes=TT.renderer._nodes,prior=nodes.getCacheKey;
    counts.nodeCalls=0;counts.nodeLastHits=0;counts.nodePairRevisits=0;
    const pairs=new Map();
    nodes.getCacheKey=function(scene,lights){
      counts.nodeCalls++;
      if(this._lastKeyCallId===this.renderer.info.calls&&this._lastKeyScene===scene&&this._lastKeyLights===lights)counts.nodeLastHits++;
      let byScene=pairs.get(scene);if(!byScene){byScene=new Map();pairs.set(scene,byScene)}
      if(byScene.get(lights)===this.renderer.info.calls)counts.nodePairRevisits++;
      byScene.set(lights,this.renderer.info.calls);
      return prior.call(this,scene,lights);
    };
  })()`);
  if (label.startsWith('uniformcount')) await page.evaluate(`(()=>{
    const backend=TT.renderer.backend,old=backend.draw,seen=new WeakSet();
    const q=window.__cb315Uniform={groups:0,calls:0,changed:0,types:{},bufferTypes:{}};
    backend.draw=function(renderObject,info){
      for(const bindGroup of renderObject.getBindings())for(const binding of bindGroup.bindings)if(binding.isUniformsGroup&&!seen.has(binding)){
        seen.add(binding);q.groups++;
        const update=binding.updateNumber,buffer=binding._getBufferForType;
        binding.updateNumber=function(uniform){q.calls++;const type=uniform.getType();q.types[type]=(q.types[type]||0)+1;const changed=update.call(this,uniform);if(changed)q.changed++;return changed};
        binding._getBufferForType=function(type){q.bufferTypes[type]=(q.bufferTypes[type]||0)+1;return buffer.call(this,type)};
      }
      return old.call(this,renderObject,info);
    };
  })()`);
  if (label.startsWith('plainuniformtypes')) await page.evaluate(`(()=>{
    const backend=TT.renderer.backend,old=backend.draw,seen=new WeakSet();
    const q=window.__gpUniformTypes={groups:0,calls:[0,0,0,0,0,0,0],changed:[0,0,0,0,0,0,0]};
    backend.draw=function(renderObject,info){
      for(const bindGroup of renderObject.getBindings())for(const binding of bindGroup.bindings)if(binding.isUniformsGroup&&!seen.has(binding)){
        seen.add(binding);q.groups++;
        const update=binding.updateByType;
        binding.updateByType=function(u){
          const k=u.isNumberUniform?0:u.isVector2Uniform?1:u.isVector3Uniform?2:u.isVector4Uniform?3:u.isColorUniform?4:u.isMatrix3Uniform?5:6;
          q.calls[k]++;
          const changed=update.call(this,u);
          if(changed)q.changed[k]++;
          return changed;
        };
      }
      return old.call(this,renderObject,info);
    };
  })()`);
  if (label.startsWith('skipuniform')) await page.evaluate(`(()=>{
    const backend=TT.renderer.backend,old=backend.draw,seen=new WeakSet();
    backend.draw=function(renderObject,info){
      for(const bindGroup of renderObject.getBindings())for(const binding of bindGroup.bindings)if(binding.isUniformsGroup&&!seen.has(binding)){
        seen.add(binding);
        binding.updateByType=()=>false;
      }
      return old.call(this,renderObject,info);
    };
  })()`);
  await page.evaluate('(()=>{TT.profDbg.on=true;TT.profDbg.spikeMs=80;TT.profDbg.reset();const q=window.__gp20122={last:0,frames:0,spikes:[],running:true};function tick(t){if(!q.running)return;const m=performance.memory?.usedJSHeapSize||0;if(q.last&&t-q.last>80)q.spikes.push({ms:+(t-q.last).toFixed(1),heapMB:+(m/1e6).toFixed(1),frame:q.frames});q.frames++;q.last=t;requestAnimationFrame(tick)}requestAnimationFrame(tick)})()');
  if (sampleAllocations) {
    await page.send('HeapProfiler.enable', {});
    await page.send('HeapProfiler.startSampling', { samplingInterval: 16384, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
  }
  const samples = [];
  for (let i = 0; i < Math.ceil(duration / 1000); i++) {
    await pause(1000);
    samples.push(await page.evaluate('({t:performance.now(),heapMB:+((performance.memory?.usedJSHeapSize||0)/1e6).toFixed(1),textures:TT.renderer.info.memory.textures,geometries:TT.renderer.info.memory.geometries,programs:TT.renderer._pipelines?.caches?.size??-1,calls:TT.renderer.info.render.calls})'));
  }
  result.samples = samples;
  result.frames = await page.evaluate('(()=>{__gp20122.running=false;return {frames:__gp20122.frames,spikes:__gp20122.spikes,prof:TT.profDbg.report().spikes}})()');
  if (label.startsWith('cachecountnode')) result.cacheCounts = await page.evaluate('window.__cb315');
  if (label.startsWith('uniformcount')) result.uniformCounts = await page.evaluate('window.__cb315Uniform');
  if (label.startsWith('plainuniformtypes')) result.uniformTypes = await page.evaluate('window.__gpUniformTypes');
  if (sampleAllocations) result.profile = (await page.send('HeapProfiler.stopSampling', {}, 120000)).profile;
  result.errors = page.errors.slice();
  const rows = [];
  function walk(node, stack = []) {
    const f = node.callFrame || {};
    const name = `${f.functionName || '(anonymous)'} ${f.url || ''}:${(f.lineNumber || 0) + 1}`;
    if (node.selfSize) rows.push({ bytes: node.selfSize, site: name, stack: [...stack, name].slice(-8).join(' <- ') });
    for (const c of node.children || []) walk(c, [...stack, name]);
  }
  if (result.profile) walk(result.profile.head);
  rows.sort((a, b) => b.bytes - a.bytes);
  result.top = rows.slice(0, 40).map(r => ({ mb: +(r.bytes / 1e6).toFixed(2), ...r }));
  result.totalSampledMB = +(rows.reduce((n, r) => n + r.bytes, 0) / 1e6).toFixed(2);
  console.log(JSON.stringify({ label, duration, frames: result.frames, top: result.top.slice(0, 20), totalSampledMB: result.totalSampledMB, errors: result.errors }).slice(0, 18000));
} catch (error) {
  result.failure = String(error?.stack || error);
  console.error(result.failure);
  process.exitCode = 1;
} finally {
  fs.writeFileSync(path.join(out, `${label}.json`), JSON.stringify(result, null, 2) + '\n', 'utf8');
  await browser.close();
  await server.close();
  if (noCamera || noCifWarm) fs.unlinkSync(liveHtml);
  if (noCamera) fs.unlinkSync(liveCamera);
}
