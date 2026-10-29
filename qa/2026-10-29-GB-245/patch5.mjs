import fs from 'node:fs'; import crypto from 'node:crypto';
const FILE='index.html'; const buf=fs.readFileSync(FILE);
const got=crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const a=`    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1, hip: 1 };`;
const b=`    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1, hip: 0 };   // GB-245: hip is a door, off: the shoulder reload is the one that can keep the grip in view`;
const s=buf.toString('utf8'); const c=s.split(a).length-1;
console.log('anchor x'+c+'  sha '+got);
if(c!==1) process.exit(1);
const now=crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase(); if(now!==got){console.error('changed');process.exit(1);}
fs.writeFileSync(FILE, s.replace(a,()=>b),'utf8');
console.log('wrote '+crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase());