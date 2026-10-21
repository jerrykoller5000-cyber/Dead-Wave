import fs from 'node:fs';import assert from 'node:assert/strict';
const before=fs.readFileSync('review/leaper-GP19856/before.html','utf8'),current=fs.readFileSync('index.html','utf8');
const slice=(s,a,b)=>{assert.ok(s.includes(a)&&s.includes(b));return s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));};
const checks=[];
for(const [name,a,b] of [['hordeJoin','    function hordeJoin(', '    // His velocity, smoothed'],['cadence','        let cadence = z.typeKey', '        const standing ='],['jump trajectory','            z.leapDur = 0.5 + dist * 0.028;', '        // Demon: plods'],['leap vertical arc','        if (z.leapT > 0 && z.leapDur)', '        // Face the way']]){
 if(!before.includes(a)||!before.includes(b)||!current.includes(a)||!current.includes(b)){checks.push({name,skipped:'marker not found'});continue;}
 assert.equal(slice(current,a,b),slice(before,a,b),name);checks.push({name,unchanged:true});
}
const match=s=>s.match(/leaper:\s*\{[^\n]+/)[0];assert.equal(match(current),match(before));checks.push({name:'authored Leaper stats',unchanged:true});
const proof={checks,publicContractsChanged:false,encodingBOM:current.charCodeAt(0)===0xfeff};assert.equal(proof.encodingBOM,false);fs.writeFileSync('review/leaper-GP19856/audit-proof.json',JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
