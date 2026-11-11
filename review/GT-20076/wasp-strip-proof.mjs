import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

export function checkWaspStrips(ctx){
  const strips=[];
  makeUziModel({...ctx,finishGun:g=>g,gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,box(...args){
      const m=k.box(...args);
      if(args[0]===.003 && args[1]===.18 && args[2]===.006)strips.push({m,source:m.geometry});
      return m;
    }};
  }});
  if(strips.length!==2)throw Error('Expected both side strips');
  return strips.map(({m,source})=>{
    const side=Math.sign(m.position.x),a=source.attributes,b=m.geometry.attributes;
    if(source===m.geometry||!source.userData.shared||m.geometry.userData.shared)throw Error('Shared geometry changed');
    let outside=0,hidden=0,min=Infinity;
    for(let i=0;i<a.position.count;i++){
      const before=side*(m.position.x+a.position.getX(i)),after=side*(m.position.x+b.position.getX(i));
      min=Math.min(min,after);
      if(before>=.018){
        if(Math.abs(before-after)>1e-9)throw Error('Visible surface changed');
        outside++;
      }else hidden++;
      for(const [name,offset] of [['position',1],['normal',0],['uv',0]]){
        for(let j=offset;j<a[name].itemSize;j++)if(a[name].array[i*a[name].itemSize+j]!==b[name].array[i*b[name].itemSize+j])throw Error('Surface sample changed');
      }
    }
    const chunks=visiblePieces(m);
    if(Math.abs(min-.018)>1e-7||!outside||!hidden||chunks.length!==1||!chunks[0].closed)throw Error('Open or unseated strip');
    return {side,outside,hidden,min,closed:true};
  });
}
