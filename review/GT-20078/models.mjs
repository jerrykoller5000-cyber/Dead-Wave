import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const folder=new URL('./'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const p=await browser.newPage({width:960,height:540});
  await p.goto(server.origin+'/index.html?inspect&debug=1&raf=timer');
  assert(await p.waitFor('window.DWInspect?.ready'));
  const contacts=JSON.parse(await readFile(new URL('depths.json',folder),'utf8'));
  for(const key of ['minigun','launcher','uzi']){
    await p.evaluate(`DWInspect.show('weapon.${key}',{instant:true});`);
    for(const [light,view] of [['noon','side'],['overcast','three'],['dusk','rear3'],['night','three']]) {
      const img=await p.evaluate(`(async()=>{DWInspect.light('${light}');DWInspect.view('${view}',{instant:true});
        await DWInspect.stepAsync(2);return DWInspect.shot({type:'image/jpeg',quality:.9})})()`);
      await writeFile(new URL(key+'-'+light+'.jpg',folder),Buffer.from(img.split(',')[1],'base64'));
    }
  }
  const report=await p.evaluate(`(async()=>{
    const contacts=${JSON.stringify(contacts)};
    const b=TT.inspectHost().builders, ctx={...b.weaponContext(),finishGun:g=>g,mergeRigidMeshes:()=>{}};
    const {THREE:T}=ctx, makeKit=ctx.gunKit, labels=new WeakMap();
    ctx.gunKit=(...init)=>{
      const kit=makeKit(...init);
      return Object.fromEntries(Object.entries(kit).map(([name,fn])=>[name,(...args)=>{
        const o=fn(...args), src=new Error().stack.match(/studio\\/weapon-(?:heavy|sidearms)\\.js:\\d+/);
        if(o?.isObject3D && src) labels.set(o,src[0]); return o;
      }]));
    };
    const H=await import('/studio/weapon-heavy.js'),S=await import('/studio/weapon-sidearms.js');
    const reports={};
    for(const [id,build] of Object.entries({minigun:H.makeMinigunModel,launcher:H.makeLauncherModel,uzi:S.makeUziModel})){
      const g=build(ctx), unit=g.userData.laserLightUnit;
      if(unit) unit.visible=id==='uzi';
      g.updateMatrixWorld(true);
      const dir=new T.Vector3(.81731,.36179,.44717).normalize();
      const v0=new T.Vector3(),v1=new T.Vector3(),v2=new T.Vector3(), hit=new T.Vector3();
      const intersections={};
      for(const [name,rec] of Object.entries(contacts[id]||{})){
        const v=new T.Vector3(...rec.local),ray=new T.Ray(v,dir),matches=[];
        g.traverseVisible(m=>{
          const geom=m.geometry,attr=geom?.attributes.position, ix=geom?.index;
          if(!m.isMesh || !attr || !new T.Box3().setFromObject(m).expandByScalar(.0001).containsPoint(v)) return;
          let near=Infinity;
          const crossings=[];
          const vertex=(dest,i)=>dest.fromBufferAttribute(attr,ix?ix.getX(i):i).applyMatrix4(m.matrixWorld);
          for(let i=0;i<(ix?ix.count:attr.count);i+=3) {
            const t=new T.Triangle(vertex(v0,i),vertex(v1,i+1),vertex(v2,i+2));
            if(ray.intersectTriangle(t.a,t.b,t.c,false,hit)) crossings.push(hit.distanceTo(v));
            near=Math.min(near,t.closestPointToPoint(v,hit).distanceTo(v));
          }
          crossings.sort((a,b)=>a-b);
          if(crossings.filter((x,i)=>!i || x-crossings[i-1]>1e-7).length%2) {
            matches.push({name:m.name||m.parent.name||m.geometry.type,source:labels.get(m),depthLocal:near});
          }
        });
        intersections[name]=matches;
      }
      const rootScale=TT.weaponMeshes[id].scale.x;
      reports[id]={intersections,light:unit?.position.toArray(),rootScale};
      const {auditWeapon}=await import('/tools/tests/weapon-seating.js');
      const u=g.userData, audit=auditWeapon(g,{metresPerUnit:Math.abs(rootScale)*1.8/1.655,
        ignore:[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)});
      reports[id].assembly={pieces:audit.parts,loose:audit.loose,overlaps:audit.overlaps.length};
      if(id==='uzi'){
        const shell=g.children.find(m=>m.isMesh && new T.Box3().setFromObject(m).containsPoint(new T.Vector3(.023,.028,.27)));
        if(!shell)throw Error('Missing fixed fore-end in the Uzi assembly');
        const {visibleSurfaceGap}=await import('/tools/tests/weapon-seating.js');
        reports[id].lightToForeEnd=visibleSurfaceGap(unit,shell,rootScale);
        const down=new T.Raycaster(),floor=[];
        for(const z of [.23,.25,.27,.29,.31,.33,.345]) {
          down.set(new T.Vector3(0,-1,z),new T.Vector3(0,1,0));
          floor.push([z,down.intersectObject(shell,false)[0]?.point.y??null]);
        }
        reports[id].foreEndFloor=floor;
        reports[id].support=unit.children.map(p=>[p.name || p.geometry.type,
          new T.Box3().setFromObject(p).max.y,visibleSurfaceGap(p,shell,rootScale)]);
        for(const [local,anchor] of [['lightLens','lightLensLocal'],['laserLens','laserLensLocal']])
          reports[id][local+'Error']=unit.localToWorld(unit.userData[local].clone()).distanceTo(g.localToWorld(g.userData[anchor].clone()));
      }
    }
    return reports;
  })()`,90000);
  await writeFile(new URL('meshes.json',folder),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report)); assert.deepEqual(p.errors,[]);
} finally {await browser.close();await server.close();}
