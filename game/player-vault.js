// Short cover vaults. Pure geometry/phase policy; callers own collision queries and the rig.
export const VAULT_FEEL = Object.freeze({radius:.42, reach:.95, maxHeight:1.55, minHeight:.45,
  maxRise:.3, maxDrop:.55, alignment:.55, landingPad:.28, bodyHeight:1.7});
const clamp = (n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const smooth = n=>{n=clamp(n);return n*n*(3-2*n);};
export function vaultCanFire(weapon,unarmed=false){return !unarmed&&['pistol','revolver','uzi'].includes(weapon);}
export function vaultEligible(piece){
  return !!piece&&piece.hp>0&&!piece.barred&&piece.opening!=='gate'&&
    (['sandbag','barricade','railing','wire'].includes(piece.type)||piece.type==='wall'&&piece.opening==='window');
}
export function planVault({piece,box,position,direction,baseY,topY,groundAt,clearAt,speed=0},feel=VAULT_FEEL){
  if(!vaultEligible(piece)||!box||![position.x,position.y,position.z,baseY,topY].every(Number.isFinite))return null;
  const height=topY-position.y;
  if(height<feel.minHeight||height>feel.maxHeight||Math.abs(baseY-position.y)>.4)return null;
  const alongX=box.hx>box.hz, half=alongX?box.hz:box.hx, span=alongX?box.hx:box.hz;
  const across=(alongX?position.z-box.cz:position.x-box.cx),side=Math.sign(across);
  if(!side||Math.abs(across)<half+.08||Math.abs(across)-half>feel.reach+feel.radius)return null;
  const tangent=(alongX?position.x-box.cx:position.z-box.cz);
  if(Math.abs(tangent)>span-feel.radius*.65)return null;
  const nx=alongX?0:-side,nz=alongX?-side:0,len=Math.hypot(direction.x,direction.z);
  if(len<.01||(direction.x*nx+direction.z*nz)/len<feel.alignment)return null;
  const x1=alongX?position.x:box.cx+nx*(half+feel.radius+feel.landingPad);
  const z1=alongX?box.cz+nz*(half+feel.radius+feel.landingPad):position.z;
  const y1=groundAt(x1,z1,position.y+feel.maxRise);
  if(!Number.isFinite(y1)||y1-position.y>feel.maxRise||position.y-y1>feel.maxDrop)return null;
  const contactT=clamp(tangent-.24*(alongX?nz:-nx),-span+.12,span-.12);
  const v={t:0,dur:clamp(.63+height*.11-clamp(speed/8)*.07,.61,.8),piece,box,nx,nz,
    x0:position.x,y0:position.y,z0:position.z,x1,y1,z1,topY,
    lift:Math.max(.4,height-.08),contact:{x:alongX?box.cx+contactT:box.cx,
      y:topY+.025,z:alongX?box.cz:box.cz+contactT}};
  // The entire body's route and final standing space must be safe, not just its centre at the destination.
  if(clearAt)for(let i=1;i<=20;i++){
    const u=i/20,p=sampleVault(v,u);
    if(!clearAt(p.x,p.y,p.z,p.bodyHeight,piece))return null;
  }
  return v;
}
export function sampleVault(v,u=v.t/v.dur){
  u=clamp(u);const travel=smooth(u),over=u===0||u===1?0:Math.sin(Math.PI*u),brace=smooth(u/.16)*(1-smooth((u-.64)/.2));
  const arc=p=>p<=0||p>=1?0:Math.sin(Math.PI*p);
  const lead=arc((u-.08)/.76),trail=arc((u-.19)/.76);
  return {u,x:u===1?v.x1:v.x0+(v.x1-v.x0)*travel,z:u===1?v.z1:v.z0+(v.z1-v.z0)*travel,
    y:u===1?v.y1:v.y0+(v.y1-v.y0)*travel+v.lift*over,
    brace,over,lead,trail,bodyHeight:VAULT_FEEL.bodyHeight-.55*over,
    lean:1.0*over,dip:-.27*over,roll:-.16*over,
    thighL:-1.4*lead,kneeL:2.7*lead,thighR:-1.25*trail,kneeR:2.85*trail,
    settle:smooth((u-.8)/.2)};
}
