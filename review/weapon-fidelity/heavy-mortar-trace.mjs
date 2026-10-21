// Read-only constructor trace for the reverse-photo lighting investigation.
import fs from 'node:fs';
const audit=fs.readFileSync(new URL('heavy-audit.mjs',import.meta.url),'utf8');
const source=audit.slice(0,audit.indexOf('function stats(')).replaceAll("'../../", "'"+new URL('../../',import.meta.url).href);
const tail=`
const result={};
for(const collapsed of[false,true])for(const version of['before','after']){
 const g=version==='before'?before.makeMortarMesh(null,collapsed):models.makeMortarModel(ctx,null,collapsed);
 g.updateMatrixWorld(true);const rows=[];
 function walk(o,path){if(o.isMesh){const p=o.geometry.attributes.position,box=new THREE.Box3(),v=new THREE.Vector3();for(let i=0;i<p.count;i++)box.expandByPoint(v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));rows.push({path,type:o.geometry.type,material:o.material.type,color:o.material.color.getHexString(),side:o.material.side,vertices:p.count,min:box.min.toArray(),max:box.max.toArray(),position:o.position.toArray(),tube:o===g.userData.tube});}for(let i=0;i<o.children.length;i++)walk(o.children[i],path+'/'+i);}
 walk(g,'root');result[version+(collapsed?'-carried':'-deployed')]=rows;
}
fs.writeFileSync('review/weapon-fidelity/heavy-mortar-trace.json',JSON.stringify(result,null,2));
for(const [name,rows]of Object.entries(result))console.log(name,JSON.stringify(rows.filter(r=>r.max[1]-r.min[1]>.8).map(({path,type,side,min,max,tube})=>({path,type,side,min,max,tube}))));
`;
await import('data:text/javascript;base64,'+Buffer.from(source+tail).toString('base64'));
