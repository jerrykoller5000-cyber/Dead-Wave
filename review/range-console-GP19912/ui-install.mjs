import fs from 'node:fs';
const dir='review/range-console-GP19912';
const p='ui/strings.js',s=fs.readFileSync(p,'utf8'),keys=JSON.parse(fs.readFileSync(dir+'/copy.json','utf8'));
for(const k of Object.keys(keys))if(s.includes(JSON.stringify(k)+':'))throw Error('duplicate copy '+k);
const a='  "range.points":';if(s.split(a).length!==2)throw Error('copy anchor');
const n=s.replace(a,Object.entries(keys).map(([k,v])=>'  '+JSON.stringify(k)+': '+JSON.stringify(v)+',').join('\n')+'\n'+a);
if(fs.readFileSync(p,'utf8')!==s)throw Error('copy changed');fs.writeFileSync(dir+'/strings.before.js',s);fs.writeFileSync(p,n);
const c='ui/range-console.js',old=fs.readFileSync(c,'utf8'),next=fs.readFileSync(dir+'/console.js','utf8').replace("if(mode==='selection')render();else if(view?.result)this;","if(mode==='selection')render();");
if(fs.readFileSync(c,'utf8')!==old)throw Error('console changed');fs.writeFileSync(dir+'/range-console.before.js',old);fs.writeFileSync(c,next);
