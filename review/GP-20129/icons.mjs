import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129');
const server=await serve(root,0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:240000});await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000});
 await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
 await page.evaluate('document.getElementById("playerName").value="Own geometry icons";document.getElementById("modeTraining").click()');
 await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000});
 const shapes=await page.evaluate(`(async()=>{
  const T=await import('./vendor/three/three.core.js'),output={};
  for(const kind of ['pistol','uzi','revolver','m4','ak','shotgun','aa12','sniper','launcher','minigun','flamer','chainsaw']){
   const gun=TT.carryGunCopyDbg(kind);if(!gun)throw Error('missing '+kind);
   gun.visible=true;gun.updateMatrixWorld(true);const inverse=gun.matrixWorld.clone().invert(),v=new T.Vector3(),m=new T.Matrix4(),triangles=[],bounds={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity};
   gun.traverseVisible(o=>{if(!o.isMesh||!o.geometry?.attributes.position)return;
    const g=o.geometry,p=g.attributes.position,ix=g.index,materials=Array.isArray(o.material)?o.material:[o.material];
    if(materials.every(m=>m.transparent&&m.opacity<.2))return;
    const count=ix?ix.count:p.count;
    for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
     m.multiplyMatrices(inverse,o.matrixWorld);if(o.isInstancedMesh){const im=new T.Matrix4();o.getMatrixAt(instance,im);m.multiply(im);}
     for(let i=0;i+2<count;i+=3){const a=[];
      for(let j=0;j<3;j++){v.fromBufferAttribute(p,ix?ix.getX(i+j):i+j).applyMatrix4(m);a.push([v.z,-v.y]);bounds.x0=Math.min(bounds.x0,v.z);bounds.x1=Math.max(bounds.x1,v.z);bounds.y0=Math.min(bounds.y0,-v.y);bounds.y1=Math.max(bounds.y1,-v.y);}
      triangles.push(a);
     }
    }
   });
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d',{willReadFrequently:true}),scale=460/Math.max(bounds.x1-bounds.x0,bounds.y1-bounds.y0),cx=(bounds.x0+bounds.x1)/2,cy=(bounds.y0+bounds.y1)/2;
   c.fillStyle='#fff';for(const tri of triangles){c.beginPath();tri.forEach(([x,y],i)=>c[i?'lineTo':'moveTo']((x-cx)*scale+256,(y-cy)*scale+256));c.closePath();c.fill();}
   const rgba=c.getImageData(0,0,512,512).data,mask=Array.from({length:512*512},(_,i)=>rgba[i*4+3]>127?1:0);
   output[kind]={bounds,triangles:triangles.length,mask,png:canvas.toDataURL()};
  }return output;
 })()`);
 for(const[kind,data]of Object.entries(shapes)){fs.writeFileSync(path.join(out,'icon-'+kind+'.png'),Buffer.from(data.png.split(',')[1],'base64'));delete data.png;}
 fs.writeFileSync(path.join(out,'icon-masks.json'),JSON.stringify(shapes));console.log(JSON.stringify({kinds:Object.keys(shapes),errors:page.errors}));
}finally{await browser.close();await server.close();}
