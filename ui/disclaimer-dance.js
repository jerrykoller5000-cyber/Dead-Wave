// GP-19906: directional jump momentum, loose groove and active floorwork. Fresh presentation marine only.
import * as THREE from 'three';
import { ikLimb } from '../studio/ik.js';
import { HAND_POSES, lerpPose } from '../studio/marine-hand.js';

const PI = Math.PI, TAU = PI * 2, BEAT = 60 / 103.322299;
export const DISCLAIMER_DANCE = Object.freeze({
  duration: 20, bpm: 103.322299, beatSeconds: BEAT, sourceStart: 9.151494,
  beats: 20 / BEAT,
  boundaries: [0,4,6,8,8.5,9,10,11,12,14,16,17.5,18,19,20,20.5,21,21.5,22,23,25,25.18,25.82,26,30,30.4,31.25,31.9,33.2,20/BEAT],
  phrases: ['funky strut','running man','quick grab','together hops','backstep groove',
    'heel-toe shimmy','heel-toe','drop','hand plant','kick-up','handstand','release','shoulder roll',
    'backspin','spin brake','side roll','cheek-rest ground freeze']
});
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const mix = (a, b, t) => a + (b - a) * t;
const v = a => new THREE.Vector3(...a);
const q = (x=0, y=0, z=0) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z,'YXZ'));
const X=v([1,0,0]), flipY=q(0,PI), PALM=v([0,-.048,.016]), SOLE=v([0,-.103,.03]);

