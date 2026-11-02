import fs from 'node:fs';
import vm from 'node:vm';
const h=fs.readFileSync('index.html','utf8');
const scripts=[...h.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
if(!scripts.length) throw new Error('no inline module');
for(const m of scripts) new vm.SourceTextModule(m[1]);
console.log(`inline module parse PASS (${scripts.length} module${scripts.length===1?'':'s'})`);
