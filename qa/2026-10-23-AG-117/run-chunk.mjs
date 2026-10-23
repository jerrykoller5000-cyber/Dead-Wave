import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)));
const TESTS_DIR = path.join(ROOT, 'tools', 'tests');
fs.mkdirSync(OUT_DIR, { recursive: true });

const allTests = fs.readdirSync(TESTS_DIR)
  .filter((f) => /^t[0-9a-z]+\.js$/.test(f))
  .map((f) => f.replace(/\.js$/, ''))
  .sort((a, b) => (Number(a.slice(1)) || 0) - (Number(b.slice(1)) || 0) || a.localeCompare(b));

function inRange(lo, hi, extra = []) {
  const set = new Set(extra);
  for (const t of allTests) {
    const m = t.match(/^t(\d+)$/);
    if (m) {
      const n = Number(m[1]);
      if (n >= lo && n <= hi) set.add(t);
    }
  }
  return allTests.filter((t) => set.has(t));
}

const CHUNKS = {
  '0a': inRange(0, 33, ['t6a']),
  '0b': inRange(34, 67, ['tfish']),
  'A': inRange(68, 99),
  'B': inRange(100, 131),
  'C': inRange(132, 163),
  'D': inRange(164, 195),
  'E': inRange(196, 229),
  'F': inRange(230, 275, ['tinspect']),
  'R': [
    't12', 't13', 't14', 't187', 't188', 't189', 't194', 't195',
    't218', 't221', 't222', 't224', 't225', 't228', 't229',
    't244', 't262', 't267', 't270', 't271', 't272'
  ].filter((t) => fs.existsSync(path.join(TESTS_DIR, `${t}.js`)))
};

if (process.argv.includes('--verify-map')) {
  const pageChunks = ['0a', '0b', 'A', 'B', 'C', 'D', 'E', 'F'];
  const covered = pageChunks.flatMap((k) => CHUNKS[k]);
  const missing = allTests.filter((t) => !covered.includes(t));
  console.log(`Total test files: ${allTests.length}, Covered: ${covered.length}, Missing: ${missing.length} (${missing.join(' ')})`);
  for (const k of [...pageChunks, 'R']) {
    console.log(`  Chunk ${k.padEnd(2)}: ${String(CHUNKS[k].length).padStart(2)} tests (${CHUNKS[k][0]}..${CHUNKS[k].at(-1)})`);
  }
  process.exit(missing.length ? 1 : 0);
}

function runProcess(args, logPath) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const append = (buf) => {
      fs.appendFileSync(logPath, buf);
    };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

function parseTestPageLog(text) {
  const lines = text.split(/\r?\n/);
  const summaryLine = lines.filter((l) => /^\d+ checks:\s+\d+ pass,\s+\d+ fail/.test(l.trim())).at(-1) || '';
  const failedTests = [];
  const perTest = [];
  let current = null;
  for (const rawLine of lines) {
    const m = rawLine.match(/^(ok   |FAIL |ERROR|info )\s+(t[0-9a-z]+)\s+(\d+)\s+pass\s+(\d+)\s+fail\s+([\d.]+)s(.*)$/);
    if (m) {
      const [, status, name, passStr, failStr, secsStr, rest] = m;
      const item = {
        status: status.trim(),
        name,
        pass: Number(passStr),
        fail: Number(failStr),
        secs: Number(secsStr),
        detail: rest.trim(),
        failLines: []
      };
      perTest.push(item);
      if (item.status === 'FAIL' || item.status === 'ERROR' || item.fail > 0) {
        failedTests.push(name);
      }
      current = item;
      continue;
    }
    const ownerFail = rawLine.match(/^\s{4}(t[0-9a-z]+)\s+\d+\s+fail\s+(.*)$/);
    if (ownerFail) {
      current = perTest.find((p) => p.name === ownerFail[1]) || null;
      continue;
    }
    const failDetail = rawLine.match(/^\s{11}(FAIL\b.*)$/);
    if (failDetail && current) {
      current.failLines.push(failDetail[1].trim());
    }
  }
  return { summaryLine: summaryLine.trim(), failedTests, perTest };
}

function parseRealtestLog(text) {
  const lines = text.split(/\r?\n/);
  const summaryLine = lines.filter((l) => /^\d+ checks:\s+\d+ pass,\s+\d+ fail \(real renderer\)/.test(l.trim())).at(-1) || '';
  const failedTests = [];
  const perTest = [];
  let current = null;
  for (const rawLine of lines) {
    const m = rawLine.match(/^(ok  |FAIL)\s+(t[0-9a-z]+)\s+(\d+)\s+pass\s+(\d+)\s+fail\s+([\d.]+)s\s+\(real renderer\)/);
    if (m) {
      const [, status, name, passStr, failStr, secsStr] = m;
      current = {
        status: status.trim(),
        name,
        pass: Number(passStr),
        fail: Number(failStr),
        secs: Number(secsStr),
        failLines: []
      };
      perTest.push(current);
      if (current.status === 'FAIL' || current.fail > 0) {
        failedTests.push(name);
      }
      continue;
    }
    const sub = rawLine.match(/^\s{4}(FAIL\b.*)$/);
    if (sub && current) {
      current.failLines.push(sub[1].trim());
    }
  }
  return { summaryLine: summaryLine.trim(), failedTests, perTest };
}

