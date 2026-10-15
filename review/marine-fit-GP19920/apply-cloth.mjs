import fs from 'node:fs';
function change(file,fn){const before=fs.readFileSync(file,'utf8');let s=before.replaceAll('\r\n','\n');const r=(a,b)=>{if(s.split(a).length!==2)throw Error(file+': '+a);s=s.replace(a,b);};fn(r,()=>s,x=>s=x);if(fs.readFileSync(file,'utf8')!==before)throw Error('concurrent edit');fs.writeFileSync(file,s.replaceAll('\n',before.includes('\r\n')?'\r\n':'\n'));}
change('ui/marine-face.js',(r,get,set)=>{
 const start=get().indexOf('export function buildBalaclava('),end=get().indexOf('\nexport function buildSurvivorBeard',start);
 const next=`export function buildBalaclava(T, material) {
  material.roughness=.98;material.metalness=0;material.side=T.DoubleSide;
  const group=new T.Group();group.name='balaclava';
  // A tapered neck, chin pocket and cheek panels follow the head, rather than
  // a straight cylinder flaring out above the collar.
  const rings=[[1.205,.079,.087,.081],[1.229,.077,.092,.083],
    [1.253,.074,.097,.084],[1.272,.064,.111,.075],[1.29,.069,.135,.077],
    [1.309,.09,.151,.091],[1.326,.105,.16,.104],[1.341,.118,.164,.117],[1.355,.123,.166,.123]];
  const front=new T.Mesh(surface(T,rings,{wrap:true,cloth:true}),material);
  front.name='cloth-balaclava';front.castShadow=front.receiveShadow=true;group.add(front);
  // Hood covers the ears, back and scalp with one eye opening. Its crown sits
  // inside both the cover and fitted helmet; no new wardrobe item is needed.
  const hoodGeo=surface(T,[[1.341,.118,.164,.117],[1.355,.123,.166,.123],
    [1.38,.128,.158,.125],[1.396,.129,.157,.128],[1.403,.130,.157,.129],
    [1.449,.131,.155,.132],[1.48,.129,.148,.130],[1.51,.12,.132,.123],
    [1.538,.091,.101,.094],[1.555,.035,.04,.037],[1.56,.001,.001,.001]]);
  const source=Array.from(hoodGeo.index.array),ix=[];
  for(let tri=0;tri<source.length;tri+=6){const a=source[tri],row=Math.floor(a/33),j=a%33;
    const angle=-Math.PI+(j+.5)/32*Math.PI*2;
    if(row<5&&Math.abs(angle)<1.0)continue;
    ix.push(...source.slice(tri,tri+6));}
  hoodGeo.setIndex(ix);hoodGeo.computeVertexNormals();
  const hood=new T.Mesh(hoodGeo,material);hood.name='balaclava-fitted-hood';hood.castShadow=hood.receiveShadow=true;group.add(hood);
  const edge=[];for(let j=0;j<32;j++){const a=-Math.PI+j/32*Math.PI*2,c=Math.cos(a);
    edge.push(new T.Vector3(.123*Math.sin(a),1.355+.046*Math.max(0,c)**5-1.22,c>=0?.167*c**.55:-.124*(-c)**.8));}
  const hem=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge,true),48,.0014,4,true),material);
  hem.castShadow=hem.receiveShadow=true;group.add(hem);
  const parts=[front,hem].map(mesh=>({mesh,rest:Float32Array.from(mesh.geometry.attributes.position.array)}));
  // Smoking lowers the stretch face panel under the lip, rather than passing
  // a cigarette through fabric. These two meshes remain outside rigid merging.
  for(const {mesh} of parts){mesh.add(new T.Object3D());mesh.userData.liveShape=true;}
  let last=-1;
  group.userData.mouthOpen=k=>{k=Math.max(0,Math.min(1,k));if(Math.abs(k-last)<.0001)return;last=k;
    for(const{mesh,rest}of parts){const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
        const frontWeight=Math.max(0,Math.min(1,(z-.045)/.085));
        const high=Math.max(0,Math.min(1,(y-.065)/.10));
        p.setXYZ(i,x,y-k*frontWeight*high*.083,z-k*frontWeight*high*.007);}
      p.needsUpdate=true;mesh.geometry.computeVertexNormals();}
  };
  group.userData.mouthOpen(0);return group;
}
`;
 set(get().slice(0,start)+next+get().slice(end));
});
change('ui/weapon-sling.js',r=>{
 r('const lower=at(.225,.86,-.17);','const lower=at(.222,.89,-.19);');
 r('const shoulder=at(.205,1.185,-.145);','const shoulder=at(.205,1.155,-.135);');
 r('const points=[a,rear,lower,at(.235,.98,.115),\n    at(.17,1.12,vest?.22:.16),at(.175,1.185,.12),at(.18,1.205,-.035),',
   'const points=[a,rear,lower,at(.235,.98,.115),\n    at(.19,1.09,vest?.224:.158),at(.205,1.151,.105),at(.212,1.177,-.015),');
});
change('studio/marine-hand.js',r=>{
 r('palm: [[-0.196, 0.024, 0.0135, gz - 0.023], [-0.206, 0.028, 0.0148, gz - 0.022], [-0.222,',
   'palm: [[-0.214, 0.029, 0.016, gz - 0.022], [-0.222,');
});
