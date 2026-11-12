import fs from 'node:fs';import crypto from 'node:crypto';
const paths=['index.html','game/viewmodel.js','game/viewmodel-fit.js','game/viewmodel-poses.js','studio/weapon-sidearms.js','studio/weapon-longarms.js','studio/weapon-heavy.js','studio/weapon-detail.js','studio/weapon-casings.js','studio/marine-hand.js','studio/hand-contacts.js','studio/fp-arms.js',...['tcb301','tce4','tce4b','tce6','tce7','tcl293','tcl301','tcl334','tcl334b','tcl334c','tcl334d','tgb255b','t333'].map(n=>'tools/tests/'+n+'.js')];
const hashes=Object.fromEntries(paths.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const name=process.argv[2];if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid snapshot label');
fs.writeFileSync(new URL(name+'.json',import.meta.url),JSON.stringify({utc:new Date().toISOString(),hashes},null,2)+'\n',{flag:'wx'});
console.log('Saved',name,paths.length,'source/test hashes');
