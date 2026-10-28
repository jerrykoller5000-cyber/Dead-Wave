const fs=require('fs');const t=fs.readFileSync('index.html','utf8');const re=/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g;let m,i=0;
while((m=re.exec(t))){i++;fs.writeFileSync(`qa/2026-10-27-GB-232-places/s${i}.mjs`,m[1]);}console.log('scripts',i);
console.log('survivorPlace defs',(t.match(/function survivorPlace\(/g)||[]).length,'placeSurvivor defs',(t.match(/function placeSurvivor\(/g)||[]).length,'cellar skip',(t.match(/the cellar under the yard/g)||[]).length);
