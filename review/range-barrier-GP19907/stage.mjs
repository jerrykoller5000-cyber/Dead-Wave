import fs from 'node:fs';import crypto from 'node:crypto';
const dir='review/range-barrier-GP19907';fs.mkdirSync(dir,{recursive:true});
const rows=[],hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function file(name){const base=fs.readFileSync(name,'utf8'),row={file:name,baseHash:hash(base),patches:[]};rows.push(row);fs.writeFileSync(dir+'/'+name.replaceAll('/','_')+'.before.txt',base);return{replace(oldText,newText){if(!base.includes(oldText)&&base.includes('\r\n')){oldText=oldText.replace(/\r?\n/g,'\r\n');newText=newText.replace(/\r?\n/g,'\r\n');}if(!oldText||base.split(oldText).length!==2)throw Error('Nonunique/missing anchor '+name+' '+oldText.slice(0,65));row.patches.push({oldText,newText});return this;},get text(){let s=base;for(const p of row.patches)s=s.replace(p.oldText,p.newText);return s;}};}
const w=file('world/training.js');
w.replace("import { partitionTrainingShell } from './training-cutaway.js';","import { partitionTrainingShell } from './training-cutaway.js';\nimport { buildFiringLine } from './training-firing-line.js';");
w.replace("// Past the yellow line, toward the targets: a shot there does not score.\nexport function overTheLine(playerZ, originZ) {\n  return playerZ > originZ + TRAINING.LINE_Z + 0.2;\n}\n",'');
w.replace("  // A rubber backstop across the far end.","  // GP-19907: continuous firing bench and upper mesh; the open middle is for weapons, not bodies.\n  const firingLine = buildFiringLine(T, {root:g,origin:O,range:R,height:H,box,std,keep,steel,steelLight,hazard});\n  solids.push(...firingLine.solids);\n  // A rubber backstop across the far end.");
w.replace('maxZ: O.z + R.maxZ - 0.9 },','maxZ: O.z + firingLine.front - inset },');
w.replace('const notProps = new Set([voidBox,','const notProps = new Set([firingLine.group, voidBox,');
// Existing files use CRLF; patch anchors are normalized only in our candidate builder.
const idx=file('index.html');
idx.replace('propSolids, overTheLine, fallSign','propSolids, fallSign');
idx.replace('camera:camera.position,previousZ:training.feetZ,pairChanged:','camera:camera.position,pairChanged:');
idx.replace('      training.feetZ = p.z;\n','');
idx.replace('      const feetZ = training.feetZ;\n      const over = feetZ != null && overTheLine(feetZ, tg.origin.z);\n','');
const overBlock=idx.text.match(/      if \(over\) \{[\s\S]*?        return true;\r?\n      \}\r?\n/);if(!overBlock)throw Error('No free-practice line penalty');idx.replace(overBlock[0],'');
const ball=file('world/training-ballistics.js');
ball.replace('    if(glass && tg.cutaway?.ignoreSolid(solid))continue;','    if(glass && (solid.firingFence||solid.firingFrame||tg.cutaway?.ignoreSolid(solid)))continue;');
const session=file('ui/range-session.js');
session.replace(' function checkPosition(p,previousZ){',' function checkPosition(p){');
session.replace("  if(Math.max(p.z,Number.isFinite(previousZ)?previousZ:p.z)>RANGE_RULES.lineTolerance)finish('DISQUALIFIED','line');\n  else if(p.x< -8||p.x>8||p.z< -12||p.z>30)finish('ABORTED','left-range');","  if(p.x< -8||p.x>8||p.z< -12||p.z>30)finish('ABORTED','left-range');");
session.replace("position.z> -RANGE_RULES.startMargin)return {ok:false,reason:'start-position'};","position.z>30)return {ok:false,reason:'start-position'};");
session.replace('function tick(dt,{position,previousZ,paused=false,','function tick(dt,{position,paused=false,');
session.replace('checkPosition(position,previousZ);','checkPosition(position);');
session.replace("position.z> -RANGE_RULES.startMargin)){finish('ABORTED','start-position');","position.z>30)){finish('ABORTED','start-position');");
const feature=file('ui/range-feature.js');
feature.replace("p.z>-.05)return {ok:false,reason:'start-position'};","p.z>30)return {ok:false,reason:'start-position'};");
feature.replace('session.checkPosition(position(),c.previousZ==null?null:c.previousZ-tg.origin.z);','session.checkPosition(position());');
feature.replace('previousZ:c.previousZ==null?null:c.previousZ-tg.origin.z,','');
const drills=file('ui/range-drills.js');drills.replace('countdown:8,lineTolerance:.12,startMargin:.05,','countdown:8,');
const strings=file('ui/strings.js');
strings.replace('Stay behind the yellow line. No throwable grenades. Use only the selected weapon. Switching without firing is allowed.','Fire through the bench opening. Step back if a low-held weapon strikes the bench. No throwable grenades. Use only the selected weapon. Switching without firing is allowed.');
strings.replace('Stand inside the firing range, behind the yellow line, before starting.','Stand inside the firing range before starting.');
strings.replace('  "range.reason.line": "You crossed the yellow firing line.",\n','');
strings.replace('Return behind the yellow line before starting the countdown.','Return to the firing range before starting the countdown.');
strings.replace('Stay behind the line and cut each nearby plate for 0.45 seconds.','Cut each nearby plate through the bench opening for 0.45 seconds.');
const wt=file('world/training.test.mjs');wt.replace('buildTrainingGround, overTheLine, fallSign','buildTrainingGround, fallSign');
wt.replace("  assert.equal(overTheLine(line - 1, O2.z), false);\n  assert.equal(overTheLine(line + 1, O2.z), true, 'past the yellow line');","  assert.ok(clampToRects(tg.walk, O2.x, line + 1).moved, 'firing bench keeps bodies on the shooter side');\n  assert.ok(tg.solids.some(s=>s.firingFence), 'upper fence has a physical shot surface');");
wt.replace('  let over = 0; const v = new T.Vector3();',"  let over = 0; const v = new T.Vector3();\n  const firingFixture = tg.group.getObjectByName('training-firing-bench');");
wt.replace('    if (!P) return;\n    for (let i = 0; i < P.count; i++) {',"    if (!P) return;\n    // GP-19907 intentionally adds overhead fencing at the existing firing line.\n    let owner=m;while(owner&&owner!==firingFixture)owner=owner.parent;\n    if(owner===firingFixture&&firingFixture)return;\n    for (let i = 0; i < P.count; i++) {");
const ut=file('ui/range-drills.test.mjs');
ut.replace("test(`${phase}: swept feet cross the line, camera/muzzle irrelevant`,()=>{const r=phase==='ACTIVE'?active():rig();r.s.checkPosition({x:0,z:-.5},.8);assert.equal(r.s.snapshot().result.reason,'line');});","test(`${phase}: position has no line-crossing disqualification`,()=>{const r=phase==='ACTIVE'?active():rig();r.s.checkPosition({x:0,z:.8});assert.equal(r.s.snapshot().state,phase);assert.equal(r.s.snapshot().result,null);});");
ut.replace("test(`${phase}: tolerance jitter stays legal`,()=>{const r=phase==='ACTIVE'?active():rig();r.s.checkPosition({x:0,z:.119},-.02);assert.equal(r.s.snapshot().state,phase);});","test(`${phase}: leaving the room still aborts`,()=>{const r=phase==='ACTIVE'?active():rig();r.s.checkPosition({x:9,z:-.5});assert.equal(r.s.snapshot().state,'ABORTED');assert.equal(r.s.snapshot().result.reason,'left-range');});");
ut.replace('[{x:0,z:.2},{x:9,z:-1},{x:0,z:-13}]','[{x:0,z:31},{x:9,z:-1},{x:0,z:-13}]');
ut.replace("test('moving across the line during lowering never arms a countdown from an invalid position',()=>{let down=false;const s=createRangeSession({targets:{lowerAll(){},allDown:()=>down}});s.start(pistol,{position:{x:0,z:-.61}});down=true;s.tick(.1,{position:{x:0,z:.3}});assert.equal(s.snapshot().state,'ABORTED');assert.equal(s.snapshot().result.reason,'start-position');});","test('preparation validates the room, not a removed line rule',()=>{let down=false;const s=createRangeSession({targets:{lowerAll(){},allDown:()=>down}});s.start(pistol,{position:{x:0,z:-.61}});down=true;s.tick(.1,{position:{x:0,z:.3}});assert.equal(s.snapshot().state,'COUNTDOWN');});");
rows.push({file:'world/training-firing-line.js',newFile:true,text:fs.readFileSync(dir+'/firing-line.js','utf8').replace("from '../../world/bake.js'","from './bake.js'")});
fs.writeFileSync(dir+'/patches.json',JSON.stringify(rows,null,2));
for(const row of rows.filter(r=>!r.newFile)){
 let s=fs.readFileSync(row.file,'utf8');for(const p of row.patches)s=s.replace(p.oldText,p.newText);
 const name=row.file.replaceAll('/','_');fs.writeFileSync(dir+'/'+name+'.candidate.txt',s);
}
function localImports(s,area){return s.replace(/from '\.\/(.*?)'/g,(m,k)=>fs.existsSync(dir+'/'+k)?m:`from '../../${area}/${k}'`).replace(/from '\.\.\/(.*?)'/g,"from '../../$1'");}
fs.writeFileSync(dir+'/training.js',w.text.replace(/from '\.\/(.*?)'/g,(m,k)=>k==='training-firing-line.js'?"from './firing-line.js'":`from '../../world/${k}'`).replace(/from '\.\.\/game\/(.*?)'/g,"from '../../game/$1'"));
fs.writeFileSync(dir+'/training-ballistics.js',ball.text.replace("from './training.js'","from './training.js'"));
for(const [name,obj] of [['range-drills.js',drills],['range-session.js',session],['range-feature.js',feature],['strings.js',strings]])fs.writeFileSync(dir+'/'+name,obj.text);
for(const name of ['range-targets.js','range-console.js','range-records.js'])fs.writeFileSync(dir+'/'+name,fs.readFileSync('ui/'+name,'utf8'));
for(const name of ['range-targets.js','range-console.js','range-records.js','range-feature.js','range-session.js']){
 let s=fs.readFileSync(dir+'/'+name,'utf8');s=s.replace(/from '\.\/(.*?)'/g,(m,k)=>fs.existsSync(dir+'/'+k)?m:`from '../../ui/${k}'`).replace("from '../world/training-ballistics.js'","from './training-ballistics.js'").replace("from '../world/training-cutaway.js'","from '../../world/training-cutaway.js'");fs.writeFileSync(dir+'/'+name,s);
}
fs.writeFileSync(dir+'/range-drills.test.mjs',ut.text);
fs.writeFileSync(dir+'/training.test.mjs',wt.text.replace(/from '\.\/(.*?)'/g,(m,k)=>k==='training.js'?m:`from '../../world/${k}'`).replace(/from '\.\.\/(.*?)'/g,"from '../../$1'"));
fs.writeFileSync(dir+'/training-ballistics.test.mjs',fs.readFileSync('world/training-ballistics.test.mjs','utf8').replace("from '../tools/tests/fakethree.mjs'","from '../../tools/tests/fakethree.mjs'"));
let html=idx.text.replace('<head>','<head><base href="/">').replace("from './world/training.js'","from './review/range-barrier-GP19907/training.js'").replace("from './world/training-ballistics.js'","from './review/range-barrier-GP19907/training-ballistics.js'").replace("from './ui/range-feature.js'","from './review/range-barrier-GP19907/range-feature.js'");fs.writeFileSync(dir+'/index.html',html);
let engine=fs.readFileSync('tools/camera.mjs','utf8').replace("from './serve.mjs'","from '../../tools/serve.mjs'").replace("from './cdp.mjs'","from '../../tools/cdp.mjs'").replace("new URL('..', import.meta.url)","new URL('../..', import.meta.url)").replace('/index.html?debug=1&raf=timer',`/${dir}/index.html?debug=1&raf=timer`);fs.writeFileSync(dir+'/camera.mjs',engine);
console.log('STAGED '+rows.length+' files; live game unchanged.');
