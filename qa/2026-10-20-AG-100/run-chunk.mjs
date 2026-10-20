import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHUNKS = {
  F: 't240 t241 t242 t243 t244 t245 t246 t247 t248 t249 t250 t251 t252 t253 t254 t255 t256 t257 t258 t259 t260 t261 t262 t263 t264 t265 t266 t267 t268'.split(' '),
  E: 't196 t197 t198 t199 t200 t201 t202 t203 t204 t205 t206 t207 t208 t209 t210 t211 t212 t213 t214 t215 t216 t217 t218 t219 t220 t221 t222 t223 t224 t225 t226 t227 t228 t229'.split(' '),
  D: 't164 t165 t166 t167 t168 t169 t170 t171 t172 t173 t174 t175 t176 t177 t178 t179 t180 t181 t182 t183 t184 t185 t186 t187 t188 t189 t190 t191 t192 t193 t194 t195'.split(' '),
};

const chunkName = (process.argv[2] || '').toUpperCase();
if (!CHUNKS[chunkName]) {
  console.error(`Usage: node run-chunk.mjs <F|E|D>`);
  process.exit(2);
}

const tests = CHUNKS[chunkName].filter((t) => fs.existsSync(path.join('tools', 'tests', `${t}.js`)));
const outDir = path.join('qa', '2026-10-20-AG-100');
fs.mkdirSync(outDir, { recursive: true });
const logFile = path.join(outDir, `chunk-${chunkName}.log`);
fs.writeFileSync(logFile, `# AG-100 Chunk ${chunkName}: ${tests.join(' ')}\n# Started: ${new Date().toISOString()}\n\n`, 'utf8');

const args = [
  'tools/tests/run-all.mjs',
  ...tests,
  '--agent', 'antigravity',
  '--task', 'AG-100',
  '--checks', `AG-100 chunk ${chunkName} (${tests[0]}..${tests[tests.length - 1]})`,
  '--minutes', '45',
  '--all-fails',
];

const child = spawn(process.execPath, args, {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
});

child.stdout.on('data', (buf) => {
  const str = buf.toString('utf8');
  process.stdout.write(str);
  fs.appendFileSync(logFile, str, 'utf8');
});

child.stderr.on('data', (buf) => {
  const str = buf.toString('utf8');
  process.stderr.write(str);
  fs.appendFileSync(logFile, str, 'utf8');
});

child.on('exit', (code, signal) => {
  const footer = `\n# Finished: ${new Date().toISOString()} code=${code} signal=${signal || 'none'}\n`;
  fs.appendFileSync(logFile, footer, 'utf8');
  process.exit(code ?? 1);
});
