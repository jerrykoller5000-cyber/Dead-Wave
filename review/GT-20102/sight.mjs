import assert from 'node:assert/strict';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {serve} from '../../tools/serve.mjs';import {launch} from '../../tools/cdp.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);const phase=process.argv[2]||'before';assert(['before','after'].includes(phase));const dir=new URL(phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});await page.goto(server.origin+'/index.html?debug=1&raf=timer');assert(await page.waitFor('window.TT&&DWLoad.snapshot().state==="ready"',{timeout:180000}));await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
 await page.evaluate("document.getElementById('playerName').value='Sight datum';document.getElementById('modeTraining').click()");
 assert(await page.waitFor("TT.trainingDbg.state().active&&!TT.trainingDbg.state().warming&&!document.getElementById('trainingBlackout')?.classList.contains('on')",{timeout:180000}));
 await page.evaluate("import('/review/GT-20076/final-visible-camera.mjs').then(m=>{window.sightViews=m.makeViews(TT);return sightViews.equip('revolver')})");
 const camera=await page.evaluate("sightViews.pose('aimed')");
 const marker=await page.evaluate("(()=>{const T=TT,g=T.weaponMeshes.revolver,m=g.getObjectByName('revolver-sight-dot');g.updateMatrixWorld(true);if(!m)return {exists:false};const inv=g.matrixWorld.clone().invert(),box=new T.THREE.Box3().setFromObject(m),c=box.getCenter(new T.THREE.Vector3()).applyMatrix4(inv);return {exists:true,type:m.type,isMesh:m.isMesh,visible:m.visible,materialVisible:m.material?.visible,materialType:m.material?.type,isMeshBasicMaterial:m.material?.isMeshBasicMaterial,colour:m.material?.color?.getHex(),centre:c.toArray(),children:m.children.length};})()");
 for(const light of ['noon','overcast','dusk','night']){await page.evaluate('sightViews.light('+JSON.stringify(light)+')');const shot=await page.send('Page.captureScreenshot',{format:'png'});await writeFile(new URL('aimed-'+light+'.png',dir),Buffer.from(shot.data,'base64'));}
 await writeFile(new URL('marker.json',dir),JSON.stringify({marker,camera},null,2));console.log('NATIVE MARKER',JSON.stringify(marker));
 if(!process.argv.includes('--photos-only')){
 await page.evaluate('TT.inspectHost().attach(null);TT.flightHold(false);TT.setShotView(null);true');
 await page.evaluate(await readFile(new URL('../../tools/tests/lib.js',import.meta.url),'utf8'));
 const result=String(await page.evaluate(await readFile(new URL('../../tools/tests/t277.js',import.meta.url),'utf8'),180000));await writeFile(new URL('t277.txt',dir),result);console.log(result);
 assert.deepEqual(page.errors,[]);console.log('SUMMARY',result.split('\n').filter(l=>l.startsWith('PASS')).length,'pass',result.split('\n').filter(l=>l.startsWith('FAIL')).length,'fail');
 }
}finally{await browser.close();await server.close();}
