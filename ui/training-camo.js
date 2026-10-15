// GB-168 (Jerry, 2026-10-14): "Unlock all camos in CIF for training grounds." While he is on the Training Ground every
// pattern reads as his at the CIF; nothing is written to the unlock profile, and the real game's unlocks are untouched
// (the gate asks the real set the moment training ends). index.html also keeps training's dressing out of the save
// (writeWardrobe / setCamo skip storage while training) and re-reads the saved wardrobe and camo on leaving.
export function trainingCamoGate(unlocks, isTraining) {
  if (!unlocks || unlocks.isUnlockedReal) return unlocks;
  const real = unlocks.isUnlocked.bind(unlocks);
  unlocks.isUnlockedReal = real;
  unlocks.isUnlocked = (key) => (!!isTraining() && typeof key === 'string' && key.length > 0) || real(key);
  return unlocks;
}
