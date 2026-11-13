// Director's precise index adapter loan; fresh read/hash guard and byte-exact reverse proof.
import fs from 'node:fs';import crypto from 'node:crypto';
const p='index.html',original=fs.readFileSync(p,'utf8'),md5=s=>crypto.createHash('md5').update(s).digest('hex'),edits=[];
const nl=original.includes('\r\n')?'\r\n':'\n';let next=original;
function edit(from,to){from=from.replaceAll('\n',nl);to=to.replaceAll('\n',nl);if(next.split(from).length!==2)throw Error('Nonunique adapter anchor: '+from.slice(0,80));next=next.replace(from,to);edits.push({from,to});}
edit("import { makeM4Model, makeAkModel, makeAa12Model, makeShotgunModel, makeSniperModel } from './studio/weapon-longarms.js';","import { makeM4Model, makeAkModel, makeAa12Model, makeShotgunModel, makeSniperModel, setKr7Furniture } from './studio/weapon-longarms.js';");
edit('    function dressGuns(state, onlyKind = null) {\n      if (!gunFurniture) return;','    function dressGuns(state, onlyKind = null) {\n      if (!gunFurniture) return;\n      if (!onlyKind || onlyKind === \'ak\') setKr7Furniture(weaponMeshes.ak, state?.furniture?.ak);   // GP-20129: saved or Training-only furniture');
edit('      const g = cloneLean(src);   // CL-136','      const g = cloneLean(src);   // CL-136\n      if (kind === \'ak\') setKr7Furniture(g, wardrobeState?.furniture?.ak);   // GP-20129: rack/carry/preview copies');
edit(" + '|' + fin;\n    }\n    function armoryPicsReady()", " + '|' + fin + (kind === 'ak' ? '|f:' + (wardrobeState?.furniture?.ak || 'wood') : '');\n    }\n    function armoryPicsReady()");
edit('    const withArmoryBuy = (fn) => { armoryBuying = true;',`    // GP-20129: Director-approved factory furniture adapter; Training never writes the profile.
    function armoryFurniture(kind) {
      if (kind !== 'ak') return null;
      return { current: wardrobeState?.furniture?.ak || 'wood', list: ['wood', 'synthetic'].map(key => ({ key, name: dwText('armory.furniture.' + key) })) };
    }
    function setArmoryFurniture(kind, key) {
      if (kind !== 'ak' || !['wood', 'synthetic'].includes(key) || phase !== 'prep' || nightLockdown() || !weaponOwned.ak) return false;
      wardrobeState = normalizeWardrobe({ ...wardrobeState, furniture: { ak: key } }, camoKey, isGunFinishKey);
      writeWardrobe();
      dressGuns(wardrobeState, 'ak');
      updateCarriedGear(0, true);
      queueOrRefreshArmoryRack(false);
      AudioSys.kioskTab();
      return true;
    }
    const withArmoryBuy = (fn) => { armoryBuying = true;`);
edit('      armory: runArmory,\n      getFinishes:', '      armory: runArmory,\n      getFurniture: armoryFurniture,\n      onFurniture: setArmoryFurniture,\n      getFinishes:');
let reversed=next;for(const {from,to}of edits.slice().reverse()){if(reversed.split(to).length!==2)throw Error('Reverse ambiguous');reversed=reversed.replace(to,from);}if(reversed!==original)throw Error('Outside-loan bytes changed');
fs.writeFileSync('review/GP-20129/furniture-adapter-patch.json',JSON.stringify({before:md5(original),after:md5(next),edits},null,2)+'\n');
if(md5(fs.readFileSync(p,'utf8'))!==md5(original))throw Error('File changed during preparation; merge against newest file');
fs.writeFileSync('review/GP-20129/furniture-index.tmp',next,'utf8');if(md5(fs.readFileSync(p,'utf8'))!==md5(original))throw Error('File changed before atomic save');
fs.renameSync('review/GP-20129/furniture-index.tmp',p);
console.log(JSON.stringify({before:md5(original),after:md5(next),edits:edits.length,outsideLoanBytes:'unchanged (reverse verified)'}));
