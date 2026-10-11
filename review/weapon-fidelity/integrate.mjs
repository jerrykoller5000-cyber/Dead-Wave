// GP-164: one-time, guarded insertion of reviewed weapon constructors.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const p='index.html',s=fs.readFileSync(p,'utf8');let out=s;
const base=JSON.parse(fs.readFileSync('review/weapon-fidelity/baseline-constructors.json','utf8'));
const extract=(n)=>{const m=s.match(new RegExp('    function '+n+'\\([^]*?\\n    \\}'));assert(m,n);return m[0];};
const groups={sidearms:['Pistol','Revolver','Uzi','Knife'],longarms:['M4','Ak','Aa12','Shotgun','Sniper'],heavy:['Minigun','Launcher','Flamer','Chainsaw','Mortar','M240']};
for(const names of Object.values(groups))for(const n of names){
 const original='make'+n+(['Mortar','M240'].includes(n)?'Mesh':'');
 assert.equal(extract(original),base[original],original+' changed since baseline; re-read and merge');
 const sig=n==='Mortar'?'matOverride = null, collapsed = false':n==='M240'?'folded = false':'';
 const ctx=n==='Knife'?'{ ...weaponModelContext(), edgeMat, gloveMat }':n==='M240'?'{ ...weaponModelContext(), M240_PIVOT }':'weaponModelContext()';
 const args=n==='Mortar'?', matOverride, collapsed':n==='M240'?', folded':'';
 out=out.replace(extract(original),`    function ${original}(${sig}) {\r\n      return make${n}Model(${ctx}${args});\r\n    }`);
}
const imports=Object.entries(groups).map(([file,names])=>`    import { ${names.map(n=>'make'+n+'Model').join(', ')} } from './studio/weapon-${file}.js';`).join('\r\n');
const at="    import { applyMarineSurfaceDetail } from './studio/marine-detail.js';";assert(out.includes(at));out=out.replace(at,at+'\r\n'+imports);
const context=`    // GP-164: cosmetic builders share the existing materials and geometry/animation helpers.
    // Later-initialized blade materials and the M240 pivot are passed only by their wrappers.
    function weaponModelContext() {
      return { THREE, gunKit, gunBand, gripOutline, gunArc, gunEffects, gunSuppressor, finishGun,
        mergeRigidMeshes, profileCurve, layoutChainsawChain,
        gunMetal, gunBody, gunDark, gunMid, gunAccent, woodMat, bladeMat, gunPoly, gunRubber,
        woodDark, steelMat, brassMat, gunOlive, gunTan, magPoly, glassMat, sightDotMat,
        shellRedMat, fuelRedMat, hazardYellow, gaugeFace };
    }

`.replaceAll('\n','\r\n');
out=out.replace('    function makeMinigun() {',context+'    function makeMinigun() {');
assert.equal(fs.readFileSync(p,'utf8'),s,'index changed underneath integration');
fs.writeFileSync(p,out,'utf8');
fs.writeFileSync('review/weapon-fidelity/integration.json',JSON.stringify({at:new Date().toISOString(),before:createHash('sha256').update(s).digest('hex'),after:createHash('sha256').update(out).digest('hex'),builders:Object.keys(base)},null,2)+'\n');
console.log('Integrated 15 cosmetic constructors; all other current index content preserved.');
