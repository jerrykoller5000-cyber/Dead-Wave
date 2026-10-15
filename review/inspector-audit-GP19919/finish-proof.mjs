import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=path.resolve('.'), base='review/inspector-audit-GP19919';
const sources=['Open Marine Inspector.bat','index.html','studio/notes-endpoint.mjs',
 ...fs.readdirSync('studio/inspector').filter(f=>/\.(js|css|md)$/.test(f)).map(f=>'studio/inspector/'+f),
 'tools/inspector-launch.mjs','tools/serve.mjs','tools/camera.mjs','tools/camera-rig.js','tools/cdp.mjs','tools/CAMERA.md','tools/tests/fakethree.mjs'];
const files=sources.map(file=>{const b=fs.readFileSync(file);if(b[0]===239&&b[1]===187&&b[2]===191)throw Error('Unexpected UTF-8 BOM: '+file);return{file,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};});
const native=JSON.parse(fs.readFileSync(base+'/native/checks.json','utf8')),focused=JSON.parse(fs.readFileSync(base+'/focused.json','utf8'));
if(native.results.some(r=>!r.ok)||focused.results.some(r=>r.exit!==0))throw Error('Final focused or native checks have failures');
const suite=JSON.parse(fs.readFileSync(base+'/suite-final.json','utf8'));
const focusedCases=focused.results.reduce((sum,r)=>{const line=(r.proof||[]).find(p=>p.startsWith('# tests ')||p.startsWith('RESULT '));return sum+(line?Number(line.match(/\d+/)[0]):0);},0);
const manifest={at:new Date().toISOString(),root,task:'GP-19919',sources:files,
 verification:{focused:base+'/focused.json',native:base+'/native/checks.json',performance:base+'/runtime/performance-bounds.json',capture:base+'/capture/checks.json',uiCapture:base+'/automation/ui-frame-probe.json',inbox:base+'/automation/inbox-live.json',suite:base+'/suite-final.json'},
 summary:{focusedCases,nativeProbes:native.results.length,variants:native.results.find(r=>r.name==='all-catalog-variants').cases,loadSec:native.loadSec,fps:native.results.find(r=>r.name==='frame-rate').fps,gameSuite:{files:Object.keys(suite.files).length,pass:suite.pass,fail:suite.fail,cannotRun:suite.cannotRun}},
 limitations:['Broader game suite failures are not all classified against a fresh equivalent baseline.','Independent Antigravity eyes and lead contract/integration review are pending.','Models and transforms built successfully do not certify all animation anatomy or scene contacts.']};
fs.writeFileSync(base+'/manifest.json',JSON.stringify(manifest,null,2)+'\n','utf8');console.log(JSON.stringify(manifest.summary));
