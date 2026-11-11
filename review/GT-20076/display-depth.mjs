import {visibilityBuffer} from './visibility-buffer.mjs';

export function displayDepth(G,root,width,height,project) {
  const parts=[];
  root.updateWorldMatrix(true,true);
  root.traverseVisible(o=>{
    const geom=o.geometry, pos=geom?.attributes?.position;
    if(!o.isMesh || !pos || !o.material || o.material.visible===false || o.material.opacity===0) return;
    const count=o.isInstancedMesh?o.count:1;
    for(let i=0;i<count;i++){
      const matrix=o.matrixWorld.clone();
      if(o.isInstancedMesh) {
        const local=new G.Matrix4(); o.getMatrixAt(i,local); matrix.multiply(local);
      }
      const points=Array.from({length:pos.count},(_,j)=>new G.Vector3().fromBufferAttribute(pos,j).applyMatrix4(matrix));
      const indices=geom.index, end=Math.min(indices?.count??pos.count,geom.drawRange.start+geom.drawRange.count);
      const faces=[];
      for(let j=geom.drawRange.start;j+2<end;j+=3){
        const p=[j,j+1,j+2].map(k=>points[indices?indices.getX(k):k]);
        faces.push({p});
      }
      parts.push({vertices:points,faces});
    }
  });
  return visibilityBuffer(parts,project,width,height).depths;
}

export async function packDepth(depths) {
  const bytes=new Float32Array(depths);
  const zipped=new Response(new Blob([bytes.buffer]).stream().pipeThrough(new CompressionStream('gzip')));
  const body=new Uint8Array(await zipped.arrayBuffer());
  let binary='';
  for(let i=0;i<body.length;i+=16000) binary+=String.fromCharCode(...body.subarray(i,i+16000));
  return btoa(binary);
}
