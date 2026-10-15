// GP-19906 offline delivery encoder. Run only after render frames are complete.
// Default: node review/dance-GP19906/encode.mjs
// Alpha:   node review/dance-GP19906/encode.mjs --alpha
// Verify an existing delivery without re-encoding: add --verify.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const ffmpeg = process.env.DANCE_FFMPEG || 'C:/Users/Zero/AppData/Roaming/Python/Python314/site-packages/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe';
const args = process.argv.slice(2);
const alpha = args.includes('--alpha');
const verifyOnly = args.includes('--verify');
const value = key => { const i = args.indexOf(key); return i < 0 ? undefined : args[i + 1]; };
const framesDir = resolve(value('--frames') || join(root, alpha ? 'frames-alpha' : 'frames'));
const output = resolve(value('--output') || join(root, alpha ? 'marine-dance-transparent.webm' : 'marine-dance.mp4'));
const audio = join(root, 'audio-dance.mp3');
const fps = 30, frameCount = 600, seconds = frameCount / fps;

if (args.includes('--help')) {
  console.log('encode.mjs [--alpha] [--verify] [--frames directory] [--output file]\nDefault: frames/ → marine-dance.mp4, H.264 CRF18 + excerpt AAC.\n--alpha: frames-alpha/ → marine-dance-transparent.webm, VP9 alpha, silent.\nRequires exactly 600 contiguous numbered PNG frames at 1280×720.\n--verify checks an existing output and writes its adjacent .verification.json.');
  process.exit(0);
}
if (!existsSync(ffmpeg)) throw new Error(`FFmpeg missing: ${ffmpeg}`);

function sync(cmd, opts = {}) {
  const p = spawnSync(ffmpeg, cmd, { windowsHide: true, maxBuffer: 32 * 1024 * 1024, ...opts });
  if (p.error) throw p.error;
  if (p.status !== 0) throw new Error(`FFmpeg exited ${p.status}: ${p.stderr?.toString().slice(-4000)}`);
  return p;
}

function run(cmd, label) {
  return new Promise((ok, no) => {
    const child = spawn(ffmpeg, cmd, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', latest = -1;
    child.stdout.on('data', data => {
      const text = data.toString(); stdout += text;
      const f = [...text.matchAll(/^frame=(\d+)/gm)].at(-1);
      if (f && Math.floor(Number(f[1]) / 150) > latest) {
        latest = Math.floor(Number(f[1]) / 150);
        console.log(`${label}: ${f[1]}/${frameCount} frames`);
      }
    });
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-120000); });
    child.once('error', no);
    child.once('close', code => code === 0 ? ok({ stdout, stderr }) : no(new Error(`FFmpeg ${label} exited ${code}: ${stderr.slice(-6000)}`)));
  });
}

function sequence() {
  if (!existsSync(framesDir)) throw new Error(`Frames not supplied yet: ${framesDir}`);
  const names = readdirSync(framesDir).filter(n => /\.png$/i.test(n));
  if (names.length !== frameCount) throw new Error(`Expected ${frameCount} PNG frames; found ${names.length}. No encoding started.`);
  const parsed = names.map(name => {
    const m = /^(.*?)(\d+)\.png$/i.exec(name);
    if (!m) throw new Error(`Frame must end with a number: ${name}`);
    return { name, prefix: m[1], digits: m[2].length, index: Number(m[2]) };
  }).sort((a, b) => a.index - b.index);
  const first = parsed[0];
  for (let i = 0; i < parsed.length; i++) {
    const f = parsed[i];
    if (f.prefix !== first.prefix || f.digits !== first.digits || f.index !== first.index + i)
      throw new Error(`Non-contiguous or mixed frame sequence at ${f.name}`);
    const png = readFileSync(join(framesDir, f.name));
    if (png.toString('hex', 0, 8) !== '89504e470d0a1a0a' || png.readUInt32BE(16) !== 1280 || png.readUInt32BE(20) !== 720)
      throw new Error(`Expected 1280×720 PNG: ${f.name}`);
    if (alpha && ![4, 6].includes(png[25])) throw new Error(`Alpha frame lacks a PNG alpha channel: ${f.name}`);
  }
  return { directory: framesDir, pattern: join(framesDir, `${first.prefix}%0${first.digits}d.png`), start: first.index, count: parsed.length };
}

