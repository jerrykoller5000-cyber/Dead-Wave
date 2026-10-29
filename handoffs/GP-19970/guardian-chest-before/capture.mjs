import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,statSync,readFileSync,writeFileSync} from 'node:fs';

const root='handoffs/GP-19970/guardian-chest-before';
const owner=['--agent','chatgpt','--task','GP-19970'];
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function camera(...args) {
  const r=spawnSync(process.execPath,['tools/camera.mjs',...args,...owner],{stdio:'inherit'});
  if(r.error)throw r.error;
  if(r.status!==0)throw new Error(`camera ${args[0]} exited ${r.status}`);
}
mkdirSync(root,{recursive:true});
const valid=out=>existsSync(out)&&statSync(out).size>100_000;
const blank=[];
camera('start','--inspect');
try {
  for(const kind of ['guardian','caveguard']) {
    camera('check',`zombie.${kind}`,'--out',`${root}/check-${kind}`);
    for(const view of ['noon-close-side','overcast-close-side','dusk-close-side','night-close-side','noon-gameplay','noon-walk-side']) {
      const out=`${root}/${kind}-${view}.png`;
      if(valid(out)&&kind==='guardian')continue;
      const light=view.split('-')[0];
      const reference=JSON.parse(readFileSync(`handoffs/GP-19970/eyes-after-four-lights/${light}/${kind==='guardian'?'guardian':'cave-guardian-wet'}.json`,'utf8'));
      const gameplay=view==='noon-gameplay',walk=view==='noon-walk-side';
      const cx=-26,cy=gameplay?reference.inspect.camera.ty:-197.4,cz=-632;
      reference.target=`zombie.${kind}:${walk?'walk':'statue'}`;
      reference.inspect.subject={id:`zombie.${kind}`,variant:null,mode:walk?'walk':'statue'};
      reference.inspect.display.light=light;
      reference.cam={x:cx+(gameplay?12:walk?7:4.5),y:cy+.15,z:cz,tx:cx,ty:cy,tz:cz,fov:35};
      reference.inspect.camera={...reference.cam};
      reference.time=.5;reference.size=[1600,900];
      const recipe=`${root}/${kind}-${view}.recipe.json`;
      writeFileSync(recipe,JSON.stringify(reference,null,2)+'\n','utf8');
      for(let attempt=1;attempt<=8;attempt++) {
        await pause(500);
        camera('shot','--from',recipe,'--out',out,'--wait',walk?'500':'300');
        if(valid(out))break;
      }
      if(!valid(out))blank.push(`${kind}-${view}`);
    }
  }
} finally {
  camera('stop');
}
if(blank.length)throw new Error(`blank frames: ${blank.join(', ')}`);
