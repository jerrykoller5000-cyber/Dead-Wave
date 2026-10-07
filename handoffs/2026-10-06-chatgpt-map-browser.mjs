import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('C:/Users/Zero/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const task=process.argv[2]||'GP-145';const layout=process.argv.includes('--layout');
const source=fs.readFileSync('index.html','utf8');
const start=source.indexOf('    const minimapEl ='),end=source.indexOf('    // Bird flocks',start);
const savedAfter=`handoffs/2026-10-06-chatgpt-${task}-map-after.txt`;
const after=fs.existsSync(savedAfter)?fs.readFileSync(savedAfter,'utf8'):source.slice(start,end),before=fs.readFileSync(`handoffs/2026-10-06-chatgpt-${task}-map-before.txt`,'utf8');
const server=await serve(process.cwd(),0);let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/map-fixture',r=>r.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><style>body{background:#111b22;color:#eef0df;font:15px sans-serif}canvas{border:1px solid #63705f}#minimap{width:164px;height:164px;border-radius:50%}#fullMapCanvas{max-width:80vw}#fullMap{margin-top:12px}h1{font-size:18px}</style><h1>Production map drawing · controlled world fixture</h1><p>No live terrain or GPU gameplay claim</p><canvas id="minimap"></canvas><div id="fullMap"><canvas id="fullMapCanvas"></canvas><p id="mapMissionLegend"></p></div>`}));
 if(layout)await page.route('**/map-fixture',r=>r.fulfill({contentType:'text/html',body:source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,m=>m.includes('type="importmap"')?m:'').replace('</head>','<style>body>*:not(#hud){display:none!important}#hud>*:not(#fullMap):not(#minimapFrame){display:none!important}#fullMap{display:flex!important}#hud{display:block!important}</style></head>')}));
 const dir='handoffs/2026-10-06-chatgpt-'+task+(layout?'-layout-shots':'-shots');fs.mkdirSync(dir,{recursive:true});
 for(const width of [1280,390]) for(const mode of (layout?['after']:['before','after'])){
  await page.setViewportSize({width,height:layout?720:900});await page.goto(server.origin+'/map-fixture');
  await page.evaluate(async({code,mode,task})=>{
   document.body.className='playing';
   const THREE=await import('/vendor/three/three.core.js');
   const E=await import('/ui/map-enemies.js');
   const {text}=await import('/ui/strings.js');
   const noop=()=>{},empty=()=>[];
   const camera=new THREE.PerspectiveCamera(50,1, .1,1000);camera.position.set(0,35,-35);camera.lookAt(0,0,10);camera.updateMatrixWorld();
   const enemy=(x,z)=>({alive:true,mesh:{position:new THREE.Vector3(x,0,z),visible:true},typeKey:'shambler',hitH:1.5});
   window.env={THREE,...E,document,window,camera,dwText:(key,params)=>task==='GP-146'&&mode==='before'&&key==='map.hq'?'HQ':text(key,params),
    player:{position:new THREE.Vector3(0,0,0)},camYawCurrent:0,aimYaw:.7,
    zombies:[enemy(0,25),enemy(-30,0),enemy(22,-20),enemy(80,90)],gameStarted:true,isNight:true,
    training:{active:false},hollow:{below:()=>false},phase:'wave',day:3,waveBearings:[.4],waveSurround:false,
    POI:{campsites:[{x:30,z:25,style:'ranger'}],cabins:[{x:100,z:10}],bridges:[{x:-50,z:60}],sheds:[{x:45,z:85}],wrecks:[{x:-80,z:-70}],caves:[{x:140,z:70,name:'East Cave',theme:'root'},{x:-130,z:80,name:'West Cave',theme:'shale'},{x:40,z:-110,name:'South Cave',theme:'chalk'}],mast:{x:70,z:80},dock:{x:-70,z:-110},tower:{x:80,z:40},graveyard:{x:120,z:80}},
    house:{present:true,group:{position:{x:8,y:0,z:8}}},KIOSK:{x:10,z:4},HQ_WINDOW_FRONT:{x:8,z:6},skullBag:{count:0},supplyDrops:[],LAKE_HOLE:{x:-50,z:-70},PATHS:[],TRAIL_HW:2,
    sampleHeight:()=>1,waterLevelAt:()=>null,shotBlocked:()=>false,builds:[],AudioSys:{},gameOver:false,won:false,paused:false,shopOpen:false,
    createBuildAttackPulses:()=>({handle:noop,snapshot:empty}),createFarBuildWarnings:()=>({handle:noop}),drawBuildAlerts:noop,buildAlertMarkers:empty,
    extractionFor:()=>null,projectScoutCave:()=>null,drawScoutingMarks:noop,getWavePreview:()=>null,hq:{seq:null},drawBountyMarks:noop,bountyIntel:{markers:empty},drawCacheMarks:noop,cacheIntel:{markers:empty},uiRunId:1
   };
   for(const path of ['/ui/map-landmarks.js','/ui/map-missions.js']){const res=await fetch(path);if(res.ok)Object.assign(env,await import(path));}
   window.maps=new Function('env',`with(env){${code}\nreturn {open(){setFullMap(true);},render(){minimapTick=0;fullMapTick=0;drawMinimap(.21);drawFullMap(.1);},intel:typeof mapEnemyIntel==='undefined'?null:mapEnemyIntel,landmarks:typeof mapLandmarkIntel==='undefined'?null:mapLandmarkIntel,setObjectives(value){objectiveRuntime=value;},bake:mapBake};}`)(env);
   const ctx=maps.bake.getContext('2d');ctx.fillStyle='#344b35';ctx.fillRect(0,0,1024,1024);ctx.strokeStyle='#778764';for(let i=0;i<1024;i+=64){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,1024);ctx.moveTo(0,i);ctx.lineTo(1024,i);ctx.stroke();}
   window.labels=[];for(const id of ['minimap','fullMapCanvas']){const c=document.getElementById(id).getContext('2d'),orig=c.fillText.bind(c);c.fillText=(text,...args)=>{labels.push({id,text});orig(text,...args);};}
   maps.render();
  },{code:mode==='before'?before:after,mode,task});
  if(task==='GP-147')await page.evaluate(()=>{
   window.missionSnapshot={sites:[
    {id:'objective:radio-repair',state:'undiscovered',reachable:false,position:{x:70,z:80}},
    {id:'objective:ranger-cache',state:'available',reachable:false,position:{x:30,z:25}},
    {id:'objective:hikers-cache',state:'undiscovered',reachable:false,position:{x:-70,z:90}},
    {id:'objective:fuel-depot',state:'available',reachable:false,position:{x:-75,z:65}}
   ]};
   maps.setObjectives({snapshot:()=>missionSnapshot,markers:()=>[]});env.skullBag.count=3;maps.render();
  });
  if(layout){await page.evaluate(()=>{maps.open();maps.render();});const box=await page.locator('#fullMap .card').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+1&&box.y+box.height<=721,'full-map card fits screen');assert.match(await page.locator('#mapLegend').innerText(),/FOB Threshold/i);}
  await page.screenshot({path:dir+'/'+mode+'-'+width+'.png'});
  if(mode==='after'&&task==='GP-147'){
   let words=await page.locator('#mapMissionLegend').innerText();
   assert.match(words,/Restore the radio mast/);assert.match(words,/ranger/i);assert.match(words,/Bank skulls/);assert(!/hikers/i.test(words));
   await page.evaluate(()=>{env.camYawCurrent=Math.PI/2;maps.render();});await page.screenshot({path:dir+'/turned-'+width+'.png'});
   await page.evaluate(()=>{missionSnapshot.sites[0].state='ready-to-claim';missionSnapshot.sites[0].position={x:76,z:82};missionSnapshot.sites[1].state='claimed';env.skullBag.count=0;env.extractionFor=()=> 'due';maps.render();});
   words=await page.locator('#mapMissionLegend').innerText();assert.match(words,/Board Heron/);assert.match(words,/Collect radio supplies/);assert(!words.includes('Bank skulls'));assert(!/ranger/i.test(words));
   await page.screenshot({path:dir+'/extraction-'+width+'.png'});
   await page.evaluate(()=>{missionSnapshot.sites.forEach(s=>s.state='claimed');env.extractionFor=()=>null;maps.render();});assert.equal(await page.locator('#mapMissionLegend').innerText(),'');
  }
  if(mode==='after'&&task==='GP-146'){

   assert(await page.evaluate(()=>labels.some(r=>r.text==='FOB Threshold'&&r.id==='minimap')));
   assert(await page.evaluate(()=>labels.some(r=>r.text==='?'&&r.id==='fullMapCanvas')));
   assert(!await page.evaluate(()=>labels.some(r=>r.text==='East Cave'||r.text==='WATCHTOWER')));
   await page.evaluate(()=>{env.player.position.set(140,0,70);env.camYawCurrent=Math.PI/2;labels.length=0;maps.render();});
   assert(await page.evaluate(()=>labels.some(r=>r.text==='Root warren'&&r.id==='minimap')));
   assert(await page.evaluate(()=>labels.some(r=>r.text==='Root warren'&&r.id==='fullMapCanvas')));
   await page.screenshot({path:dir+'/discovered-'+width+'.png'});
   await page.evaluate(()=>{env.player.position.set(0,0,0);labels.length=0;maps.render();});
   assert(await page.evaluate(()=>labels.some(r=>r.text==='Root warren')));
   await page.evaluate(()=>{window.dispatchEvent(new CustomEvent('dw-game',{detail:{type:'run-reset'}}));labels.length=0;maps.render();});
   assert(!await page.evaluate(()=>labels.some(r=>r.text==='Root warren')));
  }
  if(mode==='after'&&task==='GP-145'){

   assert.equal(await page.evaluate(()=>maps.intel.markers(env.zombies,env.player.position,true).length),3);
   await page.evaluate(()=>{env.camYawCurrent=Math.PI/2;maps.render();});await page.screenshot({path:`${dir}/turned-${width}.png`});
   await page.evaluate(()=>{maps.intel.reset();env.isNight=false;env.shotBlocked=()=>true;maps.render();});
   assert.equal(await page.evaluate(()=>maps.intel.markers(env.zombies,env.player.position,false).length),0);
   await page.screenshot({path:`${dir}/day-unseen-${width}.png`});
   await page.evaluate(()=>{env.zombies[0].mesh.position.set(0,0,8);maps.render();});
   assert.equal(await page.evaluate(()=>maps.intel.markers(env.zombies,env.player.position,false).length),1);
  }
 }
 assert.deepEqual(errors,[]);console.log(`PASS ${task} production map functions at 1280/390; before/after shots, camera/day-night fixture assertions; page errors 0`);
}finally{await browser?.close();await server.close();}
