import fs from 'node:fs';
// Run unchanged assertions/harness against the saved pre-GP198 HTML. Redirect only
// source location, local tool imports and the result file; never replace the live index.
let text=fs.readFileSync('tools/tests/run-all.mjs','utf8').replace(/\r\n/g,'\n');
text=text.replace("from '../serve.mjs'","from '../../tools/serve.mjs'").replace("from '../cdp.mjs'","from '../../tools/cdp.mjs'");
text=text.replace("const HERE = path.dirname(fileURLToPath(import.meta.url));\nconst ROOT = path.resolve(HERE, '..', '..');", "const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');\nconst HERE = path.join(ROOT, 'tools', 'tests');");
text=text.replace("fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')", "fs.readFileSync(path.join(ROOT, 'review/feral-GP198/before.html'), 'utf8').replace('<base href=\"/\">', '')");
text=text.replace("path.join(ROOT, 'crew', 'tests.json')", "path.join(ROOT, 'review', 'feral-GP198', 'baseline-tests.json')");
fs.writeFileSync('review/feral-GP198/baseline-check.mjs',text);
console.log('Prepared baseline harness with original assertions, saved pre-change HTML and isolated results.');
