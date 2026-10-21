// GP-163. Fine material response only: wardrobe colors and camouflage stay live.
// Three small map pairs are shared per THREE namespace, with no animation work.
const libraries = new WeakMap();
const KINDS = new Set(['cloth','leather','rubber']);
const SIZE = 128;
const clamp = x => Math.max(0,Math.min(1,x));
function hash(x,y,seed){
  let h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(seed,1274126177);
  h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295;
}
function noise(x,y,seed,period){
  const ix=Math.floor(x),iy=Math.floor(y),a=x-ix,b=y-iy,s=a*a*(3-2*a),t=b*b*(3-2*b);
  const sample=(px,py)=>hash((px%period+period)%period,(py%period+period)%period,seed);
  const lo=sample(ix,iy)*(1-s)+sample(ix+1,iy)*s,hi=sample(ix,iy+1)*(1-s)+sample(ix+1,iy+1)*s;
  return lo*(1-t)+hi*t;
}
function library(T){
  if(libraries.has(T))return libraries.get(T);
  const result={};libraries.set(T,result);
  if(typeof T.DataTexture!=='function')return result;
  const probe=new T.DataTexture(new Uint8Array(4),1,1),real=probe.isDataTexture===true;probe.dispose?.();
  if(!real)return result;
  function map(bytes,name){
    const texture=new T.DataTexture(bytes,SIZE,SIZE,T.RGBAFormat,T.UnsignedByteType);
    texture.name='marine-fabric-'+name;texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;
    texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;
    return texture;
  }
  for(const [kind,seed]of [['cloth',101],['leather',203],['rubber',307]]){
    const relief=new Uint8Array(SIZE*SIZE*4),response=new Uint8Array(relief.length);
    for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){
      const u=x/SIZE,v=y/SIZE,n=noise(u*24,v*24,seed,24),small=hash(x,y,seed+3);
      let height,rough;
      if(kind==='cloth'){
        const warp=Math.cos(u*Math.PI*64),weft=Math.cos(v*Math.PI*64);
        const twill=Math.cos((u+v)*Math.PI*32)*.5;
        height=.50+(warp+weft)*.013+twill*.009+(small-.5)*.006;
        rough=.966+(warp+weft)*.009;
      }else if(kind==='leather'){
        height=.50+(n-.5)*.13+(small-.5)*.014;
        rough=.90+n*.075;
      }else{
        height=.50+(n-.5)*.047+(small-.5)*.018;
        rough=.94+small*.05;
      }
      const p=(y*SIZE+x)*4,h=Math.round(clamp(height)*255),r=Math.round(clamp(rough)*255);
      relief[p]=relief[p+1]=relief[p+2]=h;relief[p+3]=255;
      response[p]=response[p+1]=response[p+2]=r;response[p+3]=255;
    }
    result[kind]={bumpMap:map(relief,kind+'-relief'),roughnessMap:map(response,kind+'-roughness'),bumpScale:kind==='leather'?.002:kind==='cloth'?.0014:.0012};
  }
  return result;
}
function classify(label,material){
  const explicit=material.userData?.marineSurface||material.userData?.surface;
  if(KINDS.has(explicit))return explicit;
  if(KINDS.has(label))return label;
  const name=(label+' '+(material.name||'')).toLowerCase();
  if(/skin|hair|eye|iris|pupil|scar|glass|lens/.test(name))return null;
  if(/rubber|sole|pad|grip/.test(name))return 'rubber';
  if(/leather|boot|glove/.test(name))return 'leather';
  if(/cloth|uniform|trouser|shirt|camo|carrier|pouch|web|pack|mask|cap|shell|belt|holster|lace/.test(name))return 'cloth';
  return null;
}

/** Accept material records or explicit groups, e.g.
 * {cloth:[uniformW,maskW],leather:[bootW],rubber:[soleW]}.
 * Existing color/maps, metalness, and custom normal/bump maps are never replaced.
 * Cloned wardrobe materials share these immutable maps, not mutable color state.
 * Returns the number of materials receiving a new map; a repeated call is a no-op.
 */
export function applyMarineSurfaceDetail(T,mats){
  const maps=library(T),seen=new Set();let changed=0;
  function visit(value,label=''){
    if(!value||typeof value!=='object'||seen.has(value))return;
    seen.add(value);
    if(value.isMaterial){
      const kind=classify(label,value),detail=maps[kind];if(!detail)return;
      let touched=false;
      if(!value.bumpMap&&!value.normalMap){value.bumpMap=detail.bumpMap;value.bumpScale=detail.bumpScale;touched=true;}
      if(!value.roughnessMap){value.roughnessMap=detail.roughnessMap;touched=true;}
      if(touched){value.needsUpdate=true;changed++;}
    }else if(Array.isArray(value)){for(const entry of value)visit(entry,label);}
    else{for(const [key,entry]of Object.entries(value))visit(entry,KINDS.has(label)?label:key);}
  }
  visit(mats);return changed;
}
