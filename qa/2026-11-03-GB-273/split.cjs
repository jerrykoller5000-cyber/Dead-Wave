const fs = require('fs');
const s = fs.readFileSync('index.html', 'utf8');
const re = /<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/g; let m, i = 0;
while ((m = re.exec(s))) { const mod = /type\s*=\s*["']module/.test(m[1]); const f = 'qa/2026-11-03-GB-273/inline' + (i++) + (mod ? '.mjs' : '.js'); fs.writeFileSync(f, m[2]); console.log(f, m[2].length); }