import fs from 'node:fs';
let t = fs.readFileSync('qa/2026-11-07-GB-314/studio-uzi.html','utf8');
t = t.replace('GB-309','GB-314').replace('makeRevolverModel','makeUziModel').replace('revolver','uzi');
// ensure import is makeUziModel
t = t.replace(/import \{ make\w+Model \}/, "import { makeUziModel }");
t = t.replace(/make\w+Model\(weaponModelContext/, 'makeUziModel(weaponModelContext');
fs.writeFileSync('qa/2026-11-07-GB-314/studio-uzi.html', t);
console.log('ok', /makeUziModel/.test(t));