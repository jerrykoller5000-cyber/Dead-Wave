import fs from 'node:fs';import crypto from 'node:crypto';const p='index.html',before=fs.readFileSync(p,'utf8');let s=before;
const change=(a,b)=>{if(s.split(a).length!==2)throw Error('pole anchor '+a);s=s.replace(a,b);};
change('    function aimDiveGrip(anchor,arm,target){',`    const _diveDualPoleR=new THREE.Vector3(.32,-.7,-.25),_diveDualPoleL=new THREE.Vector3(-.32,-.7,-.25),_divePoleBlend=new THREE.Vector3();
    function diveDualPole(base,left=false){
      if(!diving())return base;
      // Standing akimbo aims the elbows by the collar; a flat body needs them toward its feet.
      return _divePoleBlend.copy(base).lerp(left?_diveDualPoleL:_diveDualPoleR,diveFlatW);
    }
    function aimDiveGrip(anchor,arm,target){`);
change('1, aki ? _akPoleR : _POLE_R, k, 1);','1, aki ? diveDualPole(_akPoleR) : _POLE_R, k, 1);');
change('1, _akPoleL, k, 1);','1, diveDualPole(_akPoleL,true), k, 1);');
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');if(hash(fs.readFileSync(p,'utf8'))!==hash(before))throw Error('concurrent change');fs.writeFileSync(p,s);console.log('PASS flat-body akimbo elbow poles, blended on existing dive weight');