function footStep(b, side, mode) {
  // One foot travels on an eighth-note, then takes weight while the other lifts.
  const phase=(b+(side>0?.5:0))%2, moving=phase<.68||phase>=1&&phase<1.68;
  const forward=phase<1, t=smooth(((phase%1)/.68)), w=moving?(forward?t:1-t):(forward?1:0);
  const cross=mode==='rock'?.13:0;
  return [mix(side*.21,side*(.24-cross),w), moving?.14*Math.sin(PI*t):0, mix(-.10,.23,w)];
}
function upright(b, mode='rock') {
  const swing=Math.sin(TAU*b), groove=Math.sin(PI*b), hit=.5+.5*Math.cos(TAU*b);
  const p={
    hip:v([.055*groove,.54-.04*hit,0]), root:q(.035+.025*hit,.12*groove,-.045*groove),
    torso:q(.02+.045*hit,.075*groove,-.045*groove), head:q(-.03-.035*hit,-.05*groove,.04*groove),
    feet:[], footQ:[q(0,-.1),q(0,.1)], legFK:0, leg:[], knee:[], ankle:[],
    upper:[], elbow:[], wrist:[], curl:[], hands:[v([-.32,.012,.40]),v([.32,.012,.40])],
    handPlant:[0,0], palmQ:[q(PI/2),q(PI/2)], shrug:0, floorLock:0, floorSafe:0, headRest:0,
    phase:mode==='run'?'running man':mode==='wave'?'heel-toe and wave':'top rock'
  };
  for(let i=0;i<2;i++){
    const side=i?1:-1, pump=Math.sin(TAU*b+i*PI), lag=Math.sin(TAU*b+i*PI-.40);
    p.feet[i]=v(footStep(b,side,mode));
    // The shoulder stays close to its bind twist; the elbow always bends forward.
    p.upper[i]=q(-.14-.30*pump,side*.08,side*(.20+.04*groove));
    p.elbow[i]=q(-(.66+.24*lag));
    p.wrist[i]=q(.16+.10*Math.sin(TAU*b+i*PI-.75),-side*(1.28+.08*lag),side*.07*Math.sin(TAU*b-.4));
    p.curl[i]=.62+.20*Math.sin(TAU*b+i*PI-.8);
    p.leg[i]=q(0,0,side*.15); p.knee[i]=q(.65); p.ankle[i]=q(-.12);
  }
  if(mode==='run'){
    p.phase='running man';p.root=q(.11,.10*groove,-.035*swing);p.hip.y=.51+.025*Math.cos(TAU*b);
    for(let i=0;i<2;i++){
      const side=i?1:-1, a=TAU*b+i*PI, lift=Math.max(0,Math.sin(a));
      p.feet[i]=v([side*.16,.20*lift,-.22*Math.cos(a)]);
      p.upper[i]=q(-.17-.46*Math.cos(a),side*.065,side*.16);
      p.elbow[i]=q(-(.82+.22*Math.sin(a-.25)));p.curl[i]=.78+.10*Math.sin(a-.5);
    }
  }else if(mode==='wave'){
    p.phase='heel-toe and wave';p.root=q(.03,.26*groove,-.07*groove);p.hip.x=.08*groove;
    p.feet=[v([-.23,.03*Math.max(0,swing),.03]),v([.23,.03*Math.max(0,-swing),.03])];
    p.footQ=[q(0,-.14+.32*groove),q(0,.14+.32*groove)];
    for(let i=0;i<2;i++){
      const side=i?1:-1,a=PI*b-i*.8, reach=.5+.5*Math.sin(a);
      p.upper[i]=q(-.28-.80*reach,side*.12,side*(.25+.28*reach));
      p.elbow[i]=q(-(.38+.55*(1-reach)));p.wrist[i]=q(.20*Math.sin(a-.6),-side*1.30,side*.12*Math.sin(a-.9));
      p.curl[i]=.24+.48*(.5+.5*Math.sin(a-1.1));
    }
  }
  return p;
}
function blend(a,b,t){
  a.hip.lerp(b.hip,t);
  for(const key of ['root','torso','head'])a[key].slerp(b[key],t);
  for(const key of ['legFK','shrug','floorLock','floorSafe','headRest'])a[key]=mix(a[key],b[key],t);
  for(let i=0;i<2;i++){
    for(const key of ['feet','hands'])a[key][i].lerp(b[key][i],t);
    for(const key of ['footQ','leg','knee','ankle','upper','elbow','wrist','palmQ'])a[key][i].slerp(b[key][i],t);
    a.handPlant[i]=mix(a.handPlant[i],b.handPlant[i],t);a.curl[i]=mix(a.curl[i],b.curl[i],t);
  }
  a.phase=b.phase;return a;
}
function drop(){
  const p=upright(20);p.phase='drop';p.hip.set(0,.40,-.06);p.root.copy(q(.30,.12));p.torso.copy(q(.08));p.head.copy(q(-.17));
  p.feet=[v([-.22,0,.02]),v([.22,0,.02])];
  for(let i=0;i<2;i++){const s=i?1:-1;p.upper[i]=q(-.63,0,s*.16);p.elbow[i]=q(-.30);p.wrist[i]=q(.16,-s*1.25);p.curl[i]=.18;}
  return p;
}
function launch(){
  const p=drop();p.phase='kick-up';p.hip.set(0,.27,0);p.root.copy(q(1.45,.12));p.torso.copy(q());p.head.copy(q(-.20));
  p.feet=[v([-.18,.07,-.29]),v([.18,.07,-.29])];p.hands=[v([-.32,.012,.39]),v([.32,.012,.39])];
  p.handPlant=[1,1];p.palmQ=[q(PI/2,-.38),q(PI/2,.62)];p.legFK=1;
  for(let i=0;i<2;i++){const side=i?1:-1;p.leg[i]=q(-2.10,0,side*.18);p.knee[i]=q(2.40);p.ankle[i]=q(-.50);}
  return p;
}
function freeze(b){
  const p=launch(),a=TAU*b;p.phase='handstand';p.hip.set(0,1.085,0);p.root.copy(q(PI,.12,.010*Math.sin(PI*b)));
  p.head.copy(q(0,.035*Math.sin(PI*b)));p.shrug=.13;p.legFK=1;p.floorSafe=1;
  p.hands=[v([-.28,.012,-.025]),v([.28,.012,-.025])];
  for(let i=0;i<2;i++){const s=i?1:-1;p.leg[i]=q(-.12+.20*Math.sin(a+i*PI),0,s*(.27+.06*Math.cos(a)));p.knee[i]=q(.40+.18*Math.sin(a+i*PI-.4));p.ankle[i]=q(-.12);p.curl[i]=0;}
  return p;
}
function release(){
  const p=freeze(28);p.phase='release';p.handPlant=[0,0];
  // Stay overhead while lifting palms; fold around the outside of the torso next.
  p.upper=[q(-.25,.83,3.03),q(-.38,-.63,-2.97)];p.elbow=[q(-.44),q(-.44)];
  p.wrist=[q(.10,1.25),q(.10,-1.25)];p.curl=[.35,.35];return p;
}
function shoulderRoll(){
  const p=freeze(28);p.phase='shoulder roll';p.hip.set(.04,.55,0);p.root.copy(q(-2.08,.12,-.23));p.shrug=.015;
  p.handPlant=[0,0];p.floorSafe=1;p.floorLock=.6;
  for(let i=0;i<2;i++){const s=i?1:-1;p.upper[i]=q(-.35,0,s*.44);p.elbow[i]=q(-.9);p.wrist[i]=q(.08,-s*1.25);p.curl[i]=.5;p.leg[i]=q(-.6,0,s*.28);p.knee[i]=q(.80);}
  return p;
}
function spin(b){
  const p=shoulderRoll(),a=(b-30)*TAU/1.75,pulse=Math.sin(a*.75);
  p.phase='driven backspin';p.root=q(-PI/2+.055*Math.cos(a),.12+a,.075*Math.sin(a-.4));p.hip.set(0,.32,0);
  // Curl across the shoulder blades: chin in, side crunch into the rotation.
  p.head=q(.36+.035*pulse,-.035*Math.sin(a),.025);p.torso=q(.14+.035*pulse,.05*Math.sin(a-.6),.12+.04*Math.sin(a));
  p.shrug=0;p.floorLock=1;
  for(let i=0;i<2;i++){
    const side=i?1:-1,drive=Math.sin(a*.75+i*PI);
    // The legs scissor through different heights; hands pull close to the ribs.
    p.leg[i]=q(-1.10+.38*drive,0,side*(.22+.07*Math.cos(a*.75+i*PI)));
    p.knee[i]=q(.70+.38*Math.sin(a*.75+i*PI+.65));p.ankle[i]=q(-.18+.08*drive);
    p.upper[i]=q(-.30-.10*drive,side*.035,side*(.23+.04*drive));
    p.elbow[i]=q(-1.36-.16*Math.sin(a*.75+i*PI-.4));p.wrist[i]=q(.10,-side*1.25,side*.035*drive);p.curl[i]=.80+.10*drive;
  }
  return p;
}
function recover(){
  const p=drop();p.phase='rise';p.hip.set(0,.50,0);p.root.copy(q(.24,.12));p.legFK=1;p.floorSafe=1;
  for(let i=0;i<2;i++){const side=i?1:-1;p.leg[i]=q(-1.10,0,side*.18);p.knee[i]=q(1.60);p.ankle[i]=q(-.45);}
  return p;
}
function finish(b){
  const p=upright(b,'rock'),t=smooth((b-52)/2.2);p.phase='finish';
  const f=upright(0);f.hip.set(-.035,.54,0);f.root.copy(q(.015,-.13,-.025));f.torso.copy(q(0,.06));f.head.copy(q(-.02,.12,.025));
  f.feet=[v([-.22,0,.045]),v([.22,0,-.025])];
  f.upper=[q(-.08,0,-.16),q(-.83,-.12,.25)];f.elbow=[q(-.30),q(-1.15)];
  f.wrist=[q(.10,1.25),q(.16,-1.28)];f.curl=[.52,.76];f.phase='finish';return blend(p,f,t);
}
function powerChoreography(b){
  if(b<8)return upright(b,'rock');
  if(b<16)return blend(upright(b,'rock'),upright(b,'run'),smooth((b-8)/.65));
  if(b<20)return blend(upright(b,'run'),upright(b,'wave'),smooth((b-16)/.65));
  if(b<21)return blend(upright(b,'wave'),drop(),smooth(b-20));
  if(b<22)return blend(drop(),launch(),smooth(b-21));
  if(b<24){const k=smooth((b-22)/2),p=blend(launch(),freeze(b),k);const turn=Math.sin(PI*k);p.head.copy(q(mix(-.20,0,k)+.45*turn,1.15*turn));return p;}
  if(b<28)return freeze(b);
  if(b<28.5)return blend(freeze(b),release(),smooth((b-28)/.5));
  if(b<29.5)return blend(release(),shoulderRoll(),smooth(b-28.5));
  if(b<30)return blend(shoulderRoll(),spin(30),smooth((b-29.5)/.5));
  if(b<38)return spin(b);
  if(b<39)return blend(spin(38),recover(),smooth(b-38));
  if(b<40)return blend(recover(),upright(b,'run'),smooth(b-39));
  if(b<44)return upright(b,'run');
  if(b<48)return blend(upright(b,'run'),upright(b,'rock'),smooth((b-44)/.65));
  if(b<52)return blend(upright(b,'rock'),upright(b,'wave'),smooth((b-48)/.65));
  return blend(upright(b,'wave'),finish(b),smooth((b-52)/.65));
}

