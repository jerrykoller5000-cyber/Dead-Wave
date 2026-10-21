import fs from 'node:fs';import path from 'node:path';import{Engine}from'../../tools/camera.mjs';
const phase=process.argv[2]||'before',out=path.resolve('review/demon-GP19921',phase);fs.mkdirSync(out,{recursive:true});
const E=new Engine({inspect:true,warm:'none',size:'1440x1000'});
try{await E.open();const info=await E.ev(`return await DWInspect.show('zombie.demon',{mode:'statue'});`);console.log(JSON.stringify(info));
for(const view of ['three','front','left','back']){await E.run({cmd:'shot',target:'zombie.demon:statue',view,out:path.join(out,view+'.png')});const data=await E.ev('return DWInspect.shot();');fs.writeFileSync(path.join(out,view+'.png'),Buffer.from(data.split(',')[1],'base64'));}
const live=await E.ev(`const info=await DWInspect.show('zombie.demon',{mode:'walk'});await wait(500);return {info,keys:Object.keys(T).filter(k=>/zombie|actor/i.test(k)),errors:DWInspect.errors()};`);console.log(JSON.stringify(live));fs.writeFileSync(path.join(out,'info.json'),JSON.stringify({load:E.loadSec,info,live},null,2));
}finally{await E.close();}
