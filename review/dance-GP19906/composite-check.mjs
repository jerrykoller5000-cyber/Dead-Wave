// GP-19906 private review runner. No live intro/game source changes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const folder = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(folder, 'composite-proof');
const videoPath = path.join(folder, 'marine-dance-transparent.webm');
const auditPath = path.join(folder, 'final-audit/proof.json');
if (!fs.existsSync(videoPath)) throw new Error('Final alpha video must be encoded before this review runs.');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const auditBytes = fs.readFileSync(auditPath), audit = JSON.parse(auditBytes);
const frames = audit.audit.frames;
// GP-19906 remains on the floor after beat21. Compare standing depth poses,
// excluding the airborne hop group so jump height cannot masquerade as depth travel.
const upright = frames.filter(frame => frame.beat < 21 &&
  !(frame.beat >= 9 && frame.beat < 12));
const by = (list, value, max = false) => list.reduce((best, frame) =>
  !best || (max ? value(frame) > value(best) : value(frame) < value(best)) ? frame : best, null);
const candidates = [
  ['left', by(frames, frame => frame.hipProjection.pixels[0])],
  ['right', by(frames, frame => frame.hipProjection.pixels[0], true)],
  ['near', by(upright, frame => frame.hipProjection.depth)],
  ['far', by(upright, frame => frame.hipProjection.depth, true)],
  ['lowest-screen', by(frames, frame => frame.framing.pixels.bottom, true)],
  ['highest-screen', by(frames, frame => frame.framing.pixels.top)],
  ['final-freeze', by(frames, frame => Math.abs(frame.seconds - 19.8))]
].map(([label, frame]) => ({ label, seconds: frame.seconds, beat: frame.beat, hipProjection: frame.hipProjection, sourceFraming: frame.framing }));
fs.mkdirSync(output, { recursive: true });
const proof = {
  started: new Date().toISOString(), videoSha256: hash(fs.readFileSync(videoPath)), auditSha256: hash(auditBytes),
  auditSourceHash: audit.motionSourceHash, selection: 'Native pose audit: hip left/right; standing near/far; lowest/highest visible source vertex; final freeze at 19.8 seconds.',
  candidates, screens: [], errors: [], ok: false
};
const engine = new Engine({ warm: 'none', size: '1280x720' });
try {
  await engine.open();
  proof.renderer = engine.renderer;
  await engine.page.goto(`${engine.server.origin}/review/dance-GP19906/disclaimer-preview.html?clean&card=1&time=0`, { timeout: 120000 });
  await engine.page.evaluate('window.disclaimerPreview.ready');
  if (!await engine.page.waitFor('document.querySelector("#previewDancer").readyState >= 2', { timeout: 15000 })) throw new Error('Alpha video did not decode its initial frame');
  await engine.page.evaluate(`(() => {
    const video = document.querySelector('#previewDancer');
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const simpleRect = rect => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height });
    window.__compositeFrame = async (seconds, cardIndex) => {
      window.disclaimerPreview.setCard(cardIndex);
      await window.disclaimerPreview.seek(seconds);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      // Consistent existing police-light phase across captures; no actor movement is introduced here.
      for (const animation of document.querySelector('#disclaimer').getAnimations({ subtree: true })) {
        animation.pause(); animation.currentTime = seconds * 1000;
      }
      ctx.clearRect(0, 0, 1280, 720); ctx.drawImage(video, 0, 0, 1280, 720);
      const pixels = ctx.getImageData(0, 0, 1280, 720).data;
      let left = 1280, right = -1, top = 720, bottom = -1, count = 0;
      for (let y = 0; y < 720; y++) for (let x = 0; x < 1280; x++) {
        if (pixels[(y * 1280 + x) * 4 + 3] < 8) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); count++;
      }
      const videoBox = video.getBoundingClientRect(), cardBox = document.querySelector('#previewCard').getBoundingClientRect();
      const actor = { left: videoBox.left + left / 1280 * videoBox.width, right: videoBox.left + (right + 1) / 1280 * videoBox.width,
        top: videoBox.top + top / 720 * videoBox.height, bottom: videoBox.top + (bottom + 1) / 720 * videoBox.height };
      const overlapX = Math.max(0, Math.min(actor.right, cardBox.right) - Math.max(actor.left, cardBox.left));
      const overlapY = Math.max(0, Math.min(actor.bottom, cardBox.bottom) - Math.max(actor.top, cardBox.top));
      return { ...window.disclaimerPreview.proof(), cardText: document.querySelector('#previewCard').textContent,
        viewport: [innerWidth, innerHeight], decodedAlpha: { pixels: count, corners: [pixels[3], pixels[(1279)*4+3], pixels[(719*1280)*4+3], pixels[pixels.length-1]] },
        alphaBounds: { left, right, top, bottom }, sourceMargin: Math.min(left, top, 1279-right, 719-bottom),
        actorRect: actor, cardRect: simpleRect(cardBox),
        screenMargin: Math.min(actor.left, actor.top, innerWidth-actor.right, innerHeight-actor.bottom),
        textGap: cardBox.top-actor.bottom, textOverlap: { width: overlapX, height: overlapY, area: overlapX*overlapY } };
    };
  })()`);
  for (const [width, height] of [[1280, 720], [900, 900]]) {
    await engine.page.setViewport(width, height);
    for (const sample of candidates) {
      const cardIndex = ['near', 'lowest-screen', 'final-freeze'].includes(sample.label) ? 2 : 1;
      const state = await engine.page.evaluate(`window.__compositeFrame(${sample.seconds},${cardIndex})`, 30000);
      if (Math.abs(state.videoTime - sample.seconds) > .04) throw new Error(`Seek did not reach ${sample.seconds}: decoder remained at ${state.videoTime}`);
      const file = `${width}x${height}-${sample.label}-${sample.seconds.toFixed(3)}s.png`;
      await engine.page.screenshot(path.join(output, file));
      proof.screens.push({ label: sample.label, file, ...state });
      console.log('COMPOSITE', file, JSON.stringify({ sourceMargin: state.sourceMargin, screenMargin: state.screenMargin, textGap: state.textGap, overlap: state.textOverlap.area }));
    }
  }
  const screenRows = proof.screens.map(screen => ({ label: `${screen.viewport.join('×')} · ${screen.label} · ${screen.videoTime.toFixed(2)}s`, png: fs.readFileSync(path.join(output, screen.file)).toString('base64') }));
  const sheet = await engine.page.evaluate(`(async rows => {
    const width=480,height=270,labelHeight=24,cols=2,canvas=document.createElement('canvas');
    canvas.width=cols*width; canvas.height=Math.ceil(rows.length/cols)*(height+labelHeight);
    const ctx=canvas.getContext('2d'); ctx.fillStyle='#080d10';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let i=0;i<rows.length;i++){
      const image=new Image();image.src='data:image/png;base64,'+rows[i].png;await image.decode();
      const x=(i%cols)*width,y=Math.floor(i/cols)*(height+labelHeight),scale=Math.min(width/image.width,height/image.height);
      const w=image.width*scale,h=image.height*scale;ctx.drawImage(image,x+(width-w)/2,y+(height-h)/2,w,h);
      ctx.fillStyle='#d6d8d0';ctx.font='13px Arial';ctx.fillText(rows[i].label,x+10,y+height+16);
    }
    return canvas.toDataURL('image/png').split(',')[1];
  })(${JSON.stringify(screenRows)})`, 30000);
  fs.writeFileSync(path.join(output, 'contact-sheet.png'), Buffer.from(sheet, 'base64'));
  proof.summary = {
    sourceMargin: Math.min(...proof.screens.map(screen => screen.sourceMargin)),
    screenMargin: Math.min(...proof.screens.map(screen => screen.screenMargin)),
    minTextGap: Math.min(...proof.screens.map(screen => screen.textGap)),
    maxTextOverlap: Math.max(...proof.screens.map(screen => screen.textOverlap.area)),
    correctFrame: proof.screens.every(screen => screen.width === 1280 && screen.height === 720),
    correctDuration: proof.screens.every(screen => Math.abs(screen.videoDuration - 20) < .04),
    transparentCorners: proof.screens.every(screen => screen.decodedAlpha.corners.every(value => value === 0))
  };
  proof.ok = proof.summary.sourceMargin > 1 && proof.summary.screenMargin > 1 && proof.summary.maxTextOverlap === 0 && proof.summary.correctFrame && proof.summary.correctDuration && proof.summary.transparentCorners;
  console.log(proof.ok ? 'PASS composite' : 'REVIEW composite', JSON.stringify(proof.summary));
} catch (error) {
  proof.errors.push(String(error.stack || error)); console.error(error); process.exitCode = 1;
} finally {
  proof.errors.push(...(engine.page?.errors || []));
  proof.finished = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'proof.json'), JSON.stringify(proof, null, 2));
  await engine.close();
}
process.exit(process.exitCode || 0);