function pcm(file) {
  const p = sync(['-v', 'error', '-i', file, '-map', '0:a:0', '-t', '8', '-ac', '1', '-ar', '22050', '-f', 'f32le', 'pipe:1']);
  const bytes = p.stdout;
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

function audioTiming() {
  const reference = pcm(audio), delivery = pcm(output);
  const a = 4410, b = Math.min(reference.length, delivery.length) - 4410;
  // Search ±100 ms. Positive lag means the delivery audio arrives later.
  function correlate(lag, stride = 12) {
    let xy = 0, xx = 0, yy = 0;
    for (let i = a; i < b; i += stride) {
      const x = reference[i], y = delivery[i + lag];
      xy += x * y; xx += x * x; yy += y * y;
    }
    return xy / Math.sqrt(xx * yy || 1);
  }
  let lag = 0, correlation = -1;
  for (let i = -2205; i <= 2205; i += 12) {
    const c = correlate(i);
    if (c > correlation) { correlation = c; lag = i; }
  }
  const center = lag;
  for (let i = center - 12; i <= center + 12; i++) {
    const c = correlate(i, 4);
    if (c > correlation) { correlation = c; lag = i; }
  }
  return { reference: basename(audio), decodedSampleRate: 22050, checkedFirstSeconds: 8, lagSamples: lag, lagSeconds: lag / 22050, normalizedCorrelation: correlation, passes: Math.abs(lag) <= 22050 / 60 && correlation > .90, method: 'Normalized PCM cross-correlation; timing must be within half a 30fps frame. This verifies mux alignment, not perceptual choreography quality.' };
}

let sourceFrames = null;
if (!verifyOnly) {
  sourceFrames = sequence();
  if (!alpha && !existsSync(audio)) throw new Error(`Missing excerpt: ${audio}`);
  const capabilities = sync(['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout;
  const codec = alpha ? 'libvpx-vp9' : 'libx264';
  if (!capabilities.includes(codec)) throw new Error(`Encoder unavailable: ${codec}`);
  const cmd = ['-hide_banner', '-y', '-nostdin', '-framerate', String(fps), '-start_number', String(sourceFrames.start), '-i', sourceFrames.pattern];
  if (!alpha) cmd.push('-i', audio);
  cmd.push('-map', '0:v:0', '-map_metadata', '-1', '-vf', `scale=1280:720:flags=lanczos,setsar=1,format=${alpha ? 'yuva420p' : 'yuv420p'}`, '-frames:v', String(frameCount), '-r', String(fps), '-fps_mode', 'cfr', '-t', String(seconds));
  if (alpha) cmd.push('-an', '-c:v', 'libvpx-vp9', '-crf', '18', '-b:v', '0', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '3', '-metadata:s:v:0', 'alpha_mode=1');
  else cmd.push('-map', '1:a:0', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', `atrim=duration=${seconds},asetpts=PTS-STARTPTS`, '-movflags', '+faststart');
  cmd.push('-progress', 'pipe:1', '-nostats', output);
  console.log(`Encoding ${alpha ? 'silent transparent WebM' : 'MP4 with synchronized excerpt'}: ${output}`);
  await run(cmd, 'encode');
}

if (!existsSync(output)) throw new Error(`Delivery does not exist: ${output}`);
const decodeArgs = ['-hide_banner', '-nostdin'];
if (alpha) decodeArgs.push('-c:v', 'libvpx-vp9');
decodeArgs.push('-i', output, '-map', '0:v:0');
if (!alpha) decodeArgs.push('-map', '0:a:0');
decodeArgs.push('-progress', 'pipe:1', '-nostats', '-f', 'null', 'NUL');
const decoded = await run(decodeArgs, 'verify');
const durationMatch = /Duration: (\d+):(\d+):([\d.]+)/.exec(decoded.stderr);
const actualDuration = durationMatch ? Number(durationMatch[1]) * 3600 + Number(durationMatch[2]) * 60 + Number(durationMatch[3]) : null;
const actualFrames = Number([...decoded.stdout.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1]);
const dimensionMatch = /Video:.*?\b1280x720\b/.test(decoded.stderr);
const timeline = JSON.parse(readFileSync(join(root, 'audio-timeline.json'), 'utf8'));
const markers = timeline.two_bar_phrase_grid.map(p => ({ beat: p.beat, intendedSeconds: p.seconds, frame: Math.round(p.seconds * fps), actualFrameSeconds: Math.round(p.seconds * fps) / fps, quantizationErrorMs: +(1000 * (Math.round(p.seconds * fps) / fps - p.seconds)).toFixed(3) }));
let alphaCheck = null;
if (alpha) {
  const raw = sync(['-v', 'error', '-c:v', 'libvpx-vp9', '-ss', '15', '-i', output, '-vf', 'alphaextract', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1']).stdout;
  let min = 255, max = 0; for (const byte of raw) { min = Math.min(min, byte); max = Math.max(max, byte); }
  alphaCheck = { sampleSeconds: 15, minimum: min, maximum: max, pixels: raw.length, passes: raw.length === 1280 * 720 && min < 255 && max > 0 };
}
const audioCheck = alpha ? null : audioTiming();
const report = { output, bytes: statSync(output).size, verifiedAt: new Date().toISOString(), expected: { width: 1280, height: 720, fps, frames: frameCount, durationSeconds: seconds, audio: !alpha, alpha }, actual: { durationSeconds: actualDuration, decodedFrames: actualFrames, dimensions1280x720: dimensionMatch }, sourceFrames, audioAlignment: audioCheck, alphaChannel: alphaCheck, markerTiming: { sourceExcerptStartSeconds: timeline.recommended_excerpt.source_start_seconds, bpm: timeline.bpm, markers, limitation: 'Markers verify the intended beat-to-frame clock mapping. Character pose hits must still be checked visually.' }, passes: actualFrames === frameCount && actualDuration != null && Math.abs(actualDuration - seconds) < .011 && dimensionMatch && (alpha ? alphaCheck.passes : audioCheck.passes) };
const reportFile = `${output}.verification.json`;
writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ output, report: reportFile, passes: report.passes, seconds: actualDuration, frames: actualFrames, audioLagSeconds: audioCheck?.lagSeconds, alpha: alphaCheck }, null, 2));
if (!report.passes) process.exitCode = 1;
