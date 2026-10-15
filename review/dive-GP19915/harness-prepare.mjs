import fs from 'node:fs';
const dir='review/dive-GP19915';let s=fs.readFileSync('tools/tests/run-all.mjs','utf8');
s=s.replace("from '../serve.mjs'","from '../../tools/serve.mjs'").replace("from '../cdp.mjs'","from '../../tools/cdp.mjs'");
s=s.replace('const HERE = path.dirname(fileURLToPath(import.meta.url));',"const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tools/tests');\nconst baseline=process.argv.includes('--before');");
s=s.replace("fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')","fs.readFileSync(path.join(ROOT, baseline?'review/dive-GP19915/index-before.html':'index.html'), 'utf8').replace('<base href=\"/\">','')");
s=s.slice(0,s.indexOf("let commit = '';"))+`fs.writeFileSync(path.join(ROOT,'review/dive-GP19915/'+(baseline?'before':'after')+'-harness.json'),JSON.stringify(results,null,2));\nprocess.exit(broken.length?1:0);\n`;
fs.writeFileSync(dir+'/harness.mjs',s);