// Dissociate shoulders/head from the hips rather than swinging the whole rig
// as one solid piece. All free arm poses retain forward elbow flexion.
function boogie(b,mode='rock',amount=1){
  const p=upright(b,mode),g=Math.sin(PI*b),h=Math.sin(TAU*b-.35),a=clamp(amount);
  p.hip.x+=a*.045*g;p.hip.y-=a*.014*(.5+.5*Math.cos(TAU*b));
  p.root.multiply(q(0,a*.12*g,-a*.035*g));
  p.torso.multiply(q(a*.025*h,-a*.20*g,a*.055*g));
  p.head.multiply(q(a*.10*Math.sin(TAU*b-.7),a*.17*Math.sin(PI*b-.45),a*.065*Math.sin(PI*b-.8)));
  for(let i=0;i<2;i++){
    const side=i?1:-1;
    p.upper[i].multiply(q(-a*.10*h,0,side*a*.055*(1+g*side)));
    p.wrist[i].multiply(q(a*.04*Math.sin(TAU*b-i),0,a*.045*g));
  }
  p.phase=mode==='run'?'traveling running man':mode==='wave'?'heel-toe groove':'funky strut';return p;
}
// Per-jump articulation is independent of the ballistic travel root. Grounded
// soles stay fixed while the hips load/absorb; flight shortens the leg reach.
function curve(t,keys){let i=0;while(i<keys.length-2&&t>keys[i+1][0])i++;const a=keys[i],b=keys[i+1];return mix(a[1],b[1],smooth((t-a[0])/(b[0]-a[0])));}
function hopPose(b,phase=0){
  const p=boogie(b,'rock',.7),dir=Math.floor(b)%2?-1:1;
  const flight=clamp((phase-.20)/.66),air=Math.sin(PI*flight);
  const tuck=curve(phase,[[0,0],[.20,0],[.43,1],[.55,.95],[.84,0],[1,0]]);
  const swing=curve(phase,[[0,.15],[.10,0],[.30,1],[.55,.76],[.82,.32],[.95,0],[1,.15]]);
  const hipLead=dir*curve(phase,[[0,0],[.12,.035],[.20,.065],[.38,.04],[.54,0],[.72,-.055],[.86,-.065],[1,0]]);
  const lean=dir*curve(phase,[[0,0],[.12,-.13],[.20,-.28],[.40,-.17],[.58,.04],[.76,.23],[.86,.20],[1,0]]);
  const legReach=-dir*.115*Math.sin(TAU*flight),turn=dir*.16*Math.sin(TAU*flight);
  p.phase='directional side hop';
  p.hip.set(hipLead,curve(phase,[[0,.46],[.10,.40],[.20,.575],[.43,.49],[.55,.485],[.75,.55],[.86,.575],[.95,.405],[1,.46]]),-.025*tuck);
  p.feet=[v([-.095+legReach,.12*tuck,.025-.075*tuck]),v([.095+legReach,.12*tuck,.025-.075*tuck])];
  p.footQ=[q(.20*air,-.025-turn*.45),q(.20*air,.025-turn*.45)];
  p.root=q(.08+.08*(1-swing),turn,lean);
  p.torso=q(-.045*swing,-turn*.35,lean*.16);
  p.head=q(.06+.07*(1-swing),-turn*.35,-lean*.28);
  for(let i=0;i<2;i++){
    const side=i?1:-1,shift=side*dir*Math.sin(TAU*flight-.3)*air;
    p.upper[i]=q(.18-.92*swing+.19*shift,side*.08,side*(.23+.31*swing)-dir*.13*Math.sin(TAU*flight));
    p.elbow[i]=q(-(.91-.18*swing+.16*shift+.11*tuck));
    p.wrist[i]=q(.09+.10*Math.sin(TAU*phase-.5),-side*(1.25+.06*air),side*.075*Math.sin(TAU*phase));
    p.curl[i]=.60-.30*swing+.05*shift;
  }
  return p;
}
function shimmy(b){
  const p=boogie(b,'wave',.65),a=TAU*b,g=Math.sin(PI*b);
  p.phase='heel-toe shimmy';p.hip.set(.08*g,.49+.026*Math.cos(a),.015*Math.sin(a-.5));
  p.root=q(.045,.22*g,-.075*g);p.torso=q(.13*Math.sin(a-.45),-.18*g,.075*Math.sin(a-.7));
  p.head=q(.09*Math.sin(a-.8),.14*g,-.07*Math.sin(a-1));
  for(let i=0;i<2;i++){
    const side=i?1:-1,w=a+i*PI,lift=Math.max(0,Math.sin(w));
    p.feet[i]=v([side*.22+.045*Math.sin(w),.08*lift,.13*Math.cos(w)]);
    p.footQ[i]=q(.10*Math.sin(w),side*.10+.24*g,0);
    p.upper[i]=q(-.48-.24*Math.sin(w-.4),side*.10,side*(.32+.10*Math.sin(w-.6)));
    p.elbow[i]=q(-(.80+.22*Math.sin(w-.9)));p.wrist[i]=q(.16*Math.sin(w-1.1),-side*1.28,side*.08*g);p.curl[i]=.45+.18*Math.sin(w-1);
  }
  return p;
}
function flop(b){
  if(b<25.18)return blend(freeze(20+(b-21)*2),release(),smooth((b-25)/.18));
  const landing=shoulderRoll();landing.phase='shoulder flop';landing.root=q(-2.02,.12,-.34);
  landing.torso=q(.14,0,.08);landing.head=q(.30);landing.leg=[q(-.85,0,-.20),q(-.45,0,.28)];landing.knee=[q(.62),q(1.18)];
  if(b<25.82){const t=clamp((b-25.18)/.64);return blend(release(),landing,t*t);}
  // Catch the upper back, then let the leg drive carry directly into the spin.
  return blend(landing,spin(30+(b-26)*2),smooth((b-25.82)/.18));
}
function recline(){
  const p=shoulderRoll();p.phase='cheek-rest ground freeze';p.hip.set(0,.32,0);
  p.root=q(.20,.42,-1.55);p.torso=q(.02,-.04,.07);p.head=q(-.08,.06,.15);
  p.floorSafe=1;p.floorLock=1;p.legFK=1;p.headRest=1;
  p.leg=[q(.02,0,0),q(-.80,0,-.20)];p.knee=[q(.12),q(1.55)];p.ankle=[q(-.08),q(-.38)];
  p.upper=[q(-.15,0,.20),q(-.45,-.18,.65)];p.elbow=[q(-.50),q(-1.25)];
  p.wrist=[q(.12,1.25),q(.10,-1.25)];p.curl=[.18,.08];return p;
}
function rollCatch(){
  const p=recline();p.phase='roll onto side';p.root=q(-.80,.42,-.80);p.headRest=0;
  p.torso=q(.10,-.05,.12);p.head=q(.20,.04,.08);
  p.leg=[q(-.78,0,-.10),q(-1.0,0,-.25)];p.knee=[q(.45),q(1.05)];p.ankle=[q(-.18),q(-.25)];
  p.upper=[q(-.22,0,.12),q(-.55,-.1,.5)];p.elbow=[q(-.65),q(-1.15)];p.floorLock=1;return p;
}
function finale(b){
  if(b<30)return spin(30+(b-26)*2);
  const t=clamp((b-30)/1.25),p=spin(38+2*1.25*(t-t*t+t*t*t/3));p.phase='spin brake';
  if(b<30.4)return p;
  // Keep shoulder/hip support while unfolding; the cheek reach follows the roll.
  const u=clamp((b-30.4)/2.8),r=u*u*(3-2*u);
  const result=blend(blend(p,rollCatch(),r),blend(rollCatch(),recline(),r),r);
  result.headRest=smooth((b-31.9)/1.3);
  result.phase=r<1?'unwind into side recline':'cheek-rest ground freeze';return result;
}
function choreography(b){
  if(b<4)return boogie(b);
  if(b<8)return blend(boogie(b),boogie(b,'run'),smooth((b-4)/.6));
  if(b<8.5){
    const p=boogie(b,'run'),k=Math.sin(PI*(b-8)/.5)**2;
    // A brief hip-hop punctuation, with the hand low in front of the pelvis.
    p.upper[1].slerp(q(-.10,-.10,-.56),k);p.elbow[1].slerp(q(-.28),k);
    p.wrist[1].slerp(q(.10,-.80),k);p.curl[1]=mix(p.curl[1],.85,k);
    p.upper[0].slerp(q(-1.15,0,-.40),k);p.elbow[0].slerp(q(-1),k);
    p.hip.z+=.025*k;p.phase='quick grab accent';return p;
  }
  if(b<9)return blend(boogie(b,'run'),hopPose(b),smooth((b-8.5)/.5));
  if(b<12)return hopPose(b,b%1);
  if(b<14)return blend(hopPose(b),boogie(b,'rock'),smooth((b-12)/.55));
  if(b<16)return blend(boogie(b,'rock'),boogie(b,'wave'),smooth((b-14)/.6));
  if(b<17.5)return blend(boogie(b,'wave'),shimmy(b),smooth((b-16)/.75));
  if(b<20.5)return shimmy(b);
  if(b<21)return blend(shimmy(b),upright(b,'wave'),smooth((b-20.5)/.5));
  // Blend the live upright phase into the planted drop before the audited kick-up.
  if(b<21.5)return blend(upright(b,'wave'),drop(),smooth((b-21)/.5));
  if(b<25)return powerChoreography(20+(b-21)*2);
  if(b<26)return flop(b);
  return finale(b);
}
const PATH=[
  [0,-.75,-.30,.15],[4,.25,-.20,.40],[6,.62,.55,.45],[8,.30,.10,.10],
  [9,.30,.10,.10],[10,-.45,.10,-.12],[11,.38,.12,.12],[12,-.20,.08,-.12],
  [14,-.72,-.50,-.35],[16,.70,.55,.35],[18,-.20,.18,.05],
  [19,-.12,.12,-.10],[20,.15,.15,.12],[21,0,-.10,0],[20/BEAT,0,-.10,0]
];
function travelAt(b){
  let i=0;while(i<PATH.length-2&&b>=PATH[i+1][0])i++;
  const a=PATH[i],z=PATH[i+1],t=clamp((b-a[0])/(z[0]-a[0]));
  const hop=b>=9&&b<12,u=hop?clamp((t-.20)/.66):t;
  // Near-constant flight speed: only the short launch/catch ramps accelerate.
  const edge=.08,k=hop?(u<edge?u*u/(2*edge):u>1-edge?1-edge-(1-u)*(1-u)/(2*edge):u-edge/2)/(1-edge):smooth(u);
  const lateral=mix(a[1],z[1],k),depth=mix(a[2],z[2],k);
  return {x:.907*lateral+.420*depth,y:hop?.17*4*u*(1-u):0,z:-.420*lateral+.907*depth,yaw:mix(a[3],z[3],k)};
}

