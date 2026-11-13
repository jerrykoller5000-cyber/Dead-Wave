// A static UI review page; does not load or start the game.
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../..',import.meta.url)),s=await serve(root,0),b=await launch({headless:false});
try{const p=await b.newPage({width:1320,height:600});await p.goto(s.origin+'/review/GP-20129/icons.html');await p.evaluate('Promise.all([...document.images].map(i=>i.decode()))');await p.screenshot(fileURLToPath(new URL('icons-sheet.png',import.meta.url)));console.log('12 icon comparison sheet rendered');}finally{await b.close();await s.close();}
