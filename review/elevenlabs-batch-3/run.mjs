// GP-189: one batch-3 output and the hardened runner, even for direct CLI use.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const shared=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../elevenlabs-batch');
const args=process.argv.slice(2);
if(!args.length)args.push('plan');
if(!args.includes('--manifest'))args.push('--manifest',path.join(shared,'manifest-3.json'));
if(!args.includes('--output'))args.push('--output',path.join(shared,'Generated-3'));
process.argv.splice(2,process.argv.length-2,...args);
await import('../elevenlabs-batch/run.mjs');
