// cloud only: the suite's fakethree copy of the game (as run-all.mjs builds it) at tools/tests/test-4444.html
import fs from 'node:fs';
const ROOT = '/home/claude/gs306';
const src = fs.readFileSync(ROOT + '/index.html', 'utf8');
const map = src.match(/<script type="importmap">([\s\S]*?)<\/script>/);
let out = src.replace(map[0], `<script type="importmap">{"imports":{"three":"./fakethree.mjs","three/webgpu":"./fakethree.mjs","three/tsl":"./faketsl.mjs","three/addons/":"./addons/"}}</script>`);
out = out.replace('<head>', '<head>\n  <script>try{localStorage.clear()}catch(e){}</script>');
out = out.replace(/(\s(?:src|href)=")(?!https?:|\/|data:|#)/g, '$1/');
out = out.replace(/from (['"])\.\//g, 'from $1/').replace(/import (['"])\.\//g, 'import $1/');
fs.writeFileSync(ROOT + '/tools/tests/test-4444.html', out);
