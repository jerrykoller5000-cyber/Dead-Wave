import fs from 'node:fs';
const dir='review/range-GP19901';
for(const name of ['verify','finish','capture']){
 let t=fs.readFileSync(dir+'/'+name+'.mjs','utf8');
 t=t.replace("from './camera.mjs'","from '../../tools/camera.mjs'");
 const proof=name==='verify'?'native':name;
 t=t.replaceAll('/'+proof+'-proof.json','/live-'+proof+'-proof.json');
 for(const [a,b] of [['results','live-results'],['disqualified','live-disqualified'],['station-after','live-station'],['console-prop','live-console-prop'],['console-final','live-console']])t=t.replaceAll('/'+a+'.png','/'+b+'.png');
 fs.writeFileSync(dir+'/live-'+name+'.mjs',t,'utf8');
 console.log('Prepared live-'+name+'.mjs using actual tools/camera.mjs');
}
