// studio/index.js — the studio's front door (D-40, docs/studio.md). The game and the renderer
// (tools/studio.mjs) import from here and nowhere deeper, so the pieces behind it can move.
export { CLIP_FORMAT, EASES, validateClip, loadClip, sampleClip, blendPoses, clipEvents, clipTime, applyPose, solveChain, createPlayer } from './clip.js';
export { SCENE_FORMAT, validateScene, loadScene, createScene } from './scene.js';
export { fetchScene } from './load.js';
export { MARINE, makeMarineRig, adoptMarine } from './marine.js';
export { rigs, registerRig, rigCost } from './rigs.js';
export { ikLimb } from './ik.js';
export { loadReference, makeMannequin, poseReference } from './reference.js';
