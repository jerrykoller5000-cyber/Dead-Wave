// GB-251: node --check of index.html's big inline script + 4-line duplicate-block scan, against a reference copy.
import fs from 'fs'; import { execFileSync } from 'child_process';
function big(p){const s=fs.readFileSync(p,'utf8');const m=[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];let b='';for(const x of m) if(x[1].length>b.length)b=x[1];return b;}
function scan(best){const lines=best.split('\n').map(l=>l.trim()).filter(l=>l.length>0&&!l.startsWith('//'));const seen=new Map();let dup=0;for(let i=0;i+3<lines.length;i++){const k=lines.slice(i,i+4).join('\u0001');if(k.length<60)continue;if(seen.has(k))dup++;else seen.set(k,1);}return {lines:lines.length,dup};}
const [cur,ref,tmp]=process.argv.slice(2);
const raw=fs.readFileSync(cur); if(raw[0]===0xef&&raw[1]===0xbb) { console.log('BOM'); process.exit(1); }
const a=big(ref),b=big(cur); fs.writeFileSync(tmp,b);
execFileSync(process.execPath,['--check',tmp],{stdio:'inherit'});
const sa=scan(a),sb=scan(b); console.log('check ok; dup before',JSON.stringify(sa),'after',JSON.stringify(sb));
if(sb.dup>sa.dup){console.log('NEW DUPLICATE BLOCKS');process.exit(1);}
