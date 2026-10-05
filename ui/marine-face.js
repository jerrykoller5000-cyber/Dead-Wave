// GP-105. Head-local surfaces; the existing rig and wardrobe own their materials.
// Rings run bottom to top. Front is +z. A shared vertex grid keeps cloth and skin
// softly shaded without adding an asset loader, texture or per-frame work.
function surface(T, rings, {opening = false, frontOnly = false, wrap = false} = {}) {
  const segments = 32, positions = [], uv = [], indices = [];
  for (let r = 0; r < rings.length; r++) {
    const [y, width, front, back] = rings[r];
    for (let j = 0; j <= segments; j++) {
      const a = -Math.PI + j / segments * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      let yy = y;
      if (wrap && r === rings.length - 1) yy = 1.355 + .046 * Math.max(0, c) ** 5;
      if (frontOnly && r === rings.length - 1) yy += .05 * s * s;
      if (opening && r === 4 && c > 0) yy += .015 * c ** 8 + .01 * s ** 4;
      if (opening && r === 5 && c > 0) yy += .019 * c;
      positions.push(width * s, yy - 1.22, c >= 0 ? front * c ** .55 : -back * (-c) ** .8);
      uv.push(j / segments, (y - 1.2) * 3);
    }
  }
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < segments; j++) {
    const a = -Math.PI + (j + .5) / segments * Math.PI * 2;
    if (frontOnly && Math.abs(a) > Math.PI * .46) continue;
    if (opening && r === 4 && Math.abs(a) < Math.PI / 4) continue;
    const p = r * (segments + 1) + j, q = p + segments + 1;
    indices.push(p, p + 1, q, p + 1, q + 1, q);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
  return g;
}

export function buildMarineHead(T, material) {
  const mesh = new T.Mesh(surface(T, [
    [1.275,.035,.09,.048], [1.291,.065,.127,.07],
    [1.323,.094,.149,.09], [1.365,.115,.152,.111],
    [1.402,.124,.151,.122], [1.455,.125,.148,.125],
    [1.50,.118,.13,.12], [1.534,.085,.094,.087], [1.548,.001,.001,.001]
  ]), material);
  mesh.name = 'marine-shaped-head';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}

let fadeTexture = null;
// The fade shares the live hair colour; only its coverage thins toward the skin.
// A single small local texture is reused by every marine, with no frame updates.
export function buildMarineHair(T, hairMaterial) {
  const group=new T.Group();group.name='medium-fade';
  const n=48,rows=10,head=[[1.402,.124,.151,.122],[1.455,.125,.148,.125],[1.50,.118,.13,.12],[1.534,.085,.094,.087],[1.548,.001,.001,.001]];
  const radius=y=>{let i=1;while(i<head.length-1&&head[i][0]<y)i++;const a=head[i-1],b=head[i],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));return a.slice(1).map((v,k)=>v+(b[k+1]-v)*t);};
  const edge=c=>1.477+.022*Math.max(0,c)**3;
  function mesh(top,mat){const p=[],uv=[],ix=[];
    for(let row=0;row<=rows;row++)for(let j=0;j<=n;j++){
      const a=-Math.PI+j/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a),t=row/rows,upper=edge(c);
      const lower=c>.65?upper-.002:1.427+.065*Math.max(0,c)**3-.008*Math.max(0,-c);
      const y=top?upper+(1.561-upper)*Math.sin(t*Math.PI/2):lower+(upper-lower)*t;
      const r=radius(top?upper:y),lift=top?.003:.0015;
      const taper=top?Math.max(0,Math.cos(t*Math.PI/2))**.72:1;
      p.push((r[0]+lift)*s*taper,y-1.22,c>=0?(r[1]+lift)*c**.55*taper:-(r[2]+lift)*(-c)**.8*taper);uv.push(j/n,t);
    }
    for(let r=0;r<rows;r++)for(let j=0;j<n;j++){const a=r*(n+1)+j,b=a+n+1;ix.push(a,a+1,b,a+1,b+1,b);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();const m=new T.Mesh(g,mat);m.castShadow=top;m.receiveShadow=true;return m;
  }
  if(!fadeTexture){const size=64,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4,t=y/(size-1),grain=((x*17+y*31)%23)/23;const coverage=Math.max(0,Math.min(1,t**1.35+(grain-.5)*.065));data[i]=data[i+1]=data[i+2]=Math.round(coverage*255);data[i+3]=255;}fadeTexture=new T.DataTexture(data,size,size);fadeTexture.magFilter=T.LinearFilter;fadeTexture.minFilter=T.LinearFilter;fadeTexture.needsUpdate=true;}
  const fade=hairMaterial.clone();fade.color=hairMaterial.color;fade.alphaMap=fadeTexture;fade.transparent=true;fade.depthWrite=false;fade.roughness=1;
  group.add(mesh(true,hairMaterial),mesh(false,fade));return group;
}

export function buildBalaclava(T, material) {
  material.roughness = .98;material.metalness = 0;material.side = T.DoubleSide;
  const mesh = new T.Mesh(surface(T, [
    [1.205,.094,.105,.097], [1.229,.091,.115,.101],
    [1.253,.086,.122,.102], [1.29,.094,.156,.109],
    [1.326,.12,.171,.122], [1.355,.131,.177,.132]
  ], {wrap:true}), material);
  mesh.name = 'cloth-balaclava';mesh.castShadow = true;mesh.receiveShadow = true;
  const group = new T.Group();group.name = 'balaclava';group.add(mesh);
  // A rolled hem follows the nose and dips beneath the ears; no hood over the scalp.
  const edge = [];
  for (let j = 0; j < 32; j++) {
    const a = -Math.PI + j / 32 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    const y = 1.355 + .046 * Math.max(0,c) ** 5;
    edge.push(new T.Vector3(.131 * sn, y - 1.22, c >= 0 ? .178*c**.55 : -.133*(-c)**.8));
  }
  const hem = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge, true), 48, .0016, 4, true), material);
  hem.castShadow = true;hem.receiveShadow = true;group.add(hem);
  return group;
}

export function buildSurvivorBeard(T, material) {
  const mesh = new T.Mesh(surface(T, [
    [1.273,.036,.098,.05], [1.291,.069,.134,.07],
    [1.323,.098,.155,.09], [1.341,.125,.156,.1]
  ], {frontOnly:true}), material);
  mesh.name = 'survivor-fitted-beard';mesh.castShadow = true;mesh.receiveShadow = true;
  return mesh;
}
