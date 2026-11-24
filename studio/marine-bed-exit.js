// GP-169: Training infirmary recovery, sampled in seconds rather than frame steps.
const clamp = u => Math.max(0, Math.min(1, u));
const ease = u => { u=clamp(u); return u*u*(3-2*u); };
const mix = (a,b,u) => a+(b-a)*u;
export const BED_EXIT_SECONDS = 5;
const keys = [
  // time, sit-up, swivel, move to edge, lower to planted feet, stand
  [0,0,0,0,0,0], [1.35,0,0,0,0,0], [2.25,1,0,0,0,0],
  [3.15,1,1,1,0,0], [3.75,1,1,1,1,0], [4.65,1,1,1,1,1], [5,1,1,1,1,1]
];
const originalLeg = { hipY:.62, thigh:.27, shin:.25, ankleZ:0, plantZ:.01 };
function plantedLeg(forward, down, leg) {
  const a=leg.thigh, b=Math.hypot(leg.shin,leg.ankleZ), r=Math.min(a+b,Math.hypot(forward,down));
  const cos=v=>Math.max(-1,Math.min(1,v));
  return { thigh:-Math.atan2(forward,down)-Math.acos(cos((a*a+r*r-b*b)/(2*a*r))),
    knee:Math.PI-Math.acos(cos((a*a+b*b-r*r)/(2*a*b)))+Math.atan2(leg.ankleZ,leg.shin) };
}
export function sampleBedExit(t,bed,floorY,leg=originalLeg) {
  t=Math.max(0,t);
  let i=1;while(i<keys.length-1 && t>keys[i][0])i++;
  const a=keys[i-1],b=keys[i],u=ease((t-a[0])/(b[0]-a[0]));
  const [sit,turn,edge,plant,stand]=a.slice(1).map((v,j)=>mix(v,b[j+1],u));
  // The equipped player reclines on the pack. Flex his knees so his heels
  // still rest on the mattress while the chest and pack rise together.
  const recline=leg.recline || 0, lying=1-sit;
  const hip={x:mix(bed.x-1.02,bed.stand.x,turn),
    y:mix(mix(bed.y+(recline ? .145 : .10),bed.y+.12,sit),floorY+.48,plant),
    z:mix(bed.z,bed.z+.46,edge)};
  hip.z=mix(hip.z,bed.stand.z-.32,plant);
  hip.y=mix(hip.y,floorY+leg.hipY,stand);hip.z=mix(hip.z,bed.stand.z,stand);
  const pitch=mix(-Math.PI/2+recline,0,sit),yaw=mix(bed.yaw,bed.stand.yaw,turn);
  const ankleHeight=leg.hipY-leg.thigh-leg.shin;
  const planted=plantedLeg(bed.stand.z+(leg.plantZ??leg.ankleZ)-hip.z,hip.y-floorY-ankleHeight,leg);
  // Thighs stay along the mattress during the sit-up, then the shins drop over its open side.
  const drop=recline ? ease((turn-.55)/.45) : turn;
  const thigh=mix(-sit*(recline ? 1.57 : 1.48)-(recline ? recline+.22 : 0)*lying,planted.thigh,plant);
  const knee=mix(.06*sit+1.35*drop+(recline ? .52 : 0)*lying,planted.knee,plant);
  const settle=ease((t-4.65)/.35);
  return {t,hip,pitch,yaw,thigh:mix(thigh,0,settle),knee:mix(knee,0,settle),
    ankle:mix(-(pitch+thigh+knee)*drop,0,settle),
    lean:.24*plant*(1-stand), brace:sit*(1-plant), settle, done:t>=BED_EXIT_SECONDS};
}
