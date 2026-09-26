// studio/index.js — the studio's front door (D-40, docs/studio.md). The game and the renderer
// (tools/studio.mjs) import from here and nowhere deeper, so the pieces behind it can move.
export { CLIP_FORMAT, EASES, validateClip, loadClip, sampleClip, blendPoses, clipEvents, clipTime, applyPose, solveChain, createPlayer } from './clip.js';
export { SCENE_FORMAT, validateScene, loadScene, createScene, sceneClipRefs } from './scene.js';
export { fetchScene } from './load.js';
export { MARINE, makeMarineRig, adoptMarine } from './marine.js';
export { rigs, registerRig, rigCost } from './rigs.js';
export { ikLimb } from './ik.js';
export { loadReference, makeMannequin, poseReference } from './reference.js';
export { MOTION_FORMAT, HIT_KINDS, BODY_PARTS, validateMotion, loadMotion, createBody, createMotionPool } from './motion.js';
export { createHorde, fetchHordeClips, hordePresetFor, HORDE_PRESETS, NEVER_REACT, HORDE_PARTS } from './motion-horde.js';
export { MODEL_FORMAT, MODEL_KINDS, MODEL_SHAPES, LIMBS, validateModel, buildModel, instanceModel, disposeModel, rigFromModel, restClip, modelCost, modelAsset, mirrorName } from './model.js';
// Not here on purpose: the tools the game never runs (motion-battery.js, motion-expect.js, model-look.js,
// the CLIs). The game loads this file at boot; the labs and scripts import those directly.
export { ZOMBIE, makeZombieRig, adoptZombie } from './zombie.js';