export function createDisclaimerDance(marine,{floorY=-.025}={}){
  const u=marine.userData;if(!u?.torsoG||!u.elbowLG?.userData.wrist)throw new TypeError('A fresh articulated marine is required');
  const travel=new THREE.Group();travel.name='marine-disclaimer-travel';
  const root=new THREE.Group();root.name='marine-disclaimer-pelvis';travel.add(root);root.add(marine);marine.position.set(0,-.62,0);marine.rotation.set(0,0,0);
  const arms=[u.armLG,u.armRG],elbows=[u.elbowLG,u.elbowRG],wrists=elbows.map(e=>e.userData.wrist);
  const legs=[u.legLG,u.legRG],knees=[u.kneeLG,u.kneeRG],ankles=[u.ankleLG,u.ankleRG],shoulderRest=arms.map(a=>a.position.y);
  const allMeshes=[];marine.traverseVisible(o=>{if(o.isMesh&&o.geometry?.attributes.position)allMeshes.push(o);});
  const rest=[u.torsoG,u.headG,...arms,...elbows,...wrists,...legs,...knees,...ankles].map(o=>[o,o.quaternion.clone()]);
  const caps=new Set(arms.flatMap(a=>(a.userData.liveShoulder?.parts||[]).map(p=>p.mesh))),limbs=new Set([...arms,...legs]),supports=[];
  marine.traverseVisible(o=>{if(!o.isMesh||!o.geometry?.attributes.position||caps.has(o))return;for(let n=o;n&&n!==marine;n=n.parent)if(limbs.has(n))return;supports.push(o);});
  const target=new THREE.Vector3(),corrected=new THREE.Vector3(),offset=new THREE.Vector3(),pole=new THREE.Vector3(),parentQ=new THREE.Quaternion();
  const shoulderCenter=new THREE.Vector3(),shoulderRight=new THREE.Vector3(),plantedCenter=new THREE.Vector3();
  const fkQ=[new THREE.Quaternion(),new THREE.Quaternion(),new THREE.Quaternion()],identity=new THREE.Quaternion();
  const handShapes=[lerpPose(HAND_POSES.open,HAND_POSES.fist,.5),lerpPose(HAND_POSES.open,HAND_POSES.fist,.5)];
  function bodyFloor(meshes=supports){let lo=Infinity;for(const o of meshes){const a=o.geometry.attributes.position,m=o.matrixWorld.elements;for(let i=0;i<a.count;i++)lo=Math.min(lo,m[1]*a.getX(i)+m[5]*a.getY(i)+m[9]*a.getZ(i)+m[13]);}return lo;}
  function naturalArm(i,point,dir){
    // Generic IK uses positive elbow flexion. Rotate its upper-arm basis and
    // reverse the hinge, preserving the endpoint without the old axial flip.
    const wrist=wrists[i],psi=Math.atan2(-wrist.position.z,-wrist.position.y);
    const bend=ikLimb(arms[i],elbows[i],.28,.222,point,dir,1,wrist.position);
    arms[i].quaternion.multiply(flipY);elbows[i].quaternion.setFromAxisAngle(X,-bend-psi);
  }
  let phrase='top rock';
  function sample(seconds){
    const b=Math.min(DISCLAIMER_DANCE.beats,Math.max(0,Number(seconds)||0)/BEAT),p=choreography(b);
    // World-space IK runs in a clean stage frame, independent of seek order.
    travel.position.set(0,0,0);travel.quaternion.identity();travel.scale.set(1,1,1);travel.updateMatrixWorld(true);
    for(const[o,r]of rest)o.quaternion.copy(r);
    root.position.copy(p.hip);root.quaternion.copy(p.root);u.torsoG.quaternion.copy(p.torso);u.headG.quaternion.copy(p.head);
    for(let i=0;i<2;i++){arms[i].position.y=shoulderRest[i]+p.shrug;arms[i].quaternion.copy(p.upper[i]);elbows[i].quaternion.copy(p.elbow[i]);wrists[i].quaternion.copy(p.wrist[i]);}
    root.updateMatrixWorld(true);
    // Pivot the kick-up around reachable, stable shoulders. Interpolating the
    // pelvis alone lifts planted palms off the floor during inversion.
    const plant=Math.min(...p.handPlant);
    if(plant>0){
      arms[0].getWorldPosition(shoulderCenter);arms[1].getWorldPosition(shoulderRight);shoulderCenter.add(shoulderRight).multiplyScalar(.5);
      plantedCenter.copy(p.hands[0]).add(p.hands[1]).multiplyScalar(.5);plantedCenter.y=.495;plantedCenter.z+=.005;
      root.position.addScaledVector(plantedCenter.sub(shoulderCenter),plant);root.updateMatrixWorld(true);
    }
    if(p.floorSafe>0){const dy=floorY+.006-bodyFloor();root.position.y+=dy>=0?dy:dy*p.floorLock;root.updateMatrixWorld(true);}
    for(let i=0;i<2;i++){
      target.copy(SOLE).applyQuaternion(p.footQ[i]).negate().add(p.feet[i]);pole.set(i?.08:-.08,.04,1);
      ikLimb(legs[i],knees[i],.27,.25,target,pole,1,ankles[i].position);
      knees[i].getWorldQuaternion(parentQ).invert();ankles[i].quaternion.copy(parentQ).multiply(p.footQ[i]);
      ankles[i].quaternion.slerp(identity,smooth((p.feet[i].y-.1)/.35));
      legs[i].quaternion.slerp(p.leg[i],p.legFK);knees[i].quaternion.slerp(p.knee[i],p.legFK);ankles[i].quaternion.slerp(p.ankle[i],p.legFK);
      if(p.handPlant[i]>0){
        fkQ[0].copy(arms[i].quaternion);fkQ[1].copy(elbows[i].quaternion);fkQ[2].copy(wrists[i].quaternion);
        target.copy(PALM).applyQuaternion(p.palmQ[i]).negate().add(p.hands[i]);pole.set(i?1:-1,.12,1.2);
        naturalArm(i,target,pole);
        elbows[i].getWorldQuaternion(parentQ);offset.set(wrists[i].position.x,0,0).applyQuaternion(parentQ);corrected.copy(target).sub(offset);
        naturalArm(i,corrected,pole);
        arms[i].quaternion.slerp(fkQ[0],1-p.handPlant[i]);elbows[i].quaternion.slerp(fkQ[1],1-p.handPlant[i]);
        elbows[i].getWorldQuaternion(parentQ).invert();wrists[i].quaternion.copy(parentQ).multiply(p.palmQ[i]).slerp(fkQ[2],1-p.handPlant[i]);
      }
      if(i===1&&p.headRest>0){
        root.updateMatrixWorld(true);
        fkQ[0].copy(arms[i].quaternion);fkQ[1].copy(elbows[i].quaternion);fkQ[2].copy(wrists[i].quaternion);
        u.headG.getWorldQuaternion(parentQ);const palmQ=parentQ.clone().multiply(q(0,-PI/2,PI)).multiply(q(-.80,0,PI/6));
        target.set(.145,.18,.03);u.headG.localToWorld(target);
        target.sub(offset.copy(PALM).applyQuaternion(palmQ));pole.set(.40,-2,0);
        naturalArm(i,target,pole);
        elbows[i].getWorldQuaternion(parentQ);offset.set(wrists[i].position.x,0,0).applyQuaternion(parentQ);corrected.copy(target).sub(offset);
        naturalArm(i,corrected,pole);
        arms[i].quaternion.slerp(fkQ[0],1-p.headRest);elbows[i].quaternion.slerp(fkQ[1],1-p.headRest);
        elbows[i].getWorldQuaternion(parentQ).invert();wrists[i].quaternion.copy(parentQ).multiply(palmQ).slerp(fkQ[2],1-p.headRest);
        // Let the forearm arrive before the hand cups the cheek. Preserve its
        // axial twist while softly limiting transitional wrist flexion.
        const twist=new THREE.Quaternion(0,wrists[i].quaternion.y,0,wrists[i].quaternion.w).normalize();
        const swing=wrists[i].quaternion.clone().multiply(twist.clone().invert());
        const angle=2*Math.acos(Math.min(1,Math.abs(swing.w))),start=24*PI/180,limit=29*PI/180;
        if(angle>start){const soft=start+(limit-start)*(1-Math.exp(-(angle-start)/(limit-start)));swing.slerp(identity,1-soft/angle);wrists[i].quaternion.copy(swing).multiply(twist);}
      }
      lerpPose(HAND_POSES.open,HAND_POSES.fist,p.curl[i]*(1-p.handPlant[i]),handShapes[i]);
      for(let f=0;f<4;f++)handShapes[i].f[f][3]+=(f-1.5)*.023*(1-p.curl[i]);
      wrists[i].userData.hand?.set(handShapes[i]).update();
    }
    root.updateMatrixWorld(true);for(const a of arms)a.userData.liveShoulder?.bend();for(const l of legs)l.userData.bootShaft?.userData.bend();
    // The airborne tuck remains above the floor until the feet take weight.
    if(p.legFK>0&&plant<1){const lift=floorY+.006-bodyFloor(allMeshes);if(lift>0){root.position.y+=lift*(1-smooth((plant-.8)/.2));root.updateMatrixWorld(true);}}
    const motion=travelAt(b);travel.position.set(motion.x,motion.y,motion.z);travel.rotation.set(0,motion.yaw,0);travel.updateMatrixWorld(true);
    phrase=p.phase;return {beat:b,phrase,hip:root.getWorldPosition(new THREE.Vector3()),
      targets:{hands:p.hands.map(t=>t.clone().applyMatrix4(travel.matrixWorld)),handPlant:p.handPlant,
        feet:p.feet.map(t=>t.clone().applyMatrix4(travel.matrixWorld)),legFK:p.legFK},pose:p};
  }
  sample(0);return {root:travel,bodyRoot:root,marine,sample,duration:DISCLAIMER_DANCE.duration,get phrase(){return phrase;}};
}
