// GB-249: roundInfoDbg('head') aimed at the centre of the head's *visible* meshes; since skinZombieMesh hides them as
// skin sources (userData.skinSrc) it found none and fell back to hitH * 0.85, which is above the demon's skull core.
// Read the skin sources as headSurface does (the game's own head test), so the hook aims where the head is drawn.
import fs from 'node:fs';
const src = fs.readFileSync('index.html', 'utf8');
const a = "if (root) root.traverse((m) => { const pa = m.isMesh && m.visible !== false && m.geometry?.attributes?.position; if (!pa) return;";
const b = "if (root) root.traverse((m) => { const pa = m.isMesh && !m.isSkinnedMesh && !m.userData.stump && (m.userData.skinSrc || m.visible !== false) && m.geometry?.attributes?.position; if (!pa) return;";
const n = src.split(a).length - 1; if (n !== 1) throw new Error('count ' + n);
const out = src.replace(a, b);
fs.writeFileSync('index.html', out, 'utf8');
console.log('ok', src.length, out.length, 'BOM', src.charCodeAt(0) === 0xfeff, 'CR', (out.match(/\r/g) || []).length - (src.match(/\r/g) || []).length);
