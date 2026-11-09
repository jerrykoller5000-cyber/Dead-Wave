import { text, STRINGS } from '../../ui/strings.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
console.log('calibre.60mm =>', JSON.stringify(text('calibre.60mm')));
if (text('calibre.60mm') !== '81mm') { console.log('FAIL display'); process.exit(1); }
if (!Object.prototype.hasOwnProperty.call(STRINGS, 'calibre.60mm')) { console.log('FAIL key missing'); process.exit(1); }
const cat = fs.readFileSync(path.join(root, 'studio/inspector/catalog.js'), 'utf8');
const m = cat.match(/id: 'weapon\.mortar-round', name: '([^']+)'/);
console.log('catalog name =>', m && m[1]);
if (!m || m[1] !== 'Mortar round (81 mm)') { console.log('FAIL catalog'); process.exit(1); }
console.log('label-read PASS');
