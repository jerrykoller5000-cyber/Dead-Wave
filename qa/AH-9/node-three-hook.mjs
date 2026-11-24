import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const fakeUrl = pathToFileURL(path.resolve('tools/tests/fakethree.mjs')).href;
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { if (s === 'three') return { url: ${JSON.stringify(fakeUrl)}, shortCircuit: true }; return n(s, c); }`));