async function runChunk(key) {
  const tests = CHUNKS[key];
  if (!tests || !tests.length) throw new Error(`Unknown chunk ${key}`);
  const logPath = path.join(OUT_DIR, `chunk-${key}.log`);
  fs.writeFileSync(logPath, `# AG-117 chunk ${key}: ${tests.join(' ')}\n# Started: ${new Date().toISOString()}\n\n`, 'utf8');

  let code;
  if (key === 'R') {
    code = await runProcess([
      'crew/crew.mjs', 'slot', 'run', 'antigravity', 'AG-117',
      '--checks', `AG-117 chunk R realtest (${tests[0]}..${tests.at(-1)})`,
      '--minutes', '60', '--',
      process.execPath, 'tools/realtest.mjs', ...tests
    ], logPath);
  } else {
    code = await runProcess([
      'tools/tests/run-all.mjs', ...tests,
      '--agent', 'antigravity', '--task', 'AG-117',
      '--jobs', '1',
      '--checks', `AG-117 chunk ${key} (${tests[0]}..${tests.at(-1)})`,
      '--minutes', '60', '--all-fails'
    ], logPath);
  }
  fs.appendFileSync(logPath, `\n# Finished: ${new Date().toISOString()} code=${code}\n`, 'utf8');

  const logText = fs.readFileSync(logPath, 'utf8');
  const parsed = key === 'R' ? parseRealtestLog(logText) : parseTestPageLog(logText);

  let rerunParsed = null;
  if (parsed.failedTests.length > 0) {
    const rerunLogPath = path.join(OUT_DIR, `chunk-${key}-rerun.log`);
    fs.writeFileSync(rerunLogPath, `# AG-117 chunk ${key} rerun: ${parsed.failedTests.join(' ')}\n# Started: ${new Date().toISOString()}\n\n`, 'utf8');
    let rerunCode;
    if (key === 'R') {
      rerunCode = await runProcess([
        'crew/crew.mjs', 'slot', 'run', 'antigravity', 'AG-117',
        '--checks', `AG-117 chunk R rerun (${parsed.failedTests.join(' ')})`,
        '--minutes', '30', '--',
        process.execPath, 'tools/realtest.mjs', ...parsed.failedTests
      ], rerunLogPath);
    } else {
      rerunCode = await runProcess([
        'tools/tests/run-all.mjs', ...parsed.failedTests,
        '--agent', 'antigravity', '--task', 'AG-117',
        '--jobs', '1',
        '--checks', `AG-117 chunk ${key} rerun (${parsed.failedTests.join(' ')})`,
        '--minutes', '30', '--all-fails'
      ], rerunLogPath);
    }
    fs.appendFileSync(rerunLogPath, `\n# Finished: ${new Date().toISOString()} code=${rerunCode}\n`, 'utf8');
    const rerunText = fs.readFileSync(rerunLogPath, 'utf8');
    rerunParsed = key === 'R' ? parseRealtestLog(rerunText) : parseTestPageLog(rerunText);
  }

  const heldReds = rerunParsed ? rerunParsed.failedTests : [];
  const flakyCleared = parsed.failedTests.filter((t) => !heldReds.includes(t));

  const outJson = {
    chunk: key,
    range: `${tests[0]}..${tests.at(-1)}`,
    count: tests.length,
    summaryLine: parsed.summaryLine,
    initialFailed: parsed.failedTests,
    flakyClearedOnRerun: flakyCleared,
    heldReds,
    initialFailuresDetail: parsed.perTest.filter((p) => parsed.failedTests.includes(p.name)),
    rerunFailuresDetail: rerunParsed ? rerunParsed.perTest.filter((p) => heldReds.includes(p.name)) : []
  };
  fs.writeFileSync(path.join(OUT_DIR, `chunk-${key}.json`), JSON.stringify(outJson, null, 2), 'utf8');

  const noteParts = [
    `AG-117 chunk ${key} (${tests[0]}..${tests.at(-1)}): ${parsed.summaryLine || 'done'}`
  ];
  if (parsed.failedTests.length === 0) {
    noteParts.push('0 reds');
  } else {
    noteParts.push(`initial reds: ${parsed.failedTests.join(' ')}`);
    if (flakyCleared.length) noteParts.push(`passed on rerun: ${flakyCleared.join(' ')}`);
    if (heldReds.length) {
      const heldDesc = outJson.rerunFailuresDetail.map((d) => `${d.name} (${d.fail} fail: ${(d.failLines[0] || d.detail || '').slice(0, 120)})`).join('; ');
      noteParts.push(`held on rerun: ${heldDesc}`);
    } else {
      noteParts.push('all reds cleared on rerun');
    }
  }
  const noteMsg = noteParts.join(' | ').slice(0, 3500);
  spawnSync(process.execPath, ['crew/crew.mjs', 'note', 'antigravity', noteMsg], { cwd: ROOT, stdio: 'inherit' });
  console.log(JSON.stringify(outJson, null, 2));
}

const requested = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const order = requested.length ? requested : ['0a', '0b', 'A', 'B', 'C', 'D', 'E', 'F', 'R'];
for (const k of order) {
  await runChunk(k);
}
