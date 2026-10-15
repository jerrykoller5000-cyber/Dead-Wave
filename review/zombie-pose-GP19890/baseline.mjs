import fs from 'node:fs';const dir='review/zombie-pose-GP19890';
let index=fs.readFileSync(dir+'/index.html.before.txt','utf8');index=index.replace('<head>','<head><base href="/">');
for(const type of ['screamer','bomber']){const source=fs.readFileSync(dir+'/game-'+type+'-behavior.js.before.txt','utf8').replaceAll("from './","from '/game/");fs.writeFileSync(dir+'/baseline-'+type+'.js',source);index=index.replace("from './game/"+type+"-behavior.js'","from './"+dir+"/baseline-"+type+".js'");}
fs.writeFileSync(dir+'/baseline.html',index);console.log('Private historical baseline only; production never restored');
