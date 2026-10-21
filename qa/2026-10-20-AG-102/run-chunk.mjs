import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const CHUNKS = {
  C: 't132 t133 t134 t135 t136 t137 t138 t139 t140 t141 t142 t143 t144 t145 t146 t147 t148 t149 t150 t151 t152 t153 t154 t155 t156 t157 t158 t159 t160 t161 t162 t163'.split(' '),
  B: 't100 t101 t102 t103 t104 t105 t106 t107 t108 t109 t110 t111 t112 t113 t114 t115 t116 t117 t119 t120 t121 t122 t123 t124 t125 t126 t127 t128 t129 t130 t131'.split(' '),
  A: 't68 t69 t70 t71 t72 t73 t74 t75 t76 t77 t78 t79 t80 t81 t82 t83 t84 t85 t86 t87 t88 t89 t90 t91 t92 t93 t94 t95 t96 t97 t98 t99'.split(' '),
};

const chunkName = (process.argv[2] || '').toUpperCase();
if (!CHUNKS[chunkName]) {
  console.error(`Usage: node run-chunk.mjs <C|B|A>`);
  process.exit(2);
}

const tests = CHUNKS[chunkName].filter((t) => fs.existsSync(path.join('tools', 'tests', `${t}.js`)));
const outDir = path.join('qa', '2026-10-20-AG-102');
fs.mkdirSync(outDir, { recursive: true });
const logFile = path.join(outDir, `chunk-${chunkName}.log`);
fs.writeFileSync(logFile, `# AG-102 Chunk ${chunkName}: ${tests.join(' ')}\n# Started: ${new Date().toISOString()}\n\n`, 'utf8');

const args = [
  'tools/tests/run-all.mjs',
  ...tests,
  '--agent', 'antigravity',
  '--task', 'AG-102',
  '--checks', `AG-102 chunk ${chunkName} (${tests[0]}..${tests[tests.length - 1]})`,
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
