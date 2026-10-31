import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Engine } from '../../tools/camera.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const QA_DIR = path.join(ROOT, 'qa', '2026-10-29-AG-159');
const OUT_DIR = path.join(ROOT, 'review', 'principles', 'claude', 'moves');
const DROWNED_LIVE_DIR = path.join(ROOT, 'handoffs', 'GP-19970', 'live-drowned-grab');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const INSPECTOR_MOVES = [
  { id: 'stand', name: 'Standing Unarmed', cat: 'Poses & holds', settle: 5, step: 20 },
  { id: 'stand-armed', name: 'Standing Armed', cat: 'Poses & holds', settle: 5, step: 20 },
  { id: 'smoke', name: 'Bored Cigarette Idle', cat: 'Poses & holds', settle: 15, step: 35 },
  { id: 'walk', name: 'Walk Forward', cat: 'Locomotion', settle: 12, step: 15 },
  { id: 'walk-back', name: 'Walk Backward', cat: 'Locomotion', settle: 12, step: 15 },
  { id: 'strafe-left', name: 'Strafe Left', cat: 'Locomotion', settle: 12, step: 15 },
  { id: 'run', name: 'Sprint Run', cat: 'Locomotion', settle: 12, step: 11 },
  { id: 'crouch', name: 'Crouch Hold', cat: 'Locomotion', settle: 2, step: 12 },
  { id: 'crouch-walk', name: 'Crouch Walk', cat: 'Locomotion', settle: 12, step: 16 },
  { id: 'turn-left', name: 'Turn in Place Left', cat: 'Locomotion', settle: 2, step: 12 },
  { id: 'jump', name: 'Standing Jump', cat: 'Locomotion', settle: 2, step: 12 },
  { id: 'jump-run', name: 'Running Jump', cat: 'Locomotion', settle: 36, step: 11 },
  { id: 'vault', name: 'Sandbag Wall Vault', cat: 'Combat', settle: 18, step: 8 },
  { id: 'draw', name: 'Draw and Holster', cat: 'Combat', settle: 2, step: 14 },
  { id: 'medpen', name: 'Med Pen Heal', cat: 'Combat', settle: 2, step: 20 },
  { id: 'knockout', name: 'Infirmary Cot Recovery', cat: 'Crew-served', settle: 5, step: 50 },
  { id: 'reload-m4', name: 'M4 Rifle Reload', cat: 'Reloads', settle: 30, step: 22 },
  { id: 'reload-pistol', name: 'Pistol Reload', cat: 'Reloads', settle: 30, step: 18 }
];

