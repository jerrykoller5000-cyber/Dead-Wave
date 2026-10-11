import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Engine} from '../../tools/camera.mjs';
const changes = [
  ['guide.gear.body', 'Every gun starts with a flashlight ({flashlight}). Buy the helmet before night vision ({nightVision}); buy the laser ({laser}) separately. {akimbo} switches to an owned pair.', 'Buy the flashlight ({flashlight}) and laser sight ({laser}) at the gear kiosk. Night vision ({nightVision}) requires the helmet. {akimbo} switches to an owned pair.'],
  ['shop.hint.gear', 'Armor, night vision and laser sights. Every gun starts with a flashlight; night vision needs the helmet.', 'Armor, flashlights, laser sights and night vision. Night vision requires a helmet.'],
  ['tips.misc.gear', '{nightVision} — night vision (buy after the helmet) · {laser} — laser sight (supply terminal) · {flashlight} — flashlight (on every gun from the start)', '{nightVision} — night vision (buy after the helmet) · {laser} — laser sight (gear kiosk) · {flashlight} — flashlight (gear kiosk)']
];
let engine;
const proof = {};
async function snapshot(label) {
  const result = await engine.ev(`R.release();T.trainingDbg.openPanel();await wait(150);const b=document.querySelector('#trainingPanel .tp-layout');return {label:b.textContent,title:b.title,visible:!document.getElementById('trainingPanel').hidden};`);
  const file = 'review/crew-copy-GP180/' + label + '.png';
  await engine.page.screenshot(path.resolve(file)); return {...result, file};
}
try {
  engine = new Engine({training: true, warm: 'none', size: '1440x900'}); await engine.open();
  proof.before = await snapshot('before');
  const source = fs.readFileSync('ui/strings.js', 'utf8'), eol = source.includes('\r\n') ? '\r\n' : '\n';
  let next = source;
  for (const [key, old, value] of changes) {
    const from = JSON.stringify(key) + ': ' + JSON.stringify(old);
    assert.equal(next.split(from).length - 1, 1, key);
    next = next.replace(from, JSON.stringify(key) + ': ' + JSON.stringify(value));
  }
  const anchor = '  "training.clear": "Clear all zombies",';
  assert.equal(next.split(anchor).length - 1, 1);
  next = next.replace(anchor, anchor + eol +
    '  "training.layout": "Place test defenses",' + eol +
    '  "training.layoutAgain": "Rebuild test defenses",' + eol +
    '  "training.layoutHint": "Place a barricade, sandbags, walls, wire and a light turret in front of the zombie gate.",');
  assert.equal(fs.readFileSync('ui/strings.js', 'utf8'), source, 'Copy changed during edit.');
  fs.writeFileSync('ui/strings.js', next, 'utf8');
  await engine.load(); proof.after = await snapshot('after');
  assert.equal(proof.after.label, 'Place test defenses'); assert(proof.after.visible);
  proof.rebuild = await engine.ev(`document.querySelector('#trainingPanel .tp-layout').click();await wait(100);return{label:document.querySelector('#trainingPanel .tp-layout').textContent,pieces:T.trainingDbg.layoutPieces().length};`);
  assert.equal(proof.rebuild.label, 'Rebuild test defenses'); assert(proof.rebuild.pieces > 0);
  await engine.page.screenshot(path.resolve('review/crew-copy-GP180/after-rebuild.png'));
  proof.errors = engine.page.errors; assert.equal(proof.errors.length, 0);
  proof.changes = changes.map(([key, before, after]) => ({key, before, after}));
  proof.summary = 'PASS: live keyed layout label/title and rebuilt label; zero browser errors; six copy-only catalogue edits.';
  fs.writeFileSync('review/crew-copy-GP180/proof.json', JSON.stringify(proof, null, 2) + '\n', 'utf8');
  console.log(proof.summary);
} finally { if (engine) await engine.close(); }
