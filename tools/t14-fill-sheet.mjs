// CB-335 (claude2): before/after pictures of the t14 steep-ground floor row (spot 15,-5: floors 17..20,-8), the game
// camera and a side view, four lights (noon, overcast, dusk, night). Same setup as ChatGPT 2's native proof
// (review/GT-20108/t14-native.mjs); the two pages differ only in the index.html served.
//   node tools/t14-fill-sheet.mjs --before <index file> --after <index file> --out <dir> [--headless]
// Game tests on Jerry's PC go through the slot (rule 16); this one runs in Claude 2's cloud copy.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const sha = (b) => createHash('sha256').update(b).digest('hex');
const OUT = path.resolve(arg('--out') || 'review/CB-335/t14-fill');
const SRC = { before: await readFile(arg('--before')), after: await readFile(arg('--after')) };
const headless = process.argv.includes('--headless');
await mkdir(OUT, { recursive: true });
const server = await serve(process.cwd(), 0);
let browser, reference = null;
const all = {};
try {
  for (const phase of ['before', 'after']) {
    const out = path.join(OUT, phase); await mkdir(out, { recursive: true });
    browser = await launch({ headless }); const p = await browser.newPage({ width: 1280, height: 720 });
    let served = 0; const html = SRC[phase].toString('base64');
    p.conn.onEvent((msg) => {
      if (msg.sessionId !== p.sessionId || msg.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = msg.params; assert.equal(new URL(request.url).pathname, '/index.html'); served++;
      p.send('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }], body: html }).catch((e) => p.errors.push(e.message));
    });
    await p.send('Fetch.enable', { patterns: [{ urlPattern: server.origin + '/index.html*' }] });
    await p.goto(server.origin + '/index.html?debug=1&raf=timer');
    assert(await p.waitFor('window.TT&&DWLoad.snapshot().state==="ready"', { timeout: 400000 }));
    await p.evaluate('DWOpening.dismissForTesting()'); assert(await p.waitFor('!DWOpening.active'));
    await p.evaluate(await readFile('tools/tests/lib.js', 'utf8')); await p.evaluate("startMatch(TT,'TestMarine')", 400000);
    const setup = await p.evaluate(`(async()=>{
     const T=TT,G=T.THREE,H=T.inspectHost();T.clearZombies?.();T.setHp?.(100000);T.unlockAllBuilds();T.addCash(100000);
     for(const t of T.trees){t.alive=false;t.stump=false;if(t.mesh)t.mesh.visible=false;}for(const r of T.rocks){r.alive=false;if(r.mesh)r.mesh.visible=false;}
     T.flightHold(true);T.setShotView(null);T.setViewFirstDbg(false);T.setZoomHeldDbg(false);
     T.player.position.set(T.gridCentre(15),T.sampleHeight(T.gridCentre(15),T.gridCentre(-5)),T.gridCentre(-5));
     const terrain=[17,18,19,20].map(x=>T.sampleHeight(T.gridCentre(x),T.gridCentre(-8)));
     const row=[17,18,19,20].map(x=>T.placeBuildAt('floor',x,-8));if(row.some(f=>!f||f.level!==0))throw Error('four ground floors did not place');
     const cx=row.reduce((n,f)=>n+f.x,0)/4,cz=row[0].z;
     T.player.position.set(cx,T.sampleHeight(cx,cz+5),cz+5);T.setOtsAimDbg(Math.PI,-.18);
     for(let i=0;i<100;i++)T.stepFrame(1/30);await new Promise(r=>setTimeout(r,300));
     window.floorReview={row,H,T,G};H.attach({held:()=>true,scale:dt=>dt,frame:()=>{}});H.camera.updateMatrixWorld();
     const eye=H.camera.getWorldPosition(new G.Vector3()),target=eye.clone().add(H.camera.getWorldDirection(new G.Vector3()));
     const heights=row.map(f=>f.mesh.position.y),center={x:cx,y:heights.reduce((n,y)=>n+y,0)/4+.15,z:cz};
     const game={x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:H.camera.fov};
     const side={x:cx,y:Math.max(...heights)+2,z:cz+10,tx:cx,ty:center.y,tz:cz,fov:55};
     const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
     const corners=row.map(f=>{let m=0;for(const[a,b]of[[-.95,-.95],[.95,-.95],[-.95,.95],[.95,.95]]){const d=T.sampleHeight(f.x+a,f.z+b)-f.mesh.position.y;if(Math.abs(d)>Math.abs(m))m=d;}return m;});
     return{terrain,cameras:{game,side},center,player:T.player.position.toArray(),row:row.map((f,i)=>({x:f.x,z:f.z,y:f.mesh.position.y,ground:T.sampleHeight(f.x,f.z),corner:corners[i]}))};
    })()`, 400000);
    if (phase === 'before') reference = setup;
    const records = [];
    for (const view of ['game', 'side']) for (const light of ['noon', 'overcast', 'dusk', 'night']) {
      const camera = reference.cameras[view], time = { noon: .42, overcast: .50, dusk: .74, night: .02 }[light];
      const record = await p.evaluate(`(async()=>{
       const {T,G,H}=floorReview;T.setShotView(${JSON.stringify(camera)});T.weather.raining=${light === 'overcast'};T.weather.intensity=${light === 'overcast' ? 1 : 0};T.setWorldTime(${time});
       H.attach({held:()=>false,scale:dt=>dt,frame:()=>{}});for(let i=0;i<3;i++)T.stepFrame(1/60);T.setWorldTime(${time});
       H.attach({held:()=>true,scale:dt=>dt,frame:()=>{if(T.flashlight){T.flashlight.visible=${light === 'night'};T.flashlight.intensity=${light === 'night' ? 42 : 0};T.flashlight.position.set(...${JSON.stringify([reference.player[0], reference.player[1] + 1.5, reference.player[2]])});T.flashlight.target.position.set(...${JSON.stringify([reference.center.x, reference.center.y, reference.center.z])});T.flashlight.target.updateMatrixWorld();}}});
       T.stepFrame(0);await H.renderer.compileAsync(H.scene,H.camera);await H.render();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await H.render();
       return{camera:{p:H.camera.position.toArray(),q:H.camera.quaternion.toArray(),fov:H.camera.fov},worldTime:T.getWorldTime(),weather:{raining:T.weather.raining,intensity:T.weather.intensity},first:T.fpDbg().first};
      })()`, 400000);
      assert(!record.first);
      if (phase === 'after') { const old = all.before.records.find((x) => x.view === view && x.lightKey === light); assert.deepEqual(record.camera, old.camera, 'same camera before/after'); assert.deepEqual(record.weather, old.weather); }
      const file = view + '-' + light + '.png', shot = await p.send('Page.captureScreenshot', { format: 'png' });
      await writeFile(path.join(out, file), Buffer.from(shot.data, 'base64')); records.push({ view, lightKey: light, file, ...record });
      console.log('PASS ' + phase + ' ' + view + ' ' + light);
    }
    all[phase] = { sourceSha256: sha(SRC[phase]), setup, records, errors: p.errors };
    console.log(phase + ' row ' + setup.row.map((f) => f.y.toFixed(2) + ' (centre ' + (f.ground - f.y).toFixed(2) + ', corner ' + f.corner.toFixed(2) + ')').join(' | '));
    assert.equal(served, 1); await browser.close(); browser = null;
  }
  await writeFile(path.join(OUT, 'records.json'), JSON.stringify(all, null, 2));
  console.log('PASS t14 fill sheet: same cameras, four lights, before and after');
} finally { if (browser) await browser.close(); await server.close(); }
