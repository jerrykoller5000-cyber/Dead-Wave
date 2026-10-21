// Read-only representative suite diagnosis; no game/test assertions are changed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as Fake from '../../../tools/tests/fakethree.mjs';
import { confirmedHead, zombieSurface } from '../../../game/zombie-headshots.js';
import { hitBruteArmor, BRUTE_ARMOR } from '../../../game/brute-armor.js';
const ROOT = path.resolve(fileURLToPath(new URL('../../..', import.meta.url))), HERE = path.dirname(fileURLToPath(import.meta.url));
const old = fs.readFileSync(path.join(ROOT, 'tools/tests/test-31404.html'), 'utf8'), current = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
const block = (text, name) => { const at = text.indexOf('    function ' + name + '('); if (at < 0) throw Error('missing ' + name); const tail = text.slice(at), next = /\n    function /.exec(tail.slice(5)); return next ? tail.slice(0, next.index + 5) : tail; };
const functions = ['resolveTarget', 'placeRefusal', 'placeBuildAt', 'tbParts', 'buildTreeBatches', 'updateTreeBatches', 'zombieRoundHit', 'damageZombie'];
const source = functions.map((name) => ({ name, oldHash: hash(block(old, name)), currentHash: hash(block(current, name)), unchanged: block(old, name) === block(current, name) }));
const heightOnly = ['brute', 'shambler', 'feral', 'leaper', 'spider'].map((typeKey) => ({ typeKey, confirmed: confirmedHead({ typeKey }, { kind: 'bullet', hitY: 1.6 }) }));
const mesh = new Fake.Group(), torso = new Fake.Group(), head = new Fake.Group(); mesh.add(torso, head); torso.add(new Fake.Mesh(new Fake.BoxGeometry(1, 2, 1))); head.add(new Fake.Mesh(new Fake.BoxGeometry(0.3, 0.3, 0.3))); mesh.userData = { torso, head };
const z = { typeKey: 'shambler', mesh, hitH: 2 };
const ray = new Fake.Raycaster(); ray.set(new Fake.Vector3(0, 1, -4), new Fake.Vector3(0, 0, 1));
const rayIntersections = ray.intersectObjects([torso.children[0]], false);
const surface = zombieSurface(Fake, z, new Fake.Vector3(0, 1, -4), new Fake.Vector3(0, 1, 4));
const plateMesh = new Fake.Group(); plateMesh.userData.bruteArmor = { front: BRUTE_ARMOR.front, back: BRUTE_ARMOR.back, left: BRUTE_ARMOR.left, right: BRUTE_ARMOR.right };
plateMesh.userData.brutePlates = Object.fromEntries(['front', 'back', 'left', 'right'].map((part) => { const g = new Fake.Group(); plateMesh.add(g); return [part, g]; }));
const brute = { typeKey: 'brute', hitH: 2, mesh: plateMesh }, hits = [];
for (const [kind, amount] of [['bullet', 27], ['pellet', 20], ['melee', 40], ['chainsaw', 30]]) {
  const h = hitBruteArmor(brute, amount, kind, { dir: { x: 0, z: 1 }, hitY: 0.9 });
  hits.push({ kind, amount, factor: h.factor, plateHp: { ...plateMesh.userData.bruteArmor }, expectedDamageFromCurrentWeakness: amount * 0.45 * h.factor });
}
const out = { at: new Date().toISOString(), fixture: 'tools/tests/test-31404.html', fixtureSha256: hash(old), source, heightOnly, rayIntersections: rayIntersections.length, zombieSurface: surface, plateSequence: hits };
fs.writeFileSync(path.join(HERE, 'triage.json'), JSON.stringify(out, null, 2) + '\n', 'utf8'); console.log(JSON.stringify(out, null, 2));
