import fs from 'node:fs';
const p='ui/range-session.js',s=fs.readFileSync(p,'utf8');let n=s;
const edits=[
 ["let serial=0;","let serial=0;"],
 [" let phase='gap',gap=0,exposed=0,drain=null,shot=0,stats={}"," let drawn=false,reloadStarted=false,reloadComplete=false,firstShot=null;\n const expectedWeapon=()=>plan?.weapon||d?.weaponCycle?.[0]||d?.weapon;\n let phase='gap',gap=0,exposed=0,drain=null,shot=0,stats={}"],
 ["contactSeconds:0,cleared:0,missed:0","contactSeconds:0,cleared:0,missed:0,draws:0,reloads:0"],
 ["time:elapsed,efficiency:efficiency()","time:elapsed,firstShot,efficiency:efficiency()"],
 ["phase='gap';gap=0;drain=null;shot=0;stats=zero();","phase='gap';gap=0;drain=null;shot=0;drawn=false;reloadStarted=false;reloadComplete=false;firstShot=null;stats=zero();"],
 ["if(weapon!==d.weapon)","if(weapon!==expectedWeapon())"],
 ["  return state!=='ACTIVE'||d.budget==null||stats.units+units<=d.budget+.000001;","  if(state==='ACTIVE'&&(d.startHolstered&&!drawn||d.requireReload&&!reloadComplete))return false;\n  return state!=='ACTIVE'||d.budget==null||stats.units+units<=d.budget+.000001;"],
 ["   stats.shots++;stats.units+=units;","   if(firstShot==null)firstShot=elapsed;\n   stats.shots++;stats.units+=units;"],
 ["t.weapon===d.weapon&&t.activation===activation","t.weapon===expectedWeapon()&&t.activation===activation"],
 ["signature}={}){","signature,weapon,holstered,reloading,loaded}={}){"],
 ["  dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.25));","  dt=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.25));\n  if(state==='COUNTDOWN'&&d.startHolstered&&holstered===false){finish('DISQUALIFIED','early-draw');return;}\n  if(state==='ACTIVE'){\n   if(d.startHolstered&&!drawn&&holstered===false&&weapon===expectedWeapon()){drawn=true;stats.draws++;}\n   if(d.requireReload&&!reloadComplete&&weapon===expectedWeapon()){\n    if(reloading===true)reloadStarted=true;\n    else if(reloading===false&&reloadStarted&&loaded>0){reloadComplete=true;stats.reloads++;}\n   }\n  }"],
 ["phase,score:d?score():0","phase,expectedWeapon:expectedWeapon(),action:d?.startHolstered&&!drawn?'draw':d?.requireReload&&!reloadComplete?'reload':'shoot',firstShot,score:d?score():0"]
];
for(const[a,b]of edits){if(n.split(a).length!==2)throw Error('session anchor '+a);n=n.replace(a,b);}
if(fs.readFileSync(p,'utf8')!==s)throw Error('session changed');fs.writeFileSync('review/range-console-GP19912/range-session.before.js',s);fs.writeFileSync(p,n);
