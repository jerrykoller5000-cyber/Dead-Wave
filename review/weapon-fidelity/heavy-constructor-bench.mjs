// GP-164 CPU-only constructor measurement. No renderer or frame-rate claim.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from '../../vendor/three/three.webgpu.js';
import * as sidearms from '../../studio/weapon-sidearms.js';
import * as longarms from '../../studio/weapon-longarms.js';
import * as heavy from '../../studio/weapon-heavy.js';
const source=fs.readFileSync('review/weapon-fidelity/baseline-index.html','utf8');
const materialNames=['gunMetal','gunBody','gunDark','gunMid','gunAccent','woodMat','woodDark','bladeMat','gunPoly','gunRubber','steelMat','brassMat','gunOlive','gunTan','magPoly','glassMat','sightDotMat','shellRedMat','fuelRedMat','hazardYellow','gaugeFace','edgeMat','gloveMat'];
const declarations=materialNames.map(n=>{const m=source.match(new RegExp('    const '+n+' = new THREE.MeshStandardMaterial\\([^\\n]+'));assert.ok(m,n);return m[0];}).join('\n');
const helperNames=['gunKit','gunArc','gunBand','gripOutline','gunEffects','gunSuppressor','finishGun','mergeRigidMeshes','sampleChainsawChainPath','layoutChainsawChain'];
const helpers=helperNames.map(n=>{const m=source.match(new RegExp('    function '+n+'\\([^]*?\\n    }'));assert.ok(m,n);return m[0];}).join('\n');
const suppressors=source.match(/    const SUPPRESSOR = \{[\s\S]*?\n    \};/)[0];
const geomSource=fs.readFileSync('core/geometry.js','utf8').replace("from 'three'", "from '"+new URL('../../vendor/three/three.webgpu.js',import.meta.url).href+"'");
const geom=await import('data:text/javascript;base64,'+Buffer.from(geomSource).toString('base64'));
const deps=['THREE','profileCurve','rbox','M240_PIVOT',...materialNames,...helperNames];
const ctx=new Function('THREE','geom',`const {rbox,slab:profileSlab,lathe:profileLathe,curve:profileCurve,boxProjectUV}=geom;const glowMat=m=>m;const _mgV=new THREE.Vector3(),_mgN=new THREE.Vector3(),_mgNM=new THREE.Matrix3();const SAW_CHAIN_L=.34,SAW_CHAIN_R=.055;const M240_PIVOT=new THREE.Vector3(0,.84,0);${declarations}\n${suppressors}\n${helpers}\nreturn {${deps.join(',')}};`)(THREE,geom);
const oldCode=JSON.parse(fs.readFileSync('review/weapon-fidelity/baseline-constructors.json','utf8'));
const old={};for(const [name,code]of Object.entries(oldCode))old[name]=new Function(...Object.keys(ctx),'return ('+code+');')(...Object.values(ctx));
const fresh={...sidearms,...longarms,...heavy};
const variants=[
  ['pistol','makePistol','makePistolModel'],['revolver','makeRevolver','makeRevolverModel'],['uzi','makeUzi','makeUziModel'],
  ['m4','makeM4','makeM4Model'],['ak','makeAk','makeAkModel'],['aa12','makeAa12','makeAa12Model'],['shotgun','makeShotgun','makeShotgunModel'],['sniper','makeSniper','makeSniperModel'],
  ['minigun','makeMinigun','makeMinigunModel'],['launcher','makeLauncher','makeLauncherModel'],['flamer','makeFlamer','makeFlamerModel'],['chainsaw','makeChainsaw','makeChainsawModel'],
  ['knife','makeKnife','makeKnifeModel',[],'knifeModel'],['machete','makeKnife','makeKnifeModel',[],'macheteModel'],
  ['mortar','makeMortarMesh','makeMortarModel',[null,false]],['mortar-carried','makeMortarMesh','makeMortarModel',[null,true]],['m240','makeM240Mesh','makeM240Model',[false]],['m240-carried','makeM240Mesh','makeM240Model',[true]]
];
const files=['studio/weapon-sidearms.js','studio/weapon-longarms.js','studio/weapon-heavy.js','core/geometry.js','review/weapon-fidelity/baseline-constructors.json'];
const hashes=()=>Object.fromEntries(files.map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
const report={environment:{node:process.version,three:THREE.REVISION,renderer:'none',note:'Local CPU microbenchmark; shared machine may have concurrent work. Measures constructors only, not GPU, FPS, full boot, or gameplay.'},warmSets:3,measuredSets:10,sourceHashes:hashes(),weapons:{},sets:{before:[],after:[]}};
for(const[name]of variants)report.weapons[name]={before:{samplesMs:[]},after:{samplesMs:[]}};
const ids=new Set();
function inspect(g){let meshes=0,triangles=0,vertices=0,visibleMeshes=0,visibleTriangles=0;g.traverse(m=>{if(!m.isMesh)return;meshes++;const pos=m.geometry.attributes.position;vertices+=pos.count;const tris=(m.geometry.index?.count||pos.count)/3;triangles+=tris;for(const value of pos.array)assert.ok(Number.isFinite(value),'finite geometry');let visible=m!==g.userData.flash&&m!==g.userData.laser;for(let p=m;p&&p!==g;p=p.parent)visible&&=p.visible;if(visible){visibleMeshes++;visibleTriangles+=tris;}});return{allocatedMeshes:meshes,allocatedTriangles:triangles,allocatedVertices:vertices,visibleMeshes,visibleTriangles,finite:true};}
function construct(side,v){const[,original,current,args=[]]=v;return side==='before'?old[original](...args):fresh[current](ctx,...args);}
function cleanup(g){const disposed=new Set();g.traverse(o=>{if(o.geometry&&!o.geometry.userData.shared&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}});}
function run(side,measure){let total=0;for(const v of variants){const start=performance.now(),g=construct(side,v),time=performance.now()-start;assert.ok(!ids.has(g.id),'fresh root');ids.add(g.id);if(v[4]){g.userData.knifeModel.visible=v[4]==='knifeModel';g.userData.macheteModel.visible=v[4]==='macheteModel';}if(measure){total+=time;const row=report.weapons[v[0]][side];row.samplesMs.push(time);if(!row.counts)row.counts=inspect(g);}cleanup(g);}if(measure)report.sets[side].push(total);}
for(let i=0;i<3;i++){run('before',false);run('after',false);}for(let i=0;i<10;i++)for(const side of(i%2?['after','before']:['before','after']))run(side,true);
const summary=values=>{const s=values.slice().sort((a,b)=>a-b);return{meanMs:values.reduce((a,b)=>a+b,0)/values.length,medianMs:(s[4]+s[5])/2,minMs:s[0],maxMs:s.at(-1)};};
for(const[name,row]of Object.entries(report.weapons))for(const side of['before','after'])Object.assign(row[side],summary(row[side].samplesMs));
report.total={before:summary(report.sets.before),after:summary(report.sets.after)};report.sourceHashesAfter=hashes();assert.deepEqual(report.sourceHashesAfter,report.sourceHashes,'sources stable');report.sourceUnchanged=true;report.freshRoots=ids.size;
report.aggregateCounts={};for(const side of['before','after']){const total={};for(const w of Object.values(report.weapons))for(const[key,value]of Object.entries(w[side].counts))if(typeof value==='number')total[key]=(total[key]||0)+value;report.aggregateCounts[side]=total;}report.completedAt=new Date().toISOString();
fs.writeFileSync('review/weapon-fidelity/heavy-constructor-bench.json',JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,sourceUnchanged:report.sourceUnchanged,variants:variants.length,freshRoots:report.freshRoots},null,2));
