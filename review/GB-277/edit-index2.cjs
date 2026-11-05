const fs=require('fs');const p='index.html';let t=fs.readFileSync(p,'utf8');const m0=fs.statSync(p).mtimeMs;
const c=(s)=>s.replace(/\r?\n/g,'\r\n');
function rep(a,b){a=c(a);b=c(b);const i=t.indexOf(a);if(i<0)throw new Error('missing '+a.slice(0,50));if(t.indexOf(a,i+1)>=0)throw new Error('dup');t=t.slice(0,i)+b+t.slice(i+a.length);}
rep(`import { parseBruteGetUp, createBruteGetUp } from './combat/brute-getup.js';`,`import { fetchBruteGetUp, createBruteGetUp } from './combat/brute-getup.js';`);
rep(`    fetch(new URL('./studio/motion/zombie/brute.json', import.meta.url)).then((r) => { if (!r.ok) throw new Error('brute.json ' + r.status); return r.json(); })
      .then((j) => { BRUTE_GETUP = parseBruteGetUp(j); }).catch((e) => console.warn('brute get-up:', e && e.message || e));`,`    fetchBruteGetUp().then((g) => { BRUTE_GETUP = g; }).catch((e) => console.warn('brute get-up:', e && e.message || e));`);
if(fs.statSync(p).mtimeMs!==m0)throw new Error('changed underneath');fs.writeFileSync(p,t,'utf8');console.log('ok');