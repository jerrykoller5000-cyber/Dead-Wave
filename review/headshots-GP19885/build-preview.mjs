import fs from 'node:fs';
export function headshotPatch(s){const nl=s.includes('\r\n')?'\r\n':'\n';const add=(a,b,n=1)=>{if(s.split(a).length!==n+1)throw Error('anchor mismatch '+a.slice(0,70));s=s.split(a).join(b);};
add("    import { prepareBomberAppearance", "    import { confirmedHead, canSeverHead, headSurface, zombieSurface } from './game/zombie-headshots.js'; // GP-19885"+nl+"    import { prepareBomberAppearance");
const at=s.indexOf('    function rayPickZombie(ray, maxT, out) {'),end=s.indexOf('    // --- Shot line-of-sight',at);if(at<0||end<0)throw Error('ray pick bounds');
const code=`    // GP-19885: use retained rigid bone surfaces, as Military/Brute already do.
    function zombieRoundHit(z,a,b) {
      const p=z.mesh.position,H=z.hitH||1.45,extra=z.mesh.userData.bossRig?4:1.5;
      if(segmentHitsCylinder(a.x,a.y,a.z,b.x,b.y,b.z,p.x,p.z,z.radius+extra,p.y-.5,p.y+H+2)===null)return null;
      if(z.typeKey==='military'||z.typeKey==='brute'){
        const m=z.typeKey==='military'?militaryProjectileHit(THREE,z,a,b):null;
        const h=z.typeKey==='brute'?bruteProjectileHit(THREE,z,a,b):null;
        const hit=m||h;if(!hit)return null;const head=(m?.part==='head'||h?.part==='head')?headSurface(THREE,z,a,b):null;
        const t=hit.t;return {t,headHit:!!head?.headHit,militaryHit:m,bruteHit:h,point:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t}};
      }
      return zombieSurface(THREE,z,a,b);
    }
    function rayPickZombie(ray, maxT, out) {
      const o=ray.origin,d=ray.direction,a=d.x*d.x+d.z*d.z;let best=Infinity;
      rayPick.z=null;rayPick.head=false;
      for(const z of zombies){
        if(!z.alive||!z.mesh)continue;const p=z.mesh.position,ox=o.x-p.x,oz=o.z-p.z,tc=a>1e-8?-(ox*d.x+oz*d.z)/a:0;
        const extra=z.mesh.userData.bossRig?4:1.5;
        if(Math.hypot(ox+d.x*tc,oz+d.z*tc)>z.radius+extra||tc>maxT+4)continue;
        const far=Math.min(maxT,200,best+1);_brutePickEnd.copy(d).multiplyScalar(far).add(o);
        const hit=zombieRoundHit(z,o,_brutePickEnd),distance=hit?hit.t*far:Infinity;
        if(distance>.3&&distance<best){best=distance;rayPick.z=z;rayPick.head=confirmedHead(z,{headHit:hit.headHit,militaryZone:hit.militaryHit?.zone,brutePart:hit.bruteHit?.part});out.set(hit.point.x,hit.point.y,hit.point.z);}
      }
      return best;
    }

`;s=s.slice(0,at)+code.replaceAll('\n',nl)+s.slice(end);
const oldAim=s.indexOf('    // CU-96 (Jerry): what the cursor is on'),oldAimEnd=s.indexOf('    // How fast each zombie',oldAim);if(oldAim<0||oldAimEnd<0)throw Error('aim comment bounds');
s=s.slice(0,oldAim)+'    // GP-19885: cursor and rounds use the actual posed body surfaces. A head bonus'+nl+'    // requires the central skull, with Military face/helmet and Brute armor classification.'+nl+s.slice(oldAimEnd);
add("    function damageZombie(z, amount, info = null) {"+nl+"      if (!z.alive) return;", "    function damageZombie(z, amount, info = null) {"+nl+"      if (!z.alive) return;"+nl+"      const preciseHead = confirmedHead(z,info); // GP-19885: height alone never counts");
add("        const shieldHead=(kind==='bullet'||kind==='pellet')&&info?.hitY!=null&&(info.hitY-z.mesh.position.y)/(z.hitH||1.4)>headLineOf(z)&&!(shieldSid&&z._shotHead===shieldSid);", "        const shieldHead=(kind==='bullet'||kind==='pellet')&&preciseHead&&!(shieldSid&&z._shotHead===shieldSid);");
add("      const upperHit = info?.brutePart ? info.brutePart === 'head' : militaryZone ? militaryZone === 'face' : hitFrac > 0.62;", "      const upperHit = preciseHead; // GP-19885: shoulder hits cannot roll a head sever");
add("      const headshot = (kind === 'bullet' || kind === 'pellet') && (info?.brutePart ? info.brutePart === 'head' : militaryZone ? militaryZone === 'face' : hitFrac > headLineOf(z)) && !(z.partsLost && z.partsLost.head) && info && info.hitY != null && !(sid && z._shotHead === sid);", "      const headshot = (kind === 'bullet' || kind === 'pellet') && preciseHead && !(sid && z._shotHead === sid);");
add("        if (z.hp <= 0 || Math.random() < 0.5) {", "        if (z.hp <= 0 || (canSeverHead(z,preciseHead) && Math.random() < 0.18)) { // GP-19885: no healthy-enemy coin-flip decap");
add("        z.hitPart = hitFrac > headLineOf(z) ? 'head' : hitFrac < 0.42", "        z.hitPart = preciseHead ? 'head' : hitFrac < 0.42");
add("        const a = keys.filter((k) => !z.partsLost[k]);", "        const a = keys.filter((k) => !z.partsLost[k] && (k!=='head' || (kind!=='bullet'&&kind!=='pellet') || canSeverHead(z,upperHit))); // GP-19885");
const start="            let t = segmentHitsCylinder(",finish="            let bruteHit=null;if(t!==null && z.typeKey==='brute'){bruteHit=bruteProjectileHit(THREE,z,p.prev,p.pos);t=bruteHit?.t??null;}";
for(let n=0;n<2;n++){const x=s.indexOf(start,s.indexOf('        let hitZ = null, hitZT')),y=s.indexOf(finish,x);if(x<0||y<0)throw Error('projectile bounds');s=s.slice(0,x)+("            const located=zombieRoundHit(z,p.prev,p.pos);"+nl+"            const t=located?.t??null,militaryHit=located?.militaryHit,bruteHit=located?.bruteHit,headHit=!!located?.headHit;")+s.slice(y+finish.length);}
add("_pierceHits.push({ z, t, militaryHit, bruteHit });", "_pierceHits.push({ z, t, militaryHit, bruteHit, headHit });");
add("hitY: hy, militaryZone:h.militaryHit", "hitY: hy, headHit:h.headHit, militaryZone:h.militaryHit");
add("z._bruteRound=bruteHit;", "z._bruteRound=bruteHit;z._headRound=headHit;");
add("hitY: hy, militaryZone:hitZ._militaryRound", "hitY: hy, headHit:hitZ._headRound, militaryZone:hitZ._militaryRound");
add("        const t = segmentHitsCylinder(_trA.x, _trA.y, _trA.z, _trB.x, _trB.y, _trB.z, z.mesh.position.x, z.mesh.position.z, z.radius + 0.1, zy, zy + (z.hitH || 1.45));", "        const t = zombieRoundHit(z,_trA,_trB)?.t ?? null; // GP-19885: same surface ordering as live bullets");
const correctionStart=s.indexOf('      // A round enters the column');
if(correctionStart<0)throw Error('aim correction bounds');
const correctionEnd=s.indexOf('        aimHit.copy(_pickAim);',correctionStart);
if(correctionEnd<0)throw Error('aim correction end');
s=s.slice(0,correctionStart)+'      // GP-19885: aim at the actual surface; no cylinder-axis elevation correction.'+nl+s.slice(correctionEnd);
return s;}
if(process.argv[1]?.endsWith('build-preview.mjs')){const s=fs.readFileSync('index.html','utf8');fs.writeFileSync('review/headshots-GP19885/preview.html',headshotPatch(s).replace('<head>','<head><base href="/">'),'utf8');console.log('Headshot candidate built.');}