async function main() {
  console.log(`Starting AG-159 Marine Moves Filmstrips generation...`);
  console.log(`Target directory: ${OUT_DIR}`);

  const engine = new Engine({ inspect: true, warm: 'none', size: [1600, 900] });
  const allMovesData = [];

  try {
    await engine.open();
    console.log(`Inspector opened in ${engine.loadSec.toFixed(1)}s, renderer: ${engine.renderer}`);

    // Set up helper in the page
    await engine.page.evaluate(`
      window.__assembleStrip = async function(frames, label, viewName) {
        const load = (d) => new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = d.startsWith('data:') ? d : 'data:image/png;base64,' + d;
        });
        const imgs = await Promise.all(frames.map(load));
        const first = imgs.find(Boolean);
        if (!first) throw new Error('No images loaded for strip: ' + label);
        
        const tw = 480;
        const th = Math.round(tw * first.height / first.width);
        const headerH = 34;
        const canvas = document.createElement('canvas');
        canvas.width = tw * imgs.length;
        canvas.height = th + headerH;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#141416';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#1e2024';
        ctx.fillRect(0, 0, canvas.width, headerH);
        ctx.fillStyle = '#f4ecd0';
        ctx.font = 'bold 15px "Segoe UI", Arial, sans-serif';
        ctx.fillText(label.toUpperCase() + ' · ' + viewName.toUpperCase() + ' VIEW (6-FRAME FILMSTRIP)', 16, 23);
        
        imgs.forEach((img, i) => {
          const x = i * tw;
          const y = headerH;
          if (img) ctx.drawImage(img, x, y, tw, th);
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.fillRect(x, y + th - 24, tw, 24);
          ctx.fillStyle = '#e2d9c2';
          ctx.font = '600 12px "Segoe UI", Arial, sans-serif';
          ctx.fillText('Frame ' + (i + 1) + '/6 · phase ' + (i / 5).toFixed(2), x + 8, y + th - 7);
          
          ctx.strokeStyle = '#2d3139';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, tw, th);
        });
        
        return canvas.toDataURL('image/png').split(',')[1];
      };

      window.__assembleSheet = async function(movesData) {
        const load = (d) => new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = 'data:image/png;base64,' + d;
        });

        const rowWidth = 2400;
        const stripW = 1180;
        const stripH = 124;
        const rowH = stripH + 34;
        const topHeaderH = 64;
        
        const canvas = document.createElement('canvas');
        canvas.width = rowWidth;
        canvas.height = topHeaderH + movesData.length * rowH + 24;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#0f1012';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText('MARINE MOVES FILMSTRIPS (CL-267 / AG-159)', 24, 40);
        ctx.fillStyle = '#8a939e';
        ctx.font = '14px "Segoe UI", Arial, sans-serif';
        ctx.fillText('20 Moves · 6 Frames Each · Side View & Three-Quarter View · NVIDIA RTX 5080', 580, 40);
        
        for (let i = 0; i < movesData.length; i++) {
          const m = movesData[i];
          const y0 = topHeaderH + i * rowH;
          
          ctx.fillStyle = '#1c1f24';
          ctx.fillRect(16, y0, rowWidth - 32, 28);
          ctx.fillStyle = '#00ffff';
          ctx.font = 'bold 13px "Segoe UI", Arial, sans-serif';
          ctx.fillText((i + 1) + '. ' + m.id + ' (' + m.name + ')', 28, y0 + 19);
          
          ctx.fillStyle = '#a0aab8';
          ctx.font = '12px "Segoe UI", Arial, sans-serif';
          ctx.fillText('SIDE VIEW', 240, y0 + 19);
          ctx.fillText('THREE-QUARTER VIEW', 240 + stripW + 20, y0 + 19);
          
          const sideImg = await load(m.sideBase64);
          const threeImg = await load(m.threeBase64);
          
          const yStrip = y0 + 30;
          if (sideImg) ctx.drawImage(sideImg, 16, yStrip, stripW, stripH);
          if (threeImg) ctx.drawImage(threeImg, 16 + stripW + 20, yStrip, stripW, stripH);
          
          ctx.strokeStyle = '#2a2f38';
          ctx.lineWidth = 1;
          ctx.strokeRect(16, yStrip, stripW, stripH);
          ctx.strokeRect(16 + stripW + 20, yStrip, stripW, stripH);
        }
        
        return canvas.toDataURL('image/jpeg', 0.88).split(',')[1];
      };
    `);

    // 1. Process 18 Inspector Moves
    for (let idx = 0; idx < INSPECTOR_MOVES.length; idx++) {
      const move = INSPECTOR_MOVES[idx];
      console.log(`[${idx + 1}/${INSPECTOR_MOVES.length + 2}] Processing inspector move: ${move.id} (${move.name})...`);

      const frames = await engine.page.evaluate(`(async (move) => {
        const api = window.DWInspect;
        await api.show('marine');
        await api.marine.play(move.id, { loop: false });
        api.pause();

        if (move.settle > 0) {
          await api.stepAsync(move.settle);
        }

        const sides = [];
        const threes = [];

        for (let f = 0; f < 6; f++) {
          api.view('side');
          sides.push(await api.shot());
          api.view('three');
          threes.push(await api.shot());

          if (f < 5) {
            await api.stepAsync(move.step);
          }
        }

        const sideStrip = await window.__assembleStrip(sides, move.id, 'side');
        const threeStrip = await window.__assembleStrip(threes, move.id, 'three-quarter');

        return { sideStrip, threeStrip };
      })(${JSON.stringify(move)})`);

      const sideBuf = Buffer.from(frames.sideStrip, 'base64');
      const sidePath = path.join(OUT_DIR, `${move.id}-side.png`);
      fs.writeFileSync(sidePath, sideBuf);

      const threeBuf = Buffer.from(frames.threeStrip, 'base64');
      const threePath = path.join(OUT_DIR, `${move.id}-three.png`);
      fs.writeFileSync(threePath, threeBuf);

      console.log(`  -> Wrote ${move.id}-side.png (${sideBuf.length} B), ${move.id}-three.png (${threeBuf.length} B)`);

      allMovesData.push({
        id: move.id,
        name: move.name,
        cat: move.cat,
        sideBase64: frames.sideStrip,
        threeBase64: frames.threeStrip
      });
    }

    // 2. Process Dive (Shootdodge)
    console.log(`[19/20] Processing move: dive (shootdodge)...`);
    const diveFrames = await engine.page.evaluate(`(async () => {
      const api = window.DWInspect;
      await api.show('marine');
      api.pause();

      const { applyDivePose } = await import('./tools/marine-inspector.js').catch(async () => {
        return await import('./studio/marine-dive-pose.js');
      });
      const marine = window.DWInspectHost.marine;

      const phases = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
      const sides = [];
      const threes = [];

      for (let i = 0; i < phases.length; i++) {
        const u = phases[i];
        applyDivePose(marine, u, 'full');
        marine.updateMatrixWorld(true);

        api.view('side');
        sides.push(await api.shot());
        api.view('three');
        threes.push(await api.shot());
      }

      const sideStrip = await window.__assembleStrip(sides, 'dive', 'side');
      const threeStrip = await window.__assembleStrip(threes, 'dive', 'three-quarter');

      return { sideStrip, threeStrip };
    })()`);

    const diveSideBuf = Buffer.from(diveFrames.sideStrip, 'base64');
    const diveSidePath = path.join(OUT_DIR, `dive-side.png`);
    fs.writeFileSync(diveSidePath, diveSideBuf);

    const diveThreeBuf = Buffer.from(diveFrames.threeStrip, 'base64');
    const diveThreePath = path.join(OUT_DIR, `dive-three.png`);
    fs.writeFileSync(diveThreePath, diveThreeBuf);

    console.log(`  -> Wrote dive-side.png (${diveSideBuf.length} B), dive-three.png (${diveThreeBuf.length} B)`);

    allMovesData.push({
      id: 'dive',
      name: 'Shootdodge Dive',
      cat: 'Combat & Traversal',
      sideBase64: diveFrames.sideStrip,
      threeBase64: diveFrames.threeStrip
    });

    // 3. Process Drowned Drag (Knockdown and Recover)
    console.log(`[20/20] Processing move: drowned-drag (live match capture)...`);
    // Read the 6 side shots and 6 three shots
    const sideDrownedFiles = [
      path.join(QA_DIR, 'drowned-side-01-wind.png'),
      path.join(QA_DIR, 'drowned-side-02-drag.png'),
      path.join(QA_DIR, 'drowned-side-03-drag.png'),
      path.join(QA_DIR, 'drowned-side-04-drag.png'),
      path.join(QA_DIR, 'drowned-side-05-recover.png'),
      path.join(QA_DIR, 'drowned-side-06-idle.png')
    ];

    const threeDrownedFiles = [
      path.join(DROWNED_LIVE_DIR, 'drowned-01-wind.png'),
      path.join(DROWNED_LIVE_DIR, 'drowned-02-drag.png'),
      path.join(DROWNED_LIVE_DIR, 'drowned-03-drag.png'),
      path.join(DROWNED_LIVE_DIR, 'drowned-04-drag.png'),
      path.join(DROWNED_LIVE_DIR, 'drowned-05-recover.png'),
      path.join(DROWNED_LIVE_DIR, 'drowned-06-idle.png')
    ];

    const sideDrownedData = sideDrownedFiles.map(f => fs.readFileSync(f).toString('base64'));
    const threeDrownedData = threeDrownedFiles.map(f => fs.readFileSync(f).toString('base64'));

    const drownedStrips = await engine.page.evaluate(`(async (sideFrames, threeFrames) => {
      const sideStrip = await window.__assembleStrip(sideFrames, 'drowned-drag', 'side');
      const threeStrip = await window.__assembleStrip(threeFrames, 'drowned-drag', 'three-quarter');
      return { sideStrip, threeStrip };
    })(${JSON.stringify(sideDrownedData)}, ${JSON.stringify(threeDrownedData)})`);

    const drownedSideBuf = Buffer.from(drownedStrips.sideStrip, 'base64');
    const drownedSidePath = path.join(OUT_DIR, `drowned-drag-side.png`);
    fs.writeFileSync(drownedSidePath, drownedSideBuf);

    const drownedThreeBuf = Buffer.from(drownedStrips.threeStrip, 'base64');
    const drownedThreePath = path.join(OUT_DIR, `drowned-drag-three.png`);
    fs.writeFileSync(drownedThreePath, drownedThreeBuf);

    console.log(`  -> Wrote drowned-drag-side.png (${drownedSideBuf.length} B), drowned-drag-three.png (${drownedThreeBuf.length} B)`);

    allMovesData.push({
      id: 'drowned-drag',
      name: 'Drowned Drag Knockdown & Recovery',
      cat: 'Damage & Reactions',
      sideBase64: drownedStrips.sideStrip,
      threeBase64: drownedStrips.threeStrip
    });

    // 4. Assemble Composite sheet.jpg
    console.log(`Assembling composite sheet.jpg containing all 20 moves...`);
    const sheetData = await engine.page.evaluate(`(async (moves) => {
      return await window.__assembleSheet(moves);
    })(${JSON.stringify(allMovesData)})`);

    const sheetBuf = Buffer.from(sheetData, 'base64');
    const sheetPath = path.join(OUT_DIR, 'sheet.jpg');
    fs.writeFileSync(sheetPath, sheetBuf);
    console.log(`  -> Wrote sheet.jpg (${sheetBuf.length} B)`);

  } finally {
    await engine.close();
  }

  console.log(`AG-159 generation complete! All deliverables saved in ${OUT_DIR}`);
}

main().catch(err => {
  console.error('Runner failed:', err);
  process.exit(1);
});
