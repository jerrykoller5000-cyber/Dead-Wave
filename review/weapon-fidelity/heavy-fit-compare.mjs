import fs from 'node:fs';
const audit=fs.readFileSync(new URL('heavy-audit.mjs',import.meta.url),'utf8');
const setup=audit.slice(0,audit.indexOf('function stats(')).replaceAll("'../../", "'"+new URL('../../',import.meta.url).href);
const code=fs.readFileSync(new URL('heavy-fit-cpu.js',import.meta.url),'utf8');
await import('data:text/javascript;base64,'+Buffer.from(setup+code).toString('base64'));
